import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ExerciseHistoryEntry {
  id: string;
  session_id: string;
  workout_name: string;
  workout_date: string;
  sets: {
    set_number: number;
    completed_weight: number | null;
    completed_reps: number | null;
    rpe: number | null;
    is_completed: boolean;
  }[];
  total_volume: number;
  best_set: {
    weight: number;
    reps: number;
  } | null;
}

export function useExerciseHistory(exerciseId: string | null) {
  const { user } = useAuth();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['exercise-history', exerciseId, user?.id],
    queryFn: async () => {
      if (!exerciseId) return [];

      // Get all exercise logs for this exercise
      const { data: exerciseLogs, error: logsError } = await supabase
        .from('exercise_logs')
        .select(`
          id,
          session_id,
          exercise_name,
          workout_sessions!inner (
            id,
            workout_name,
            started_at,
            status,
            user_id
          )
        `)
        .eq('exercise_id', exerciseId)
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;
      if (!exerciseLogs || exerciseLogs.length === 0) return [];

      // Filter for completed sessions and current user
      const userLogs = exerciseLogs.filter(log => {
        const session = log.workout_sessions as unknown as {
          user_id: string;
          status: string;
        };
        return session.user_id === user?.id && session.status === 'completed';
      });

      // Get set logs for each exercise log
      const logIds = userLogs.map(log => log.id);
      const { data: setLogs, error: setsError } = await supabase
        .from('set_logs')
        .select('*')
        .in('exercise_log_id', logIds)
        .eq('is_completed', true)
        .order('set_number');

      if (setsError) throw setsError;

      // Group sets by exercise log
      const setsByLog = new Map<string, typeof setLogs>();
      for (const set of (setLogs || [])) {
        const existing = setsByLog.get(set.exercise_log_id) || [];
        existing.push(set);
        setsByLog.set(set.exercise_log_id, existing);
      }

      // Build history entries
      const entries: ExerciseHistoryEntry[] = userLogs.map(log => {
        const session = log.workout_sessions as unknown as {
          id: string;
          workout_name: string;
          started_at: string;
        };
        const sets = setsByLog.get(log.id) || [];
        
        // Calculate total volume (weight * reps for each set)
        let totalVolume = 0;
        let bestSet: { weight: number; reps: number } | null = null;
        let bestWeight = 0;

        for (const set of sets) {
          const weight = set.completed_weight || 0;
          const reps = set.completed_reps || 0;
          totalVolume += weight * reps;
          
          if (weight > bestWeight) {
            bestWeight = weight;
            bestSet = { weight, reps };
          }
        }

        return {
          id: log.id,
          session_id: session.id,
          workout_name: session.workout_name,
          workout_date: session.started_at,
          sets: sets.map(s => ({
            set_number: s.set_number,
            completed_weight: s.completed_weight,
            completed_reps: s.completed_reps,
            rpe: s.rpe,
            is_completed: s.is_completed || false,
          })),
          total_volume: totalVolume,
          best_set: bestSet,
        };
      });

      return entries.filter(e => e.sets.length > 0);
    },
    enabled: !!exerciseId && !!user,
    staleTime: 1000 * 60 * 5,
  });

  // Calculate stats
  const stats = {
    totalSessions: history.length,
    totalSets: history.reduce((sum, h) => sum + h.sets.length, 0),
    totalVolume: history.reduce((sum, h) => sum + h.total_volume, 0),
    bestWeight: Math.max(...history.map(h => h.best_set?.weight || 0), 0),
    lastPerformed: history[0]?.workout_date || null,
  };

  return {
    history,
    stats,
    isLoading,
  };
}
