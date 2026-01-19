import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { addDays, isAfter, isBefore, parseISO } from "date-fns";

export interface GymPass {
  id: string;
  gymId: string;
  gymName: string;
  membershipId: string;
  membershipLevel: string;
  status: "active" | "expired" | "suspended" | "pending";
  qrToken: string;
}

export interface EventPass {
  id: string;
  eventId: string;
  eventName: string;
  eventStartDate: string | null;
  eventEndDate: string | null;
  registrationId: string | null;
  teamMemberId: string | null;
  divisionName: string | null;
  teamName: string | null;
  status: "active" | "revoked" | "used";
  passToken: string;
  isCheckedIn: boolean;
}

export function useQRWallet() {
  const { user } = useAuth();
  const [gymPasses, setGymPasses] = useState<GymPass[]>([]);
  const [eventPasses, setEventPasses] = useState<EventPass[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPasses();
    } else {
      setGymPasses([]);
      setEventPasses([]);
      setIsLoading(false);
    }
  }, [user]);

  const fetchPasses = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Fetch gym memberships with QR tokens
      const { data: memberships, error: membershipError } = await supabase
        .from("memberships")
        .select(`
          id,
          status,
          membership_token,
          gym_id,
          membership_level_id,
          gyms (id, name),
          gym_membership_levels (id, name)
        `)
        .eq("user_id", user.id)
        .in("status", ["active", "pending"]);

      if (membershipError) {
        console.error("Error fetching gym memberships:", membershipError);
      } else if (memberships) {
        const gymPassList: GymPass[] = memberships
          .filter((m) => m.membership_token && m.gyms)
          .map((m) => ({
            id: m.id,
            gymId: m.gym_id,
            gymName: (m.gyms as any)?.name || "Unknown Gym",
            membershipId: m.id,
            membershipLevel: (m.gym_membership_levels as any)?.name || "Standard",
            status: m.status as GymPass["status"],
            qrToken: m.membership_token,
          }));
        setGymPasses(gymPassList);
      }

      // Fetch event passes within the visibility window (14 days before to 2 days after)
      const now = new Date();

      const { data: passes, error: passError } = await supabase
        .from("event_registration_passes")
        .select(`
          id,
          event_id,
          registration_id,
          team_member_id,
          pass_token,
          status,
          events (id, title, start_date, end_date),
          event_registrations (
            id,
            division_id,
            team_id,
            checked_in_at,
            event_divisions (name),
            event_teams (name)
          )
        `)
        .eq("status", "active");

      if (passError) {
        console.error("Error fetching event passes:", passError);
      } else if (passes) {
        const eventPassList: EventPass[] = passes
          .filter((p) => {
            if (!p.events) return false;
            const event = p.events as any;
            
            // Check visibility window
            if (event.start_date) {
              const eventStart = parseISO(event.start_date);
              const visibilityStart = addDays(eventStart, -14);
              if (isBefore(now, visibilityStart)) return false;
            }
            
            if (event.end_date) {
              const eventEnd = parseISO(event.end_date);
              const visibilityEnd = addDays(eventEnd, 2);
              if (isAfter(now, visibilityEnd)) return false;
            } else if (event.start_date) {
              // If no end date, use start date + 2 days
              const eventStart = parseISO(event.start_date);
              const visibilityEnd = addDays(eventStart, 2);
              if (isAfter(now, visibilityEnd)) return false;
            }
            
            return true;
          })
          .map((p) => {
            const event = p.events as any;
            const registration = p.event_registrations as any;
            return {
              id: p.id,
              eventId: p.event_id,
              eventName: event?.title || "Unknown Event",
              eventStartDate: event?.start_date || null,
              eventEndDate: event?.end_date || null,
              registrationId: p.registration_id,
              teamMemberId: p.team_member_id,
              divisionName: registration?.event_divisions?.name || null,
              teamName: registration?.event_teams?.name || null,
              status: p.status as EventPass["status"],
              passToken: p.pass_token,
              isCheckedIn: !!registration?.checked_in_at,
            };
          });
        setEventPasses(eventPassList);
      }
    } catch (error) {
      console.error("Error in fetchPasses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPasses = gymPasses.length + eventPasses.length;
  const hasOnlyOnePass = totalPasses === 1;
  const singlePass = hasOnlyOnePass 
    ? (gymPasses[0] || eventPasses[0]) 
    : null;

  return {
    gymPasses,
    eventPasses,
    isLoading,
    totalPasses,
    hasOnlyOnePass,
    singlePass,
    refetch: fetchPasses,
  };
}
