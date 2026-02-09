import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { ActiveWorkoutState } from "@/types/workout";
import { toast } from "sonner";

export interface WorkoutSession {
  id: string;
  user_id: string;
  workout_template_id: string | null;
  workout_name: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  total_volume: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  // Run-specific fields
  modality: string;
  moving_seconds: number | null;
  distance_meters: number | null;
  avg_pace_sec_per_km: number | null;
  elevation_gain_m: number | null;
  elevation_loss_m: number | null;
  privacy_level: string;
}

export function useWorkoutHistory() {
  const { user } = useAuth();

  const saveWorkoutSession = useCallback(async (workoutState: ActiveWorkoutState): Promise<string | null> => {
    if (!user) return null;

    try {
      // Calculate total volume
      let totalVolume = 0;
      workoutState.exercises.forEach(ex => {
        ex.sets.forEach(set => {
          if (set.completed && set.completedWeight && set.completedReps) {
            totalVolume += set.completedWeight * set.completedReps;
          }
        });
      });

      // Create workout session
      const { data: session, error: sessionError } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: user.id,
          workout_template_id: workoutState.workoutId,
          workout_name: workoutState.workoutName,
          started_at: workoutState.startedAt,
          ended_at: workoutState.completedAt,
          duration_seconds: workoutState.elapsedTime,
          total_volume: totalVolume,
          avg_hr: workoutState.hrData.avgHR || null,
          max_hr: workoutState.hrData.maxHR || null,
          status: workoutState.status,
          notes: workoutState.workoutNote,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create exercise logs
      for (const exercise of workoutState.exercises) {
        if (exercise.skipped) continue;

        const { data: exerciseLog, error: exerciseError } = await supabase
          .from("exercise_logs")
          .insert({
            session_id: session.id,
            exercise_id: exercise.exerciseId,
            exercise_name: exercise.name,
            exercise_order: exercise.originalIndex,
            notes: null,
          })
          .select()
          .single();

        if (exerciseError) throw exerciseError;

        // Create set logs
        const setLogs = exercise.sets.map(set => ({
          exercise_log_id: exerciseLog.id,
          set_number: set.setNumber,
          target_weight: set.targetWeight,
          target_reps: parseInt(set.targetReps.match(/\d+/)?.[0] || "0"),
          completed_weight: set.completedWeight,
          completed_reps: set.completedReps,
          rest_duration: exercise.restDuration,
          rpe: set.rpe,
          tempo: set.tempo,
          is_completed: set.completed,
        }));

        const { error: setsError } = await supabase
          .from("set_logs")
          .insert(setLogs);

        if (setsError) throw setsError;
      }

      return session.id;
    } catch (error) {
      console.error("Error saving workout:", error);
      toast.error("Failed to save workout to cloud");
      return null;
    }
  }, [user]);

  const getRecentWorkouts = useCallback(async (limit = 10): Promise<WorkoutSession[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("started_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data as WorkoutSession[]) || [];
    } catch (error) {
      console.error("Error fetching workouts:", error);
      return [];
    }
  }, [user]);

  const getExerciseHistory = useCallback(async (exerciseId: string, limit = 10) => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from("exercise_logs")
        .select(`
          *,
          set_logs (*),
          workout_sessions!inner (
            started_at,
            status
          )
        `)
        .eq("exercise_id", exerciseId)
        .eq("workout_sessions.user_id", user.id)
        .eq("workout_sessions.status", "completed")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching exercise history:", error);
      return [];
    }
  }, [user]);

  return { saveWorkoutSession, getRecentWorkouts, getExerciseHistory };
}
