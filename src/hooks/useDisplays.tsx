import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Display {
  id: string;
  owner_type: "gym" | "coach";
  owner_id: string;
  name: string;
  is_active: boolean;
  display_token: string;
  show_join_code: boolean;
  show_join_qr: boolean;
  join_placement: string;
  signage_enabled: boolean;
  signage_show_during_active_session: boolean;
  created_at: string;
  updated_at: string;
}

export interface DisplaySession {
  id: string;
  display_id: string;
  status: "idle" | "active" | "ended";
  title: string | null;
  started_at: string | null;
  ended_at: string | null;
  current_workout_session_id: string | null;
  controlling_user_id: string | null;
  settings_json: {
    privacy_mode: "structure_only" | "completion_only" | "full_stats_opt_in";
    show_user_names: boolean;
    max_participant_tiles: number;
  };
  join_code: string | null;
  created_at: string;
}

export function useDisplays(ownerType: "gym" | "coach", ownerId: string | null) {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDisplays = useCallback(async () => {
    if (!ownerId) {
      setDisplays([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("displays")
        .select("*")
        .eq("owner_type", ownerType)
        .eq("owner_id", ownerId)
        .order("created_at");

      if (error) throw error;
      setDisplays((data || []) as Display[]);
    } catch (err) {
      console.error("Error fetching displays:", err);
    } finally {
      setIsLoading(false);
    }
  }, [ownerType, ownerId]);

  useEffect(() => {
    fetchDisplays();
  }, [fetchDisplays]);

  const addDisplay = async (name: string) => {
    if (!ownerId) return null;
    try {
      const { data, error } = await supabase
        .from("displays")
        .insert({ owner_type: ownerType, owner_id: ownerId, name })
        .select()
        .single();

      if (error) throw error;
      toast.success("Display added");
      fetchDisplays();
      return data as Display;
    } catch (err: any) {
      toast.error(err.message || "Failed to add display");
      return null;
    }
  };

  const updateDisplay = async (id: string, updates: Partial<Pick<Display, "name" | "is_active" | "show_join_code" | "show_join_qr" | "join_placement" | "signage_enabled" | "signage_show_during_active_session">>) => {
    try {
      const { error } = await supabase.from("displays").update(updates).eq("id", id);
      if (error) throw error;
      toast.success("Display updated");
      fetchDisplays();
    } catch (err: any) {
      toast.error(err.message || "Failed to update display");
    }
  };

  const regenerateToken = async (id: string) => {
    try {
      // Generate a new token via raw SQL or just delete + re-insert the default
      // Since display_token has a default, we can use a workaround
      const { error } = await supabase.rpc("generate_display_join_code").then(() =>
        supabase
          .from("displays")
          .update({ display_token: crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '') })
          .eq("id", id)
      );
      if (error) throw error;
      toast.success("Display URL regenerated");
      fetchDisplays();
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate token");
    }
  };

  const deleteDisplay = async (id: string) => {
    try {
      const { error } = await supabase.from("displays").delete().eq("id", id);
      if (error) throw error;
      toast.success("Display removed");
      fetchDisplays();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete display");
    }
  };

  const startSession = async (displayId: string, title: string, settings?: Partial<DisplaySession["settings_json"]>) => {
    try {
      // End any existing active sessions first
      await supabase
        .from("display_sessions")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("display_id", displayId)
        .in("status", ["idle", "active"]);

      const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const joinQrPayload = `${window.location.origin}/display/join?code=${joinCode}`;

      const { data, error } = await supabase
        .from("display_sessions")
        .insert({
          display_id: displayId,
          status: "active",
          title,
          started_at: new Date().toISOString(),
          controlling_user_id: (await supabase.auth.getUser()).data.user?.id,
          join_code: joinCode,
          join_qr_payload: joinQrPayload,
          join_qr_generated_at: new Date().toISOString(),
          settings_json: {
            privacy_mode: "structure_only",
            show_user_names: false,
            max_participant_tiles: 1,
            ...settings,
          },
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Session started");
      return data as unknown as DisplaySession;
    } catch (err: any) {
      toast.error(err.message || "Failed to start session");
      return null;
    }
  };

  const endSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from("display_sessions")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", sessionId);
      if (error) throw error;
      toast.success("Session ended");
    } catch (err: any) {
      toast.error(err.message || "Failed to end session");
    }
  };

  return {
    displays,
    isLoading,
    addDisplay,
    updateDisplay,
    regenerateToken,
    deleteDisplay,
    startSession,
    endSession,
    refetch: fetchDisplays,
  };
}
