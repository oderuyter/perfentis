// Timestamp-based block timer hook for EMOM & AMRAP
// Survives background, lock screen, and app relaunch via ISO timestamps + context_json persistence
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─── Shared timer state ──────────────────────────────────────
export interface BlockTimerState {
  timer_mode: "countdown" | "countup";
  block_started_at: string | null; // ISO
  is_paused: boolean;
  paused_at: string | null; // ISO
  total_paused_seconds: number;
}

// ─── EMOM-specific persisted state ───────────────────────────
export interface EmomTimerState extends BlockTimerState {
  interval_seconds: number; // default 60
  rounds_total: number;
  current_round_index: number; // 1-based
  rotation_mode: "rotate" | "fixed";
  current_item_index: number;
  exercise_count: number;
}

// ─── AMRAP-specific persisted state ──────────────────────────
export interface AmrapTimerState extends BlockTimerState {
  time_cap_seconds: number;
  rounds_completed: number;
  reps_in_current_round: number;
}

// ─── Computed (derived at render, never stored) ──────────────
export interface DerivedTimerValues {
  elapsed_seconds: number;
  remaining_seconds: number; // for countdown: duration - elapsed
  // EMOM-specific derived
  current_interval_elapsed: number;
  current_interval_remaining: number;
  is_completed: boolean;
}

// ─── Core timestamp math ─────────────────────────────────────
function computeElapsed(state: BlockTimerState): number {
  if (!state.block_started_at) return 0;
  const started = new Date(state.block_started_at).getTime();
  const now = state.is_paused && state.paused_at
    ? new Date(state.paused_at).getTime()
    : Date.now();
  return Math.max(0, Math.floor((now - started) / 1000) - state.total_paused_seconds);
}

// ─── Hook: useEmomTimer ──────────────────────────────────────
interface UseEmomTimerProps {
  blockId: string;
  sessionId?: string;
  intervalSeconds?: number;
  roundsTotal: number;
  rotationMode: "rotate" | "fixed";
  exerciseCount: number;
  restSeconds?: number;
  initialState?: Partial<EmomTimerState>;
  onRoundChange?: (round: number, itemIndex: number) => void;
  onComplete?: () => void;
}

export function useEmomTimer({
  blockId,
  sessionId,
  intervalSeconds = 60,
  roundsTotal,
  rotationMode,
  exerciseCount,
  restSeconds = 0,
  initialState,
  onRoundChange,
  onComplete,
}: UseEmomTimerProps) {
  const [timerState, setTimerState] = useState<EmomTimerState>(() => ({
    timer_mode: initialState?.timer_mode ?? "countdown",
    block_started_at: initialState?.block_started_at ?? null,
    is_paused: initialState?.is_paused ?? false,
    paused_at: initialState?.paused_at ?? null,
    total_paused_seconds: initialState?.total_paused_seconds ?? 0,
    interval_seconds: initialState?.interval_seconds ?? intervalSeconds,
    rounds_total: initialState?.rounds_total ?? roundsTotal,
    current_round_index: initialState?.current_round_index ?? 1,
    rotation_mode: initialState?.rotation_mode ?? rotationMode,
    current_item_index: initialState?.current_item_index ?? 0,
    exercise_count: initialState?.exercise_count ?? exerciseCount,
  }));

  const completedRef = useRef(false);
  const lastRoundRef = useRef(timerState.current_round_index);

  // Derive values from timestamps
  const derived = useMemo<DerivedTimerValues>(() => {
    const elapsed = computeElapsed(timerState);
    const totalDuration = timerState.rounds_total * timerState.interval_seconds;
    const remaining = Math.max(0, totalDuration - elapsed);
    const currentIntervalElapsed = elapsed % timerState.interval_seconds;
    const currentIntervalRemaining = timerState.interval_seconds - currentIntervalElapsed;
    const isCompleted = elapsed >= totalDuration && timerState.block_started_at !== null;
    return {
      elapsed_seconds: elapsed,
      remaining_seconds: remaining,
      current_interval_elapsed: currentIntervalElapsed,
      current_interval_remaining: currentIntervalRemaining,
      is_completed: isCompleted,
    };
  }, [timerState]);

  // Tick effect — recompute round from elapsed time
  useEffect(() => {
    if (!timerState.block_started_at || timerState.is_paused) return;
    const tick = setInterval(() => {
      setTimerState(prev => {
        const elapsed = computeElapsed(prev);
        const totalDuration = prev.rounds_total * prev.interval_seconds;

        if (elapsed >= totalDuration && !completedRef.current) {
          completedRef.current = true;
          onComplete?.();
          return { ...prev, is_paused: true, paused_at: new Date().toISOString() };
        }

        const newRound = Math.min(prev.rounds_total, Math.floor(elapsed / prev.interval_seconds) + 1);
        const newItemIndex = prev.rotation_mode === "rotate"
          ? (newRound - 1) % prev.exercise_count
          : 0;

        if (newRound !== prev.current_round_index) {
          return { ...prev, current_round_index: newRound, current_item_index: newItemIndex };
        }
        return prev; // force re-render via interval but no state change needed
      });
    }, 250);
    return () => clearInterval(tick);
  }, [timerState.block_started_at, timerState.is_paused, onComplete]);

  // Notify on round change
  useEffect(() => {
    if (timerState.current_round_index !== lastRoundRef.current) {
      lastRoundRef.current = timerState.current_round_index;
      onRoundChange?.(timerState.current_round_index, timerState.current_item_index);
    }
  }, [timerState.current_round_index, timerState.current_item_index, onRoundChange]);

  // Force re-render every 250ms for display
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!timerState.block_started_at || timerState.is_paused) return;
    const id = setInterval(() => setTick(t => t + 1), 250);
    return () => clearInterval(id);
  }, [timerState.block_started_at, timerState.is_paused]);

  // Autosave to block_instances
  const autosaveRef = useRef<NodeJS.Timeout | null>(null);
  const persistState = useCallback(async (state: EmomTimerState) => {
    if (!sessionId) return;
    try {
      await supabase
        .from("block_instances")
        .update({ context_json: JSON.parse(JSON.stringify(state)) })
        .eq("block_id", blockId)
        .eq("workout_session_id", sessionId);
    } catch (err) {
      console.warn("Block timer autosave failed:", err);
    }
  }, [blockId, sessionId]);

  // Debounced autosave
  useEffect(() => {
    if (!sessionId || !timerState.block_started_at) return;
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => persistState(timerState), 1500);
    return () => { if (autosaveRef.current) clearTimeout(autosaveRef.current); };
  }, [timerState, persistState, sessionId]);

  // Actions
  const start = useCallback(() => {
    completedRef.current = false;
    setTimerState(prev => ({
      ...prev,
      block_started_at: prev.block_started_at || new Date().toISOString(),
      is_paused: false,
      paused_at: null,
    }));
  }, []);

  const pause = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      is_paused: true,
      paused_at: new Date().toISOString(),
    }));
  }, []);

  const resume = useCallback(() => {
    setTimerState(prev => {
      if (!prev.paused_at) return { ...prev, is_paused: false };
      const pauseDuration = Math.floor((Date.now() - new Date(prev.paused_at).getTime()) / 1000);
      return {
        ...prev,
        is_paused: false,
        paused_at: null,
        total_paused_seconds: prev.total_paused_seconds + pauseDuration,
      };
    });
  }, []);

  const toggleMode = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      timer_mode: prev.timer_mode === "countdown" ? "countup" : "countdown",
    }));
  }, []);

  const skipToNextRound = useCallback(() => {
    setTimerState(prev => {
      if (prev.current_round_index >= prev.rounds_total) {
        completedRef.current = true;
        onComplete?.();
        return { ...prev, is_paused: true, paused_at: new Date().toISOString() };
      }
      // Jump elapsed to the start of the next round by adjusting block_started_at
      const targetElapsed = prev.current_round_index * prev.interval_seconds;
      const actualElapsed = computeElapsed(prev);
      const adjustment = actualElapsed - targetElapsed;
      return {
        ...prev,
        total_paused_seconds: prev.total_paused_seconds + adjustment,
        current_round_index: prev.current_round_index + 1,
        current_item_index: prev.rotation_mode === "rotate"
          ? prev.current_round_index % prev.exercise_count
          : 0,
      };
    });
  }, [onComplete]);

  const isRunning = !!timerState.block_started_at && !timerState.is_paused;
  const isStarted = !!timerState.block_started_at;

  return {
    timerState,
    derived: {
      ...derived,
      // Recompute for freshness on each render
      elapsed_seconds: computeElapsed(timerState),
      remaining_seconds: Math.max(0, timerState.rounds_total * timerState.interval_seconds - computeElapsed(timerState)),
      current_interval_elapsed: computeElapsed(timerState) % timerState.interval_seconds,
      current_interval_remaining: timerState.interval_seconds - (computeElapsed(timerState) % timerState.interval_seconds),
      is_completed: computeElapsed(timerState) >= timerState.rounds_total * timerState.interval_seconds && timerState.block_started_at !== null,
    },
    isRunning,
    isStarted,
    start,
    pause,
    resume,
    toggleMode,
    skipToNextRound,
  };
}

// ─── Hook: useAmrapTimer ─────────────────────────────────────
interface UseAmrapTimerProps {
  blockId: string;
  sessionId?: string;
  timeCapSeconds: number;
  initialState?: Partial<AmrapTimerState>;
  onComplete?: (score: { rounds: number; reps: number }) => void;
}

export function useAmrapTimer({
  blockId,
  sessionId,
  timeCapSeconds,
  initialState,
  onComplete,
}: UseAmrapTimerProps) {
  const [timerState, setTimerState] = useState<AmrapTimerState>(() => ({
    timer_mode: initialState?.timer_mode ?? "countdown",
    block_started_at: initialState?.block_started_at ?? null,
    is_paused: initialState?.is_paused ?? false,
    paused_at: initialState?.paused_at ?? null,
    total_paused_seconds: initialState?.total_paused_seconds ?? 0,
    time_cap_seconds: initialState?.time_cap_seconds ?? timeCapSeconds,
    rounds_completed: initialState?.rounds_completed ?? 0,
    reps_in_current_round: initialState?.reps_in_current_round ?? 0,
  }));

  const completedRef = useRef(false);

  // Force re-render every 250ms
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!timerState.block_started_at || timerState.is_paused) return;
    const id = setInterval(() => setTick(t => t + 1), 250);
    return () => clearInterval(id);
  }, [timerState.block_started_at, timerState.is_paused]);

  // Check completion
  useEffect(() => {
    if (!timerState.block_started_at || timerState.is_paused || completedRef.current) return;
    const check = setInterval(() => {
      const elapsed = computeElapsed(timerState);
      if (elapsed >= timerState.time_cap_seconds && !completedRef.current) {
        completedRef.current = true;
        setTimerState(prev => ({ ...prev, is_paused: true, paused_at: new Date().toISOString() }));
        onComplete?.({ rounds: timerState.rounds_completed, reps: timerState.reps_in_current_round });
      }
    }, 250);
    return () => clearInterval(check);
  }, [timerState.block_started_at, timerState.is_paused, timerState.time_cap_seconds, timerState.rounds_completed, timerState.reps_in_current_round, onComplete]);

  // Derive
  const elapsed = computeElapsed(timerState);
  const remaining = Math.max(0, timerState.time_cap_seconds - elapsed);
  const progress = timerState.time_cap_seconds > 0 ? elapsed / timerState.time_cap_seconds : 0;
  const isCompleted = elapsed >= timerState.time_cap_seconds && timerState.block_started_at !== null;

  // Autosave
  const autosaveRef = useRef<NodeJS.Timeout | null>(null);
  const persistState = useCallback(async (state: AmrapTimerState) => {
    if (!sessionId) return;
    try {
      await supabase
        .from("block_instances")
        .update({ context_json: JSON.parse(JSON.stringify(state)) })
        .eq("block_id", blockId)
        .eq("workout_session_id", sessionId);
    } catch (err) {
      console.warn("AMRAP timer autosave failed:", err);
    }
  }, [blockId, sessionId]);

  useEffect(() => {
    if (!sessionId || !timerState.block_started_at) return;
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => persistState(timerState), 1500);
    return () => { if (autosaveRef.current) clearTimeout(autosaveRef.current); };
  }, [timerState, persistState, sessionId]);

  // Actions
  const start = useCallback(() => {
    completedRef.current = false;
    setTimerState(prev => ({
      ...prev,
      block_started_at: prev.block_started_at || new Date().toISOString(),
      is_paused: false,
      paused_at: null,
    }));
  }, []);

  const pause = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      is_paused: true,
      paused_at: new Date().toISOString(),
    }));
  }, []);

  const resume = useCallback(() => {
    setTimerState(prev => {
      if (!prev.paused_at) return { ...prev, is_paused: false };
      const pauseDuration = Math.floor((Date.now() - new Date(prev.paused_at).getTime()) / 1000);
      return {
        ...prev,
        is_paused: false,
        paused_at: null,
        total_paused_seconds: prev.total_paused_seconds + pauseDuration,
      };
    });
  }, []);

  const toggleMode = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      timer_mode: prev.timer_mode === "countdown" ? "countup" : "countdown",
    }));
  }, []);

  const updateScore = useCallback((rounds: number, reps: number) => {
    setTimerState(prev => ({
      ...prev,
      rounds_completed: rounds,
      reps_in_current_round: reps,
    }));
  }, []);

  const endEarly = useCallback(() => {
    completedRef.current = true;
    setTimerState(prev => ({ ...prev, is_paused: true, paused_at: new Date().toISOString() }));
    onComplete?.({ rounds: timerState.rounds_completed, reps: timerState.reps_in_current_round });
  }, [timerState.rounds_completed, timerState.reps_in_current_round, onComplete]);

  const isRunning = !!timerState.block_started_at && !timerState.is_paused;
  const isStarted = !!timerState.block_started_at;

  return {
    timerState,
    elapsed,
    remaining,
    progress: Math.min(1, progress),
    isCompleted,
    isRunning,
    isStarted,
    start,
    pause,
    resume,
    toggleMode,
    updateScore,
    endEarly,
  };
}
