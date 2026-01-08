import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Event {
  id: string;
  title: string;
  status: string;
  event_date: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
}

export function useOwnedEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasEventAccess, setHasEventAccess] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!user) {
      setEvents([]);
      setHasEventAccess(false);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, status, event_date, start_date, end_date, location")
        .eq("organiser_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setEvents(data || []);
      setHasEventAccess((data || []).length > 0);
    } catch (error) {
      console.error("Error fetching owned events:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    isLoading,
    hasEventAccess,
    refetch: fetchEvents,
  };
}
