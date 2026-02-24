import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';
import { computeEpley } from './useOneRepMax';
import {
  CANONICAL_LIFTS,
  LIFT_ANCHORS,
  ratioToScore,
  scoreToLabel,
  type Sex,
  type LiftMapping,
} from '@/lib/strengthScoreConfig';

export type StrengthRange = '3m' | 'lifetime';

export interface LiftResult {
  canonical: string;
  exerciseId: string;
  exerciseName: string;
  e1rm: number; // kg
  ratio: number; // e1rm / bw
  liftScore: number;
  label: string;
  lastSeen: string;
  confidence: number;
  weight: number; // canonical weight
}

export interface StrengthScoreResult {
  score: number;
  label: string;
  coverage: number;
  lifts: LiftResult[];
  bodyweightKg: number;
  sex: Sex;
  hasScore: boolean;
  missingBodyweight: boolean;
}

const EMPTY_RESULT: StrengthScoreResult = {
  score: 0,
  label: 'Beginner',
  coverage: 0,
  lifts: [],
  bodyweightKg: 0,
  sex: 'unknown',
  hasScore: false,
  missingBodyweight: false,
};

interface SetRow {
  completed_weight: number;
  completed_reps: number;
  created_at: string;
  exercise_id: string;
  exercise_name: string;
}

function emaSmooth(values: number[], alpha = 0.3): number {
  if (values.length === 0) return 0;
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = alpha * values[i] + (1 - alpha) * ema;
  }
  return ema;
}

function computeLiftResult(
  sets: SetRow[],
  mapping: LiftMapping,
  bodyweightKg: number,
  sex: Sex,
): LiftResult | null {
  if (sets.length === 0) return null;

  // Group by exercise, prefer primary
  const exerciseGroups = new Map<string, { id: string; name: string; sets: SetRow[] }>();
  for (const s of sets) {
    const key = s.exercise_id;
    if (!exerciseGroups.has(key)) {
      exerciseGroups.set(key, { id: s.exercise_id, name: s.exercise_name, sets: [] });
    }
    exerciseGroups.get(key)!.sets.push(s);
  }

  // Pick best representative: prefer primary with most recent data
  let bestGroup: { id: string; name: string; sets: SetRow[] } | null = null;
  const allNames = [...mapping.primaryNames, ...mapping.optionalNames];

  // Try primary first
  for (const [, group] of exerciseGroups) {
    const isPrimary = mapping.primaryNames.some(n => n.toLowerCase() === group.name.toLowerCase());
    if (isPrimary && group.sets.length > 0) {
      if (!bestGroup || group.sets.length > bestGroup.sets.length) {
        bestGroup = group;
      }
    }
  }
  // Fallback to any
  if (!bestGroup) {
    for (const [, group] of exerciseGroups) {
      if (!bestGroup || group.sets.length > bestGroup.sets.length) {
        bestGroup = group;
      }
    }
  }

  if (!bestGroup || bestGroup.sets.length === 0) return null;

  const sorted = [...bestGroup.sets].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const e1rmValues = sorted.map(s => computeEpley(s.completed_weight, s.completed_reps));
  const e1rm = emaSmooth(e1rmValues);

  if (e1rm <= 0) return null;

  const ratio = e1rm / bodyweightKg;
  const anchors = LIFT_ANCHORS[mapping.canonical]?.[sex] || LIFT_ANCHORS[mapping.canonical]?.unknown;
  if (!anchors) return null;

  const liftScore = ratioToScore(ratio, anchors);

  // Confidence: recency + volume
  const lastSet = sorted[sorted.length - 1];
  const daysSinceLast = (Date.now() - new Date(lastSet.created_at).getTime()) / 86400000;
  const recencyFactor = Math.max(0.3, 1 - daysSinceLast / 180);
  const volumeFactor = Math.min(1, sorted.length / 10);
  const confidence = recencyFactor * 0.6 + volumeFactor * 0.4;

  return {
    canonical: mapping.canonical,
    exerciseId: bestGroup.id,
    exerciseName: bestGroup.name,
    e1rm,
    ratio,
    liftScore: Math.round(liftScore * 10) / 10,
    label: scoreToLabel(liftScore),
    lastSeen: lastSet.created_at,
    confidence,
    weight: mapping.weight,
  };
}

/**
 * Core hook: computes composite Strength Score for the current user.
 */
export function useStrengthScore(range: StrengthRange = '3m') {
  const { user } = useAuth();
  const { profile } = useProfile();

  const bodyweightKg = (profile as any)?.bodyweight_kg as number | null;
  const sex = ((profile as any)?.sex as Sex) || 'unknown';
  const units = (profile?.units as 'metric' | 'imperial') || 'metric';

  // Collect all exercise name patterns for the query
  const allExerciseNames = CANONICAL_LIFTS.flatMap(m => [...m.primaryNames, ...m.optionalNames]);

  const { data: result = EMPTY_RESULT, isLoading } = useQuery({
    queryKey: ['strength-score', user?.id, range, bodyweightKg, sex],
    queryFn: async (): Promise<StrengthScoreResult> => {
      if (!user) return EMPTY_RESULT;
      if (!bodyweightKg || bodyweightKg <= 0) {
        return { ...EMPTY_RESULT, missingBodyweight: true };
      }

      // Build date filter
      const cutoff = range === 'lifetime'
        ? '1970-01-01T00:00:00Z'
        : new Date(Date.now() - 90 * 86400000).toISOString();

      // Fetch all relevant sets in one query
      const { data: rawSets, error } = await supabase
        .from('set_logs')
        .select(`
          completed_weight,
          completed_reps,
          created_at,
          is_completed,
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
        .gte('created_at', cutoff)
        .gt('completed_weight', 0)
        .gt('completed_reps', 0);

      if (error) throw error;
      if (!rawSets || rawSets.length === 0) {
        return { ...EMPTY_RESULT, bodyweightKg, sex };
      }

      // Map to flat rows and filter to canonical exercises
      const lowerNames = new Set(allExerciseNames.map(n => n.toLowerCase()));
      const flatSets: SetRow[] = [];
      for (const row of rawSets) {
        const el = row.exercise_logs as unknown as { exercise_id: string; exercise_name: string };
        if (lowerNames.has(el.exercise_name.toLowerCase())) {
          flatSets.push({
            completed_weight: row.completed_weight!,
            completed_reps: row.completed_reps!,
            created_at: row.created_at,
            exercise_id: el.exercise_id,
            exercise_name: el.exercise_name,
          });
        }
      }

      // Compute per-lift
      const lifts: LiftResult[] = [];
      for (const mapping of CANONICAL_LIFTS) {
        const matchNames = [...mapping.primaryNames, ...mapping.optionalNames].map(n => n.toLowerCase());
        const liftSets = flatSets.filter(s => matchNames.includes(s.exercise_name.toLowerCase()));
        const result = computeLiftResult(liftSets, mapping, bodyweightKg, sex);
        if (result) lifts.push(result);
      }

      const coverage = lifts.length;

      if (coverage < 2) {
        return { score: 0, label: 'Beginner', coverage, lifts, bodyweightKg, sex, hasScore: false, missingBodyweight: false };
      }

      // Weighted mean (renormalize)
      const totalWeight = lifts.reduce((s, l) => s + l.weight, 0);
      const weightedScore = lifts.reduce((s, l) => s + l.liftScore * l.weight, 0) / totalWeight;

      // Coverage factor: mild penalty for missing lifts
      const coverageFactor = 0.85 + 0.15 * (coverage / 4);
      const finalScore = Math.round(weightedScore * coverageFactor * 10) / 10;

      return {
        score: Math.min(100, finalScore),
        label: scoreToLabel(finalScore),
        coverage,
        lifts,
        bodyweightKg,
        sex,
        hasScore: true,
        missingBodyweight: false,
      };
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  return { result, isLoading, units };
}

/**
 * Hook for coaches: compute strength score for a specific client user.
 */
export function useClientStrengthScore(clientUserId: string | null, range: StrengthRange = '3m') {
  const { data: result = EMPTY_RESULT, isLoading } = useQuery({
    queryKey: ['client-strength-score', clientUserId, range],
    queryFn: async (): Promise<StrengthScoreResult> => {
      if (!clientUserId) return EMPTY_RESULT;

      // Get client profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('bodyweight_kg, sex, units')
        .eq('user_id', clientUserId)
        .maybeSingle();

      const bodyweightKg = (profile as any)?.bodyweight_kg as number | null;
      const sex = ((profile as any)?.sex as Sex) || 'unknown';

      if (!bodyweightKg || bodyweightKg <= 0) {
        return { ...EMPTY_RESULT, missingBodyweight: true };
      }

      const allExerciseNames = CANONICAL_LIFTS.flatMap(m => [...m.primaryNames, ...m.optionalNames]);
      const cutoff = range === 'lifetime'
        ? '1970-01-01T00:00:00Z'
        : new Date(Date.now() - 90 * 86400000).toISOString();

      const { data: rawSets, error } = await supabase
        .from('set_logs')
        .select(`
          completed_weight,
          completed_reps,
          created_at,
          is_completed,
          exercise_logs!inner (
            exercise_id,
            exercise_name,
            workout_sessions!inner (
              user_id,
              status
            )
          )
        `)
        .eq('exercise_logs.workout_sessions.user_id', clientUserId)
        .eq('exercise_logs.workout_sessions.status', 'completed')
        .eq('is_completed', true)
        .gte('created_at', cutoff)
        .gt('completed_weight', 0)
        .gt('completed_reps', 0);

      if (error) throw error;
      if (!rawSets || rawSets.length === 0) {
        return { ...EMPTY_RESULT, bodyweightKg, sex };
      }

      const lowerNames = new Set(allExerciseNames.map(n => n.toLowerCase()));
      const flatSets: SetRow[] = [];
      for (const row of rawSets) {
        const el = row.exercise_logs as unknown as { exercise_id: string; exercise_name: string };
        if (lowerNames.has(el.exercise_name.toLowerCase())) {
          flatSets.push({
            completed_weight: row.completed_weight!,
            completed_reps: row.completed_reps!,
            created_at: row.created_at,
            exercise_id: el.exercise_id,
            exercise_name: el.exercise_name,
          });
        }
      }

      const lifts: LiftResult[] = [];
      for (const mapping of CANONICAL_LIFTS) {
        const matchNames = [...mapping.primaryNames, ...mapping.optionalNames].map(n => n.toLowerCase());
        const liftSets = flatSets.filter(s => matchNames.includes(s.exercise_name.toLowerCase()));
        const r = computeLiftResult(liftSets, mapping, bodyweightKg, sex);
        if (r) lifts.push(r);
      }

      const coverage = lifts.length;
      if (coverage < 2) {
        return { score: 0, label: 'Beginner', coverage, lifts, bodyweightKg, sex, hasScore: false, missingBodyweight: false };
      }

      const totalWeight = lifts.reduce((s, l) => s + l.weight, 0);
      const weightedScore = lifts.reduce((s, l) => s + l.liftScore * l.weight, 0) / totalWeight;
      const coverageFactor = 0.85 + 0.15 * (coverage / 4);
      const finalScore = Math.round(weightedScore * coverageFactor * 10) / 10;

      return {
        score: Math.min(100, finalScore),
        label: scoreToLabel(finalScore),
        coverage,
        lifts,
        bodyweightKg,
        sex,
        hasScore: true,
        missingBodyweight: false,
      };
    },
    enabled: !!clientUserId,
    staleTime: 10 * 60 * 1000,
  });

  return { result, isLoading };
}

/**
 * Check if a given exercise name maps to a canonical lift.
 */
export function getCanonicalLift(exerciseName: string): string | null {
  const lower = exerciseName.toLowerCase();
  for (const mapping of CANONICAL_LIFTS) {
    const allNames = [...mapping.primaryNames, ...mapping.optionalNames];
    if (allNames.some(n => n.toLowerCase() === lower)) {
      return mapping.canonical;
    }
  }
  return null;
}
