import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface WorkoutPreferences {
  id: string;
  user_id: string;
  default_rest_seconds: number;
  default_sets: number;
  default_reps: number;
  weight_prefill_mode: string;
  weight_rounding_increment: number;
  created_at: string;
  updated_at: string;
}

const DEFAULTS: Omit<WorkoutPreferences, "id" | "user_id" | "created_at" | "updated_at"> = {
  default_rest_seconds: 45,
  default_sets: 4,
  default_reps: 8,
  weight_prefill_mode: "hybrid",
  weight_rounding_increment: 0.25,
};

export function useWorkoutPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery<WorkoutPreferences | null>({
    queryKey: ["workout-preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_workout_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as WorkoutPreferences | null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const upsertMutation = useMutation({
    mutationFn: async (updates: Partial<Omit<WorkoutPreferences, "id" | "user_id" | "created_at" | "updated_at">>) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("user_workout_preferences")
        .upsert(
          { user_id: user.id, ...updates },
          { onConflict: "user_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["workout-preferences", user?.id] });
      const previous = queryClient.getQueryData<WorkoutPreferences | null>(["workout-preferences", user?.id]);
      queryClient.setQueryData<WorkoutPreferences | null>(
        ["workout-preferences", user?.id],
        (old) => old ? { ...old, ...updates } as WorkoutPreferences : { ...DEFAULTS, ...updates, id: "temp", user_id: user!.id, created_at: "", updated_at: "" } as WorkoutPreferences
      );
      return { previous };
    },
    onError: (_err, _updates, context) => {
      queryClient.setQueryData(["workout-preferences", user?.id], context?.previous);
      toast.error("Failed to save workout preferences");
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["workout-preferences", user?.id], data);
    },
  });

  const updatePreferences = useCallback(
    (updates: Partial<Omit<WorkoutPreferences, "id" | "user_id" | "created_at" | "updated_at">>) =>
      upsertMutation.mutateAsync(updates),
    [upsertMutation]
  );

  // Resolved preferences (DB values or defaults)
  const resolved = {
    default_rest_seconds: preferences?.default_rest_seconds ?? DEFAULTS.default_rest_seconds,
    default_sets: preferences?.default_sets ?? DEFAULTS.default_sets,
    default_reps: preferences?.default_reps ?? DEFAULTS.default_reps,
    weight_prefill_mode: preferences?.weight_prefill_mode ?? DEFAULTS.weight_prefill_mode,
    weight_rounding_increment: preferences?.weight_rounding_increment ?? DEFAULTS.weight_rounding_increment,
  };

  return {
    preferences: resolved,
    raw: preferences,
    isLoading,
    updatePreferences,
  };
}
