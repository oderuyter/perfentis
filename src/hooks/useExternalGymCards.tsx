import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { logAuditEvent } from "./useAuditLog";

export interface ExternalGymCard {
  id: string;
  user_id: string;
  gym_name: string;
  membership_number: string;
  gym_directory_id: string | null;
  source: "manual" | "scanned";
  created_at: string;
  updated_at: string;
  // Joined data
  submission_status?: "pending" | "approved" | "rejected" | null;
  is_enrolled?: boolean;
}

export interface ExternalGymSubmission {
  id: string;
  submitted_by_user_id: string;
  gym_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  website: string | null;
  status: "pending" | "approved" | "rejected";
  admin_reason: string | null;
  gym_directory_id: string | null;
  created_at: string;
  updated_at: string;
  submitter_count?: number;
}

const MAX_EXTERNAL_CARDS = 3;

export function useExternalGymCards() {
  const { user } = useAuth();
  const [cards, setCards] = useState<ExternalGymCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCards = useCallback(async () => {
    if (!user) {
      setCards([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data: cardsData, error } = await supabase
        .from("external_gym_membership_cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching external cards:", error);
        setCards([]);
        return;
      }

      // Fetch related submissions for status
      const { data: submissions } = await supabase
        .from("external_gym_submissions")
        .select("gym_name, status, gym_directory_id")
        .eq("submitted_by_user_id", user.id);

      // Fetch linked gyms for is_enrolled check
      const gymIds = (cardsData || [])
        .map((c: any) => c.gym_directory_id)
        .filter(Boolean);

      let gymEnrolled: Record<string, boolean> = {};
      if (gymIds.length > 0) {
        const { data: gyms } = await supabase
          .from("gyms")
          .select("id, is_enrolled")
          .in("id", gymIds);
        (gyms || []).forEach((g: any) => {
          gymEnrolled[g.id] = g.is_enrolled;
        });
      }

      const enrichedCards: ExternalGymCard[] = (cardsData || []).map((card: any) => {
        const matchingSub = (submissions || []).find(
          (s: any) => s.gym_name.toLowerCase() === card.gym_name.toLowerCase()
        );
        return {
          ...card,
          source: card.source as "manual" | "scanned",
          submission_status: matchingSub?.status as ExternalGymCard["submission_status"] || null,
          is_enrolled: card.gym_directory_id ? gymEnrolled[card.gym_directory_id] ?? false : false,
        };
      });

      setCards(enrichedCards);
    } catch (err) {
      console.error("Error in fetchCards:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const canAddCard = cards.length < MAX_EXTERNAL_CARDS;
  const remainingSlots = MAX_EXTERNAL_CARDS - cards.length;

  const addCard = async (data: {
    gym_name: string;
    membership_number: string;
    source: "manual" | "scanned";
    contact_email?: string;
    contact_phone?: string;
    address?: string;
    website?: string;
  }) => {
    if (!user) throw new Error("Not authenticated");
    if (!canAddCard) throw new Error("Maximum external cards reached");

    // Create card
    const { data: newCard, error: cardError } = await supabase
      .from("external_gym_membership_cards")
      .insert({
        user_id: user.id,
        gym_name: data.gym_name.trim(),
        membership_number: data.membership_number.trim(),
        source: data.source,
      })
      .select()
      .single();

    if (cardError) throw cardError;

    // Check for existing submission with same gym name
    const { data: existingSub } = await supabase
      .from("external_gym_submissions")
      .select("id")
      .eq("submitted_by_user_id", user.id)
      .ilike("gym_name", data.gym_name.trim())
      .maybeSingle();

    if (!existingSub) {
      // Create gym submission for admin review
      const { error: subError } = await supabase
        .from("external_gym_submissions")
        .insert({
          submitted_by_user_id: user.id,
          gym_name: data.gym_name.trim(),
          contact_email: data.contact_email?.trim() || null,
          contact_phone: data.contact_phone?.trim() || null,
          address: data.address?.trim() || null,
          website: data.website?.trim() || null,
        });

      if (subError) console.error("Error creating submission:", subError);
    }

    await logAuditEvent({
      action: "external_card_created",
      message: `External gym card created for "${data.gym_name}"`,
      category: "system",
      severity: "info",
      entityType: "external_gym_membership_card",
      entityId: newCard.id,
      metadata: { source: data.source },
    });

    await fetchCards();
    return newCard;
  };

  const deleteCard = async (cardId: string) => {
    if (!user) throw new Error("Not authenticated");

    const card = cards.find((c) => c.id === cardId);
    const { error } = await supabase
      .from("external_gym_membership_cards")
      .delete()
      .eq("id", cardId);

    if (error) throw error;

    await logAuditEvent({
      action: "external_card_deleted",
      message: `External gym card deleted for "${card?.gym_name || "unknown"}"`,
      category: "system",
      severity: "info",
      entityType: "external_gym_membership_card",
      entityId: cardId,
    });

    await fetchCards();
  };

  return {
    cards,
    isLoading,
    canAddCard,
    remainingSlots,
    maxCards: MAX_EXTERNAL_CARDS,
    addCard,
    deleteCard,
    refetch: fetchCards,
  };
}
