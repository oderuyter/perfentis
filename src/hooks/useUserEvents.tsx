import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  registration_type: string;
  division_id: string | null;
  team_id: string | null;
  created_at: string;
  event: {
    id: string;
    title: string;
    description: string | null;
    event_date: string | null;
    start_date: string | null;
    end_date: string | null;
    location: string | null;
    image_url: string | null;
    hero_image_url: string | null;
    status: string;
  };
  division: {
    id: string;
    name: string;
  } | null;
  team: {
    id: string;
    name: string;
  } | null;
}

export function useUserEvents() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRegistrations = useCallback(async () => {
    if (!user) {
      setRegistrations([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("event_registrations")
        .select(`
          id,
          event_id,
          user_id,
          status,
          registration_type,
          division_id,
          team_id,
          created_at,
          event:events(id, title, description, event_date, start_date, end_date, location, image_url, hero_image_url, status),
          division:event_divisions(id, name),
          team:event_teams(id, name)
        `)
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Filter out any registrations where event is null
      const validRegistrations = (data || []).filter(r => r.event) as EventRegistration[];
      setRegistrations(validRegistrations);
    } catch (error) {
      console.error("Error fetching user events:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const upcomingEvents = registrations.filter(r => {
    const eventDate = r.event?.start_date || r.event?.event_date;
    return eventDate && new Date(eventDate) >= new Date();
  });

  const pastEvents = registrations.filter(r => {
    const eventDate = r.event?.end_date || r.event?.event_date;
    return eventDate && new Date(eventDate) < new Date();
  });

  const nextEvent = upcomingEvents.length > 0 
    ? upcomingEvents.sort((a, b) => {
        const dateA = a.event?.start_date || a.event?.event_date || '';
        const dateB = b.event?.start_date || b.event?.event_date || '';
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      })[0]
    : null;

  return {
    registrations,
    upcomingEvents,
    pastEvents,
    nextEvent,
    isLoading,
    refetch: fetchRegistrations,
  };
}
