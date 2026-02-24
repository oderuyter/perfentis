import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';
import type { ExerciseSet } from '@/types/workout';

// Epley formula: e1RM = weight × (1 + reps / 30)
export function computeEpley(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

// Reverse Epley: weight = e1RM / (1 + R/30)
export function reverseEpley(e1rm: number, reps: number): number {
  if (reps <= 0 || e1rm <= 0) return 0;
  return e1rm / (1 + reps / 30);
}

// Round to nearest increment based on unit system
export function roundWeight(weight: number, units: 'metric' | 'imperial'): number {
  const step = units === 'metric' ? 0.25 : 0.5;
  return Math.round(weight / step) * step;
}

// EMA smoothing
function emaSmooth(values: number[], alpha = 0.3): number {
  if (values.length === 0) return 0;
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = alpha * values[i] + (1 - alpha) * ema;
  }
  return ema;
}

export type TimeRange = 'current' | '1m' | '3m' | '6m' | '1y' | 'lifetime';

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  current: 'Current',
  '1m': '1M',
  '3m': '3M',
  '6m': '6M',
  '1y': '1Y',
  lifetime: 'Lifetime',
};

const RANGE_DAYS: Record<Exclude<TimeRange, 'current' | 'lifetime'>, number> = {
  '1m': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
};

export const REP_TABLE_ROWS = [1, 2, 3, 4, 5, 8, 10, 12, 15, 20, 21];

interface SetLogRow {
  completed_weight: number | null;
  completed_reps: number | null;
  created_at: string;
}

export interface OneRMResult {
  e1rm: number; // smoothed EMA
  rawBest: number;
  hasData: boolean;
}

function computeFromSets(sets: SetLogRow[]): OneRMResult {
  const valid = sets
    .filter(s => s.completed_weight && s.completed_weight > 0 && s.completed_reps && s.completed_reps > 0)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (valid.length === 0) return { e1rm: 0, rawBest: 0, hasData: false };

  const e1rmValues = valid.map(s => computeEpley(s.completed_weight!, s.completed_reps!));
  const rawBest = Math.max(...e1rmValues);
  const smoothed = emaSmooth(e1rmValues);

  return { e1rm: smoothed, rawBest, hasData: true };
}

/**
 * Core hook for 1RM data for a given exercise.
 * Fetches historical set_logs and computes EMA-smoothed e1RM per time range.
 */
export function useOneRepMax(exerciseId: string | null) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const units = (profile?.units as 'metric' | 'imperial') || 'metric';

  const { data: allSets = [], isLoading } = useQuery({
    queryKey: ['1rm-sets', exerciseId, user?.id],
    queryFn: async () => {
      if (!exerciseId || !user) return [];
      const { data, error } = await supabase
        .from('set_logs')
        .select(`
          completed_weight,
          completed_reps,
          created_at,
          is_completed,
          exercise_logs!inner (
            exercise_id,
            workout_sessions!inner (
              user_id,
              status
            )
          )
        `)
        .eq('exercise_logs.exercise_id', exerciseId)
        .eq('exercise_logs.workout_sessions.user_id', user.id)
        .eq('exercise_logs.workout_sessions.status', 'completed')
        .eq('is_completed', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as SetLogRow[];
    },
    enabled: !!exerciseId && !!user,
    staleTime: 5 * 60 * 1000,
  });

  const resultsByRange = useMemo(() => {
    const now = Date.now();
    const results: Record<TimeRange, OneRMResult> = {
      current: { e1rm: 0, rawBest: 0, hasData: false },
      '1m': { e1rm: 0, rawBest: 0, hasData: false },
      '3m': { e1rm: 0, rawBest: 0, hasData: false },
      '6m': { e1rm: 0, rawBest: 0, hasData: false },
      '1y': { e1rm: 0, rawBest: 0, hasData: false },
      lifetime: computeFromSets(allSets),
    };

    // Current: last 7 days
    const sevenDaysAgo = now - 7 * 86400000;
    results.current = computeFromSets(allSets.filter(s => new Date(s.created_at).getTime() >= sevenDaysAgo));

    for (const [key, days] of Object.entries(RANGE_DAYS)) {
      const cutoff = now - days * 86400000;
      results[key as TimeRange] = computeFromSets(allSets.filter(s => new Date(s.created_at).getTime() >= cutoff));
    }

    return results;
  }, [allSets]);

  return { resultsByRange, isLoading, units, allSets };
}

/**
 * Compute e1RM from in-session sets (for live updating in active workout).
 */
export function computeSessionE1RM(sets: ExerciseSet[]): number {
  const valid = sets.filter(s => s.completed && s.completedWeight && s.completedWeight > 0 && s.completedReps && s.completedReps > 0);
  if (valid.length === 0) return 0;
  const values = valid.map(s => computeEpley(s.completedWeight!, s.completedReps!));
  return Math.max(...values);
}

/**
 * Hook for Progress page: gets user's top 1RM exercise.
 */
export function useTopOneRM() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['top-1rm', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get recent completed sets grouped by exercise
      const { data: logs, error } = await supabase
        .from('set_logs')
        .select(`
          completed_weight,
          completed_reps,
          exercise_logs!inner (
            exercise_id,
            exercise_name,
            workout_sessions!inner (
              user_id,
              status
            )
          )
        `)
        .eq('exercise_logs.workout_sessions.user_id', user.id)
        .eq('exercise_logs.workout_sessions.status', 'completed')
        .eq('is_completed', true)
        .not('completed_weight', 'is', null)
        .not('completed_reps', 'is', null)
        .gt('completed_weight', 0)
        .gt('completed_reps', 0);

      if (error) throw error;
      if (!logs || logs.length === 0) return null;

      // Find best e1RM across all exercises
      let bestE1rm = 0;
      let bestExerciseName = '';
      let bestExerciseId = '';

      for (const log of logs) {
        const e1rm = computeEpley(log.completed_weight!, log.completed_reps!);
        const exerciseLog = log.exercise_logs as unknown as { exercise_id: string; exercise_name: string };
        if (e1rm > bestE1rm) {
          bestE1rm = e1rm;
          bestExerciseName = exerciseLog.exercise_name;
          bestExerciseId = exerciseLog.exercise_id;
        }
      }

      if (bestE1rm === 0) return null;

      return { e1rm: bestE1rm, exerciseName: bestExerciseName, exerciseId: bestExerciseId };
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  return { topExercise: data ?? null, isLoading };
}
