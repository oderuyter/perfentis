import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useWorkoutPreferences } from "./useWorkoutPreferences";
import { useProfile } from "./useProfile";
import type { ExerciseSet } from "@/types/workout";

interface LastPerformance {
  sets: { set_number: number; completed_weight: number | null; completed_reps: number | null }[];
}

/**
 * Fetches the most recent completed performance for an exercise.
 */
export function useLastExercisePerformance(exerciseId: string | null) {
  const { user } = useAuth();

  return useQuery<LastPerformance | null>({
    queryKey: ["last-exercise-performance", exerciseId, user?.id],
    queryFn: async () => {
      if (!exerciseId || !user) return null;

      // Find the most recent exercise_log for this exercise in a completed session
      const { data: logs, error: logErr } = await supabase
        .from("exercise_logs")
        .select(`
          id,
          workout_sessions!inner (
            id, status, user_id, started_at
          )
        `)
        .eq("exercise_id", exerciseId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (logErr || !logs || logs.length === 0) return null;

      // Filter for current user's completed sessions
      const userLog = logs.find((log) => {
        const session = log.workout_sessions as unknown as { user_id: string; status: string };
        return session.user_id === user.id && session.status === "completed";
      });

      if (!userLog) return null;

      // Fetch set logs for this exercise log
      const { data: setLogs, error: setErr } = await supabase
        .from("set_logs")
        .select("set_number, completed_weight, completed_reps, is_completed")
        .eq("exercise_log_id", userLog.id)
        .eq("is_completed", true)
        .order("set_number");

      if (setErr || !setLogs) return null;

      return {
        sets: setLogs.map((s) => ({
          set_number: s.set_number,
          completed_weight: s.completed_weight,
          completed_reps: s.completed_reps,
        })),
      };
    },
    enabled: !!exerciseId && !!user,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Rounds a weight to the nearest increment.
 */
export function roundWeight(weight: number, increment: number): number {
  if (increment <= 0) return weight;
  return Math.round(weight / increment) * increment;
}

/**
 * Hook that provides the hybrid prefill logic for strength exercises.
 * Returns a function to compute prefilled sets and a propagation handler.
 */
export function useStrengthPrefill() {
  const { preferences } = useWorkoutPreferences();
  const { profile } = useProfile();
  const units = (profile?.units as "metric" | "imperial") || "metric";
  const roundingIncrement = preferences.weight_rounding_increment;

  /**
   * Compute initial prefill for a set based on history, plan targets, and position.
   * 
   * Priority:
   * 1. Plan/template-defined target weight (if set)
   * 2. Last performance for matching set number
   * 3. Builder-defined starting weight
   * 4. null (blank)
   */
  const computePrefill = useCallback(
    (
      setIndex: number,
      lastPerformance: LastPerformance | null | undefined,
      planTargetWeight: number | null,
      planTargetReps: string | null,
    ): { weight: number | null; reps: number | null } => {
      let weight: number | null = null;
      let reps: number | null = null;

      // Parse plan target reps
      if (planTargetReps) {
        const match = planTargetReps.match(/(\d+)/);
        if (match) reps = parseInt(match[1]);
      }
      if (reps === null) reps = preferences.default_reps;

      // Step 1: Plan/template target weight takes priority
      if (planTargetWeight !== null && planTargetWeight > 0) {
        weight = planTargetWeight;
      }
      // Step 2: History-based
      else if (lastPerformance && lastPerformance.sets.length > 0) {
        const matchingSet = lastPerformance.sets.find((s) => s.set_number === setIndex + 1);
        if (matchingSet && matchingSet.completed_weight !== null) {
          weight = matchingSet.completed_weight;
        } else {
          // If fewer sets last time, carry last available set weight
          const lastSet = lastPerformance.sets[lastPerformance.sets.length - 1];
          if (lastSet && lastSet.completed_weight !== null) {
            weight = lastSet.completed_weight;
          }
        }

        // Also grab reps from history if plan didn't define them
        if (planTargetReps === null || planTargetReps === "") {
          const matchingSetForReps = lastPerformance.sets.find((s) => s.set_number === setIndex + 1);
          if (matchingSetForReps && matchingSetForReps.completed_reps !== null) {
            reps = matchingSetForReps.completed_reps;
          }
        }
      }

      // Round weight if we have one
      if (weight !== null) {
        weight = roundWeight(weight, roundingIncrement);
      }

      return { weight, reps };
    },
    [preferences.default_reps, roundingIncrement]
  );

  /**
   * Propagate a weight change forward to subsequent uncompleted sets.
   * Returns updated sets array.
   */
  const propagateWeight = useCallback(
    (sets: ExerciseSet[], editedSetIndex: number, newWeight: number): ExerciseSet[] => {
      return sets.map((set, i) => {
        if (i <= editedSetIndex) return set;
        // Only propagate to uncompleted sets that haven't been manually edited
        if (set.completed) return set;
        // If the set already has a completed weight that differs from target, user manually set it
        if (set.completedWeight !== null && set.completedWeight !== set.targetWeight) return set;
        return {
          ...set,
          completedWeight: newWeight,
          targetWeight: newWeight,
        };
      });
    },
    []
  );

  return {
    computePrefill,
    propagateWeight,
    roundingIncrement,
    defaults: preferences,
  };
}
