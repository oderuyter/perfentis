import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useWorkoutPreferences } from "./useWorkoutPreferences";
import { useProfile } from "./useProfile";
import { roundWeight } from "./useStrengthPrefill";
import type { ActiveWorkoutState, ActiveExercise, ExerciseSet } from "@/types/workout";

/**
 * Applies hybrid strength prefill to all exercises in the active workout state.
 * Runs once on mount, fetching last performance for each strength exercise.
 */
export function useWorkoutPrefill(
  state: ActiveWorkoutState | null,
  updateSet: (exerciseIndex: number, setIndex: number, updates: Partial<ExerciseSet>) => void
) {
  const { user } = useAuth();
  const { preferences } = useWorkoutPreferences();
  const { profile } = useProfile();
  const appliedRef = useRef(false);
  const stateIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state || !user || appliedRef.current) return;
    // Only apply once per workout session
    if (stateIdRef.current === state.workoutId) return;
    stateIdRef.current = state.workoutId;
    appliedRef.current = true;

    const applyPrefill = async () => {
      const strengthExercises = state.exercises
        .map((ex, idx) => ({ ex, idx }))
        .filter(({ ex }) => {
          const type = ex.exerciseType;
          return !type || type === "strength" || type === "weight_reps";
        });

      if (strengthExercises.length === 0) return;

      // Batch fetch last performance for all strength exercises
      const exerciseIds = [...new Set(strengthExercises.map(({ ex }) => ex.exerciseId))];

      for (const exerciseId of exerciseIds) {
        try {
          const { data: logs } = await supabase
            .from("exercise_logs")
            .select(`
              id,
              workout_sessions!inner (id, status, user_id)
            `)
            .eq("exercise_id", exerciseId)
            .order("created_at", { ascending: false })
            .limit(10);

          if (!logs || logs.length === 0) continue;

          const userLog = logs.find((log) => {
            const session = log.workout_sessions as unknown as { user_id: string; status: string };
            return session.user_id === user.id && session.status === "completed";
          });

          if (!userLog) continue;

          const { data: setLogs } = await supabase
            .from("set_logs")
            .select("set_number, completed_weight, completed_reps")
            .eq("exercise_log_id", userLog.id)
            .eq("is_completed", true)
            .order("set_number");

          if (!setLogs || setLogs.length === 0) continue;

          // Apply prefill to matching exercises in the state
          const matchingExercises = strengthExercises.filter(({ ex }) => ex.exerciseId === exerciseId);

          for (const { ex, idx } of matchingExercises) {
            for (let setIdx = 0; setIdx < ex.sets.length; setIdx++) {
              const set = ex.sets[setIdx];
              // Skip if already completed or already has a non-null weight from plan
              if (set.completed) continue;
              if (set.completedWeight !== null && set.completedWeight > 0) continue;
              if (set.targetWeight !== null && set.targetWeight > 0) {
                // Plan target exists — use it, but also set completedWeight for display
                updateSet(idx, setIdx, { completedWeight: set.targetWeight });
                continue;
              }

              // Find matching set from history
              const historySet = setLogs.find((s) => s.set_number === setIdx + 1);
              const fallbackSet = setLogs[setLogs.length - 1];
              const sourceSet = historySet || fallbackSet;

              if (sourceSet && sourceSet.completed_weight !== null) {
                const rounded = roundWeight(
                  sourceSet.completed_weight,
                  preferences.weight_rounding_increment
                );
                updateSet(idx, setIdx, { completedWeight: rounded });
              }
            }
          }
        } catch (err) {
          // Silently fail — prefill is best-effort
          console.warn("Prefill fetch failed for", exerciseId, err);
        }
      }
    };

    applyPrefill();
  }, [state?.workoutId, user?.id]);
}
