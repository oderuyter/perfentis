import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Registration {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  divisionId: string | null;
  divisionName: string | null;
  teamId: string | null;
  teamName: string | null;
  status: string;
  isCheckedIn: boolean;
  checkedInAt: string | null;
  activeForEvent: boolean;
  passToken: string | null;
}

export interface CheckinResult {
  success: boolean;
  message: string;
  registration?: Registration;
}

export function useEventCheckin(eventId: string | null) {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  const fetchRegistrations = useCallback(async () => {
    if (!eventId) {
      setRegistrations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch registrations with user profiles and passes
      const { data, error } = await supabase
        .from("event_registrations")
        .select(`
          id,
          user_id,
          division_id,
          team_id,
          status,
          checked_in_at,
          active_for_event,
          event_divisions (name),
          event_teams (name),
          profiles!event_registrations_user_id_fkey (display_name, email),
          event_registration_passes (pass_token, status)
        `)
        .eq("event_id", eventId)
        .eq("status", "confirmed");

      if (error) throw error;

      const regList: Registration[] = (data || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        userName: r.profiles?.display_name || "Unknown",
        userEmail: r.profiles?.email || "",
        divisionId: r.division_id,
        divisionName: r.event_divisions?.name || null,
        teamId: r.team_id,
        teamName: r.event_teams?.name || null,
        status: r.status,
        isCheckedIn: !!r.checked_in_at,
        checkedInAt: r.checked_in_at,
        activeForEvent: r.active_for_event || false,
        passToken: r.event_registration_passes?.find((p: any) => p.status === "active")?.pass_token || null,
      }));

      setRegistrations(regList);
    } catch (error) {
      console.error("Error fetching registrations:", error);
      toast.error("Failed to load registrations");
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const validateToken = useCallback(async (token: string): Promise<Registration | null> => {
    if (!eventId) return null;

    try {
      const { data, error } = await supabase
        .from("event_registration_passes")
        .select(`
          id,
          registration_id,
          team_member_id,
          status,
          event_registrations (
            id,
            user_id,
            division_id,
            team_id,
            status,
            checked_in_at,
            active_for_event,
            event_divisions (name),
            event_teams (name),
            profiles!event_registrations_user_id_fkey (display_name, email)
          )
        `)
        .eq("event_id", eventId)
        .eq("pass_token", token)
        .eq("status", "active")
        .single();

      if (error || !data) return null;

      const reg = data.event_registrations as any;
      if (!reg) return null;

      return {
        id: reg.id,
        userId: reg.user_id,
        userName: reg.profiles?.display_name || "Unknown",
        userEmail: reg.profiles?.email || "",
        divisionId: reg.division_id,
        divisionName: reg.event_divisions?.name || null,
        teamId: reg.team_id,
        teamName: reg.event_teams?.name || null,
        status: reg.status,
        isCheckedIn: !!reg.checked_in_at,
        checkedInAt: reg.checked_in_at,
        activeForEvent: reg.active_for_event || false,
        passToken: token,
      };
    } catch (error) {
      console.error("Error validating token:", error);
      return null;
    }
  }, [eventId]);

  const checkIn = useCallback(async (
    registrationId: string,
    method: "qr" | "manual",
    source: "portal" | "station",
    deviceId?: string
  ): Promise<CheckinResult> => {
    if (!eventId || !user) {
      return { success: false, message: "Not authenticated" };
    }

    setCheckingIn(true);
    try {
      // Generate unique operation ID
      const operationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create check-in record
      const { error: checkinError } = await supabase
        .from("event_checkins")
        .insert({
          event_id: eventId,
          registration_id: registrationId,
          checked_in_by_user_id: user.id,
          method,
          source,
          device_id: deviceId || null,
          operation_id: operationId,
        });

      if (checkinError) {
        // Check if already checked in (duplicate operation)
        if (checkinError.code === "23505") {
          return { success: false, message: "Already checked in" };
        }
        throw checkinError;
      }

      // Update registration status
      const { error: updateError } = await supabase
        .from("event_registrations")
        .update({
          checked_in_at: new Date().toISOString(),
          active_for_event: true,
        })
        .eq("id", registrationId);

      if (updateError) throw updateError;

      // Log to audit
      await supabase.from("audit_logs").insert({
        action: "event_checkin",
        category: "events",
        message: `Competitor checked in via ${method} (${source})`,
        entity_type: "event_registration",
        entity_id: registrationId,
        actor_id: user.id,
        metadata: { event_id: eventId, method, source, operation_id: operationId },
      });

      // Refresh registrations
      await fetchRegistrations();

      const reg = registrations.find(r => r.id === registrationId);
      return { 
        success: true, 
        message: "Checked in successfully",
        registration: reg ? { ...reg, isCheckedIn: true, activeForEvent: true } : undefined
      };
    } catch (error: any) {
      console.error("Check-in error:", error);
      return { success: false, message: error.message || "Check-in failed" };
    } finally {
      setCheckingIn(false);
    }
  }, [eventId, user, fetchRegistrations, registrations]);

  const undoCheckIn = useCallback(async (registrationId: string): Promise<CheckinResult> => {
    if (!eventId || !user) {
      return { success: false, message: "Not authenticated" };
    }

    try {
      // Mark check-in as undone
      const { error: undoError } = await supabase
        .from("event_checkins")
        .update({
          undone_at: new Date().toISOString(),
          undone_by_user_id: user.id,
        })
        .eq("registration_id", registrationId)
        .is("undone_at", null);

      if (undoError) throw undoError;

      // Update registration status
      const { error: updateError } = await supabase
        .from("event_registrations")
        .update({
          checked_in_at: null,
          active_for_event: false,
        })
        .eq("id", registrationId);

      if (updateError) throw updateError;

      // Log to audit
      await supabase.from("audit_logs").insert({
        action: "event_checkin_undo",
        category: "events",
        message: "Check-in undone",
        entity_type: "event_registration",
        entity_id: registrationId,
        actor_id: user.id,
        metadata: { event_id: eventId },
      });

      await fetchRegistrations();
      return { success: true, message: "Check-in undone" };
    } catch (error: any) {
      console.error("Undo check-in error:", error);
      return { success: false, message: error.message || "Failed to undo check-in" };
    }
  }, [eventId, user, fetchRegistrations]);

  const searchRegistrations = useCallback((query: string): Registration[] => {
    const lowerQuery = query.toLowerCase();
    return registrations.filter(r =>
      r.userName.toLowerCase().includes(lowerQuery) ||
      r.userEmail.toLowerCase().includes(lowerQuery) ||
      r.teamName?.toLowerCase().includes(lowerQuery)
    );
  }, [registrations]);

  return {
    registrations,
    isLoading,
    checkingIn,
    validateToken,
    checkIn,
    undoCheckIn,
    searchRegistrations,
    refetch: fetchRegistrations,
  };
}
