import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ExerciseGoal {
  id: string;
  exercise_id: string;
  exercise_name: string;
  target_weight: number;
  target_reps: number;
  current_best: number;
}

export function useExerciseGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<ExerciseGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: goalsData } = await supabase
      .from("exercise_goals")
      .select("id, exercise_id, target_weight, target_reps")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (!goalsData || goalsData.length === 0) {
      setGoals([]);
      setLoading(false);
      return;
    }

    // Get exercise names
    const exerciseIds = goalsData.map((g: any) => g.exercise_id);
    const { data: exercisesData } = await supabase
      .from("exercises")
      .select("id, name")
      .in("id", exerciseIds);

    const exerciseMap = new Map((exercisesData || []).map((e: any) => [e.id, e.name]));

    // Fetch current best for each exercise
    const enriched: ExerciseGoal[] = await Promise.all(
      goalsData.map(async (g: any) => {
        const { data: prData } = await supabase
          .from("set_logs" as any)
          .select("completed_weight")
          .eq("exercise_id", g.exercise_id)
          .not("completed_weight", "is", null)
          .order("completed_weight", { ascending: false })
          .limit(1);

        const currentBest = (prData as any)?.[0]?.completed_weight || 0;

        return {
          id: g.id,
          exercise_id: g.exercise_id,
          exercise_name: exerciseMap.get(g.exercise_id) || "Unknown",
          target_weight: Number(g.target_weight),
          target_reps: g.target_reps,
          current_best: Number(currentBest),
        };
      })
    );

    setGoals(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const addGoal = async (exerciseId: string, targetWeight: number, targetReps: number = 1) => {
    if (!user) return;
    await supabase.from("exercise_goals").insert({
      user_id: user.id,
      exercise_id: exerciseId,
      target_weight: targetWeight,
      target_reps: targetReps,
    });
    fetchGoals();
  };

  const removeGoal = async (goalId: string) => {
    await supabase.from("exercise_goals").delete().eq("id", goalId);
    fetchGoals();
  };

  return { goals, loading, addGoal, removeGoal, refetch: fetchGoals };
}
