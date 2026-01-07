import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface MembershipLevel {
  id: string;
  gym_id: string;
  name: string;
  description: string | null;
  price: number | null;
  billing_cycle: string | null;
  access_notes: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface GymInvitation {
  id: string;
  gym_id: string;
  membership_level_id: string | null;
  email: string;
  name: string | null;
  invited_by: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  membership_level?: { id: string; name: string } | null;
}

export function useMembershipLevels(gymId: string | null) {
  const [levels, setLevels] = useState<MembershipLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLevels = useCallback(async () => {
    if (!gymId) {
      setLevels([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("gym_membership_levels")
        .select("*")
        .eq("gym_id", gymId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setLevels((data || []) as MembershipLevel[]);
    } catch (error) {
      console.error("Error fetching membership levels:", error);
    } finally {
      setIsLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  const createLevel = async (data: {
    name: string;
    description?: string;
    price?: number;
    billing_cycle?: string;
    access_notes?: string;
  }) => {
    if (!gymId) return;

    const { data: level, error } = await supabase
      .from("gym_membership_levels")
      .insert({
        gym_id: gymId,
        name: data.name,
        description: data.description || null,
        price: data.price || null,
        billing_cycle: data.billing_cycle || 'monthly',
        access_notes: data.access_notes || null,
        display_order: levels.length
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating membership level:", error);
      toast.error("Failed to create membership level");
      throw error;
    }

    toast.success("Membership level created");
    fetchLevels();
    return level as MembershipLevel;
  };

  const updateLevel = async (id: string, data: Partial<MembershipLevel>) => {
    const { error } = await supabase
      .from("gym_membership_levels")
      .update(data)
      .eq("id", id);

    if (error) {
      console.error("Error updating membership level:", error);
      toast.error("Failed to update membership level");
      throw error;
    }

    toast.success("Membership level updated");
    fetchLevels();
  };

  const deleteLevel = async (id: string) => {
    const { error } = await supabase
      .from("gym_membership_levels")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting membership level:", error);
      toast.error("Failed to delete membership level");
      throw error;
    }

    toast.success("Membership level deleted");
    fetchLevels();
  };

  const activeLevels = levels.filter(l => l.is_active);

  return {
    levels,
    activeLevels,
    isLoading,
    refetch: fetchLevels,
    createLevel,
    updateLevel,
    deleteLevel
  };
}

export function useGymInvitations(gymId: string | null) {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<GymInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvitations = useCallback(async () => {
    if (!gymId) {
      setInvitations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("gym_invitations")
        .select(`
          *,
          membership_level:gym_membership_levels(id, name)
        `)
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvitations((data || []) as GymInvitation[]);
    } catch (error) {
      console.error("Error fetching invitations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const sendInvitation = async (data: {
    email: string;
    name?: string;
    membershipLevelId?: string;
  }) => {
    if (!gymId) return;

    const { data: result, error } = await supabase.functions.invoke("send-gym-invitation", {
      body: {
        gymId,
        email: data.email,
        name: data.name,
        membershipLevelId: data.membershipLevelId
      }
    });

    if (error) {
      console.error("Error sending invitation:", error);
      toast.error(error.message || "Failed to send invitation");
      throw error;
    }

    if (result?.error) {
      toast.error(result.error);
      throw new Error(result.error);
    }

    toast.success(result?.message || "Invitation sent");
    fetchInvitations();
    return result;
  };

  const revokeInvitation = async (invitationId: string) => {
    const { error } = await supabase
      .from("gym_invitations")
      .update({ status: "revoked" })
      .eq("id", invitationId);

    if (error) {
      console.error("Error revoking invitation:", error);
      toast.error("Failed to revoke invitation");
      throw error;
    }

    toast.success("Invitation revoked");
    fetchInvitations();
  };

  const pendingInvitations = invitations.filter(i => i.status === 'pending');

  return {
    invitations,
    pendingInvitations,
    isLoading,
    refetch: fetchInvitations,
    sendInvitation,
    revokeInvitation
  };
}

export function useInvitationByToken(token: string | null) {
  const [invitation, setInvitation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from("gym_invitations")
          .select(`
            *,
            gym:gyms(id, name, description, logo_url),
            membership_level:gym_membership_levels(id, name, description, price, billing_cycle)
          `)
          .eq("token", token)
          .single();

        if (fetchError) throw fetchError;

        if (!data) {
          setError("Invitation not found");
        } else if (data.status !== 'pending') {
          setError(`This invitation has already been ${data.status}`);
        } else if (new Date(data.expires_at) < new Date()) {
          setError("This invitation has expired");
        } else {
          setInvitation(data);
        }
      } catch (err: any) {
        console.error("Error fetching invitation:", err);
        setError("Invitation not found or invalid");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const acceptInvitation = async () => {
    if (!token) throw new Error("No token");

    const { data, error } = await supabase.functions.invoke("accept-gym-invitation", {
      body: { token }
    });

    if (error) {
      toast.error(error.message || "Failed to accept invitation");
      throw error;
    }

    if (data?.error) {
      toast.error(data.error);
      throw new Error(data.error);
    }

    toast.success(data?.message || "Invitation accepted!");
    return data;
  };

  return {
    invitation,
    isLoading,
    error,
    acceptInvitation
  };
}
