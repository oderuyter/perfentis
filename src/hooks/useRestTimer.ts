import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

export type RestMode = 'countdown' | 'countup';
export type DrawerState = 'expanded' | 'compact' | 'floating';

export interface RestTimerState {
  isActive: boolean;
  restStartedAt: string | null;
  restTargetSeconds: number;
  restMode: RestMode;
  isPaused: boolean;
  pausedAt: string | null;
  totalPausedMs: number; // accumulated pause time in ms
}

const INITIAL_STATE: RestTimerState = {
  isActive: false,
  restStartedAt: null,
  restTargetSeconds: 90,
  restMode: 'countdown',
  isPaused: false,
  pausedAt: null,
  totalPausedMs: 0,
};

/**
 * Timestamp-based rest timer. Never relies on JS intervals as source of truth.
 * Remaining/elapsed is always recomputed from wall-clock timestamps.
 */
export function useRestTimer() {
  const [timerState, setTimerState] = useState<RestTimerState>(INITIAL_STATE);
  const [drawerState, setDrawerState] = useState<DrawerState>('compact');
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const rafRef = useRef<number | null>(null);

  // Compute elapsed ms from timestamps (background-resilient)
  const computeElapsedMs = useCallback((state: RestTimerState): number => {
    if (!state.restStartedAt) return 0;
    const start = new Date(state.restStartedAt).getTime();
    const now = state.isPaused && state.pausedAt
      ? new Date(state.pausedAt).getTime()
      : Date.now();
    return Math.max(0, now - start - state.totalPausedMs);
  }, []);

  // Update display value at ~1Hz (using rAF for efficiency)
  useEffect(() => {
    if (!timerState.isActive) {
      setDisplaySeconds(0);
      return;
    }

    const tick = () => {
      const elapsedMs = computeElapsedMs(timerState);
      const elapsedSec = Math.floor(elapsedMs / 1000);

      if (timerState.restMode === 'countdown') {
        const remaining = Math.max(0, timerState.restTargetSeconds - elapsedSec);
        setDisplaySeconds(remaining);
      } else {
        setDisplaySeconds(elapsedSec);
      }

      rafRef.current = requestAnimationFrame(() => {
        // Schedule next tick ~250ms later for battery efficiency
        setTimeout(() => {
          if (timerState.isActive) {
            rafRef.current = requestAnimationFrame(tick);
          }
        }, 250);
      });
    };

    tick();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [timerState.isActive, timerState.restStartedAt, timerState.isPaused, timerState.pausedAt, timerState.totalPausedMs, timerState.restTargetSeconds, timerState.restMode, computeElapsedMs]);

  // Derived: is rest complete (countdown hit 0)?
  const isComplete = useMemo(() => {
    if (!timerState.isActive || timerState.restMode !== 'countdown') return false;
    return displaySeconds <= 0;
  }, [timerState.isActive, timerState.restMode, displaySeconds]);

  // Derived: has exceeded target (countup mode)?
  const isOverTarget = useMemo(() => {
    if (!timerState.isActive || timerState.restMode !== 'countup') return false;
    return displaySeconds > timerState.restTargetSeconds;
  }, [timerState.isActive, timerState.restMode, displaySeconds, timerState.restTargetSeconds]);

  // Derived: progress fraction 0→1
  const progress = useMemo(() => {
    if (!timerState.isActive || timerState.restTargetSeconds <= 0) return 0;
    if (timerState.restMode === 'countdown') {
      return 1 - displaySeconds / timerState.restTargetSeconds;
    }
    return Math.min(1, displaySeconds / timerState.restTargetSeconds);
  }, [timerState.isActive, timerState.restMode, displaySeconds, timerState.restTargetSeconds]);

  // ---- Actions ----

  const startRest = useCallback((targetSeconds: number, mode: RestMode = 'countdown') => {
    setTimerState({
      isActive: true,
      restStartedAt: new Date().toISOString(),
      restTargetSeconds: targetSeconds,
      restMode: mode,
      isPaused: false,
      pausedAt: null,
      totalPausedMs: 0,
    });
    setDrawerState('compact');
  }, []);

  const skipRest = useCallback(() => {
    setTimerState(INITIAL_STATE);
    setDrawerState('compact');
  }, []);

  const pauseRest = useCallback(() => {
    setTimerState(prev => {
      if (!prev.isActive || prev.isPaused) return prev;
      return { ...prev, isPaused: true, pausedAt: new Date().toISOString() };
    });
  }, []);

  const resumeRest = useCallback(() => {
    setTimerState(prev => {
      if (!prev.isActive || !prev.isPaused || !prev.pausedAt) return prev;
      const pauseDelta = Date.now() - new Date(prev.pausedAt).getTime();
      return {
        ...prev,
        isPaused: false,
        pausedAt: null,
        totalPausedMs: prev.totalPausedMs + pauseDelta,
      };
    });
  }, []);

  const adjustTarget = useCallback((deltaSec: number) => {
    setTimerState(prev => {
      if (!prev.isActive) return prev;
      const newTarget = Math.max(0, prev.restTargetSeconds + deltaSec);

      if (prev.restMode === 'countdown') {
        // Also shift the start time to keep remaining consistent with the adjustment
        // remaining = target - elapsed → new remaining = (target + delta) - elapsed = remaining + delta
        // We adjust the started_at to effectively add/remove time from remaining
        const elapsedMs = prev.restStartedAt
          ? (prev.isPaused && prev.pausedAt
              ? new Date(prev.pausedAt).getTime()
              : Date.now()) - new Date(prev.restStartedAt).getTime() - prev.totalPausedMs
          : 0;
        const currentRemaining = prev.restTargetSeconds - Math.floor(elapsedMs / 1000);
        const newRemaining = Math.max(0, currentRemaining + deltaSec);
        // Recompute startedAt so that newTarget - newElapsed = newRemaining
        const newElapsedSec = newTarget - newRemaining;
        const referenceNow = prev.isPaused && prev.pausedAt ? new Date(prev.pausedAt).getTime() : Date.now();
        const newStartedAt = new Date(referenceNow - newElapsedSec * 1000 - prev.totalPausedMs).toISOString();

        return { ...prev, restTargetSeconds: newTarget, restStartedAt: newStartedAt };
      }

      // Countup: only change threshold
      return { ...prev, restTargetSeconds: newTarget };
    });
  }, []);

  const setTargetManual = useCallback((seconds: number) => {
    setTimerState(prev => {
      if (!prev.isActive) return prev;
      const newTarget = Math.max(0, seconds);

      if (prev.restMode === 'countdown') {
        // Reset timer start so remaining = newTarget
        return {
          ...prev,
          restTargetSeconds: newTarget,
          restStartedAt: new Date().toISOString(),
          totalPausedMs: 0,
          isPaused: false,
          pausedAt: null,
        };
      }

      return { ...prev, restTargetSeconds: newTarget };
    });
  }, []);

  const toggleMode = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      restMode: prev.restMode === 'countdown' ? 'countup' : 'countdown',
    }));
  }, []);

  // For persistence/restore
  const restoreState = useCallback((saved: RestTimerState, drawer?: DrawerState) => {
    setTimerState(saved);
    if (drawer) setDrawerState(drawer);
  }, []);

  return {
    // State
    timerState,
    drawerState,
    setDrawerState,
    displaySeconds,
    isComplete,
    isOverTarget,
    progress,

    // Actions
    startRest,
    skipRest,
    pauseRest,
    resumeRest,
    adjustTarget,
    setTargetManual,
    toggleMode,
    restoreState,
  };
}
