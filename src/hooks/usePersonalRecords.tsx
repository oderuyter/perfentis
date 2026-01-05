import { useCallback, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { ActiveWorkoutState } from "@/types/workout";
import { calculateOneRM } from "@/types/workout";

export interface PersonalRecord {
  id: string;
  user_id: string;
  exercise_id: string;
  exercise_name: string;
  record_type: string;
  value: number;
  weight: number | null;
  reps: number | null;
  achieved_at: string;
  session_id: string | null;
  created_at: string;
}

export function usePersonalRecords() {
  const { user } = useAuth();

  const getRecentPRs = useCallback(async (limit = 5) => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from("personal_records")
        .select("*")
        .eq("user_id", user.id)
        .order("achieved_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching PRs:", error);
      return [];
    }
  }, [user]);
  const [recentPRs, setRecentPRs] = useState<PersonalRecord[]>([]);

  const fetchRecentPRs = useCallback(async (limit = 5) => {
    if (!user) {
      setRecentPRs([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("personal_records")
        .select("*")
        .eq("user_id", user.id)
        .order("achieved_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      setRecentPRs((data as PersonalRecord[]) || []);
    } catch (error) {
      console.error("Error fetching PRs:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchRecentPRs();
  }, [fetchRecentPRs]);

  const checkAndSavePRs = useCallback(async (
    workoutState: ActiveWorkoutState,
    sessionId: string
  ): Promise<PersonalRecord[]> => {
    if (!user || workoutState.status === "abandoned") return [];

    const newPRs: PersonalRecord[] = [];

    try {
      for (const exercise of workoutState.exercises) {
        if (exercise.skipped) continue;

        // Get current PRs for this exercise
        const { data: existingPRs } = await supabase
          .from("personal_records")
          .select("*")
          .eq("user_id", user.id)
          .eq("exercise_id", exercise.exerciseId);

        const currentE1RM = existingPRs?.find(pr => pr.record_type === "e1rm")?.value || 0;
        const currentMaxWeight = existingPRs?.find(pr => pr.record_type === "max_weight")?.value || 0;

        // Check each completed set
        for (const set of exercise.sets) {
          if (!set.completed || !set.completedWeight || !set.completedReps) continue;

          const e1rm = calculateOneRM(set.completedWeight, set.completedReps);

          // Check for new e1RM PR
          if (e1rm > currentE1RM) {
            const { data: newPR, error } = await supabase
              .from("personal_records")
              .upsert({
                user_id: user.id,
                exercise_id: exercise.exerciseId,
                exercise_name: exercise.name,
                record_type: "e1rm",
                value: e1rm,
                weight: set.completedWeight,
                reps: set.completedReps,
                achieved_at: new Date().toISOString(),
                session_id: sessionId,
              }, {
                onConflict: "user_id,exercise_id,record_type",
                ignoreDuplicates: false,
              })
              .select()
              .single();

            if (!error && newPR) {
              newPRs.push(newPR as PersonalRecord);
            }
          }

          // Check for new max weight PR
          if (set.completedWeight > currentMaxWeight) {
            const { data: newPR, error } = await supabase
              .from("personal_records")
              .upsert({
                user_id: user.id,
                exercise_id: exercise.exerciseId,
                exercise_name: exercise.name,
                record_type: "max_weight",
                value: set.completedWeight,
                weight: set.completedWeight,
                reps: set.completedReps,
                achieved_at: new Date().toISOString(),
                session_id: sessionId,
              }, {
                onConflict: "user_id,exercise_id,record_type",
                ignoreDuplicates: false,
              })
              .select()
              .single();

            if (!error && newPR) {
              newPRs.push(newPR as PersonalRecord);
            }
          }
        }
      }

      if (newPRs.length > 0) {
        fetchRecentPRs();
      }

      return newPRs;
    } catch (error) {
      console.error("Error checking PRs:", error);
      return [];
    }
  }, [user, fetchRecentPRs]);

  const getExercisePR = useCallback(async (exerciseId: string): Promise<PersonalRecord | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("personal_records")
        .select("*")
        .eq("user_id", user.id)
        .eq("exercise_id", exerciseId)
        .eq("record_type", "e1rm")
        .maybeSingle();

      if (error) throw error;
      return data as PersonalRecord | null;
    } catch (error) {
      console.error("Error fetching exercise PR:", error);
      return null;
    }
  }, [user]);

  return { recentPRs, checkAndSavePRs, getExercisePR, getRecentPRs, refetch: fetchRecentPRs };
}
