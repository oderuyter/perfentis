import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface TeamInvitation {
  id: string;
  email: string;
  name: string | null;
  event_id: string;
  team_id: string | null;
  invite_type: string;
  status: string | null;
  token: string;
  expires_at: string | null;
  created_at: string;
  event: {
    id: string;
    title: string;
  };
  team: {
    id: string;
    name: string;
  } | null;
}

export function useEventTeamInvitationByToken(token: string | null) {
  const [invitation, setInvitation] = useState<TeamInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchInvitation = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      setError("No invitation token provided");
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("event_invites")
        .select(`
          id,
          email,
          name,
          event_id,
          team_id,
          invite_type,
          status,
          token,
          expires_at,
          created_at,
          event:events(id, title),
          team:event_teams(id, name)
        `)
        .eq("token", token)
        .eq("status", "pending")
        .single();

      if (fetchError) throw fetchError;
      
      if (!data) {
        setError("Invitation not found or has expired");
        return;
      }

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError("This invitation has expired");
        return;
      }

      setInvitation(data as TeamInvitation);
    } catch (err: any) {
      console.error("Error fetching invitation:", err);
      setError(err.message || "Failed to load invitation");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInvitation();
  }, [fetchInvitation]);

  const acceptInvitation = useCallback(async () => {
    if (!invitation || !user) {
      toast.error("Unable to accept invitation");
      return null;
    }

    try {
      // Update invitation status
      const { error: updateError } = await supabase
        .from("event_invites")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          accepted_by: user.id,
        })
        .eq("id", invitation.id);

      if (updateError) throw updateError;

      // If this is a team invite, add the user to the team
      if (invitation.invite_type === "team_member" && invitation.team_id) {
        const { error: memberError } = await supabase
          .from("event_team_members")
          .update({
            user_id: user.id,
            status: "accepted",
            accepted_at: new Date().toISOString(),
          })
          .eq("team_id", invitation.team_id)
          .eq("email", invitation.email);

        if (memberError) throw memberError;

        // Also create a registration for this user
        const { error: regError } = await supabase
          .from("event_registrations")
          .insert({
            event_id: invitation.event_id,
            user_id: user.id,
            team_id: invitation.team_id,
            registration_type: "team",
            status: "confirmed",
          });

        if (regError && !regError.message?.includes("duplicate")) {
          throw regError;
        }
      }

      toast.success("Successfully joined the team!");
      return { eventId: invitation.event_id, teamId: invitation.team_id };
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      toast.error(err.message || "Failed to accept invitation");
      throw err;
    }
  }, [invitation, user]);

  return {
    invitation,
    isLoading,
    error,
    acceptInvitation,
  };
}
