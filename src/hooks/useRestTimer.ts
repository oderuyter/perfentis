import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// --- Sound & Haptics utilities ---
function playBeep(frequency = 880, durationMs = 200, volume = 0.3) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.stop(ctx.currentTime + durationMs / 1000 + 0.05);
    setTimeout(() => ctx.close(), durationMs + 200);
  } catch { /* silent fail */ }
}

function playCompletionSound() {
  // Two-tone chime
  playBeep(660, 150, 0.3);
  setTimeout(() => playBeep(880, 250, 0.35), 170);
}

function triggerHaptic(pattern: number | number[] = 50) {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch { /* silent fail */ }
}

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

interface UseRestTimerOptions {
  soundEnabled?: boolean;
  hapticsEnabled?: boolean;
}

/**
 * Timestamp-based rest timer. Never relies on JS intervals as source of truth.
 * Remaining/elapsed is always recomputed from wall-clock timestamps.
 */
export function useRestTimer(options: UseRestTimerOptions = {}) {
  const { soundEnabled = false, hapticsEnabled = true } = options;
  const [timerState, setTimerState] = useState<RestTimerState>(INITIAL_STATE);
  const [drawerState, setDrawerState] = useState<DrawerState>('compact');
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const rafRef = useRef<number | null>(null);
  const tickIntervalRef = useRef<number | null>(null);
  const completionFiredRef = useRef(false);
  const countdownFiredRef = useRef<Set<number>>(new Set());

  // Compute elapsed ms from timestamps (background-resilient)
  const computeElapsedMs = useCallback((state: RestTimerState): number => {
    if (!state.restStartedAt) return 0;
    const start = new Date(state.restStartedAt).getTime();
    const now = state.isPaused && state.pausedAt
      ? new Date(state.pausedAt).getTime()
      : Date.now();
    return Math.max(0, now - start - state.totalPausedMs);
  }, []);

  // Update display value from timestamps (single stable ticker)
  useEffect(() => {
    const clearTicker = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    };

    if (!timerState.isActive) {
      clearTicker();
      setDisplaySeconds(0);
      return;
    }

    const updateDisplay = () => {
      const elapsedMs = computeElapsedMs(timerState);
      const elapsedSec = Math.floor(elapsedMs / 1000);

      if (timerState.restMode === 'countdown') {
        const remaining = Math.max(0, timerState.restTargetSeconds - elapsedSec);
        setDisplaySeconds(remaining);
      } else {
        setDisplaySeconds(elapsedSec);
      }
    };

    updateDisplay();

    // Keep one ticker only; paused state is handled by timestamps themselves
    tickIntervalRef.current = window.setInterval(updateDisplay, 250);

    return clearTicker;
  }, [timerState.isActive, timerState.restStartedAt, timerState.isPaused, timerState.pausedAt, timerState.totalPausedMs, timerState.restTargetSeconds, timerState.restMode, computeElapsedMs]);

  // Derived: is rest complete (countdown hit 0)?
  const isComplete = useMemo(() => {
    if (!timerState.isActive || timerState.restMode !== 'countdown') return false;
    return displaySeconds <= 0;
  }, [timerState.isActive, timerState.restMode, displaySeconds]);

  // Countdown beeps at 5, 4, 3, 2, 1 seconds remaining + completion chime at 0
  useEffect(() => {
    if (!timerState.isActive || timerState.restMode !== 'countdown') return;

    // Countdown tones: escalating pitch for 5→1
    const countdownTones: Record<number, number> = { 5: 440, 4: 523, 3: 587, 2: 659, 1: 784 };
    const sec = displaySeconds;

    if (sec >= 1 && sec <= 5 && !countdownFiredRef.current.has(sec)) {
      countdownFiredRef.current.add(sec);
      if (soundEnabled) playBeep(countdownTones[sec], 120, 0.25);
      if (hapticsEnabled) triggerHaptic(25);
    }

    // Final completion chime at 0
    if (sec <= 0 && !completionFiredRef.current) {
      completionFiredRef.current = true;
      if (soundEnabled) playCompletionSound();
      if (hapticsEnabled) triggerHaptic([100, 50, 100]);
    }

    if (sec > 5) {
      // Reset trackers when above countdown range
      completionFiredRef.current = false;
      countdownFiredRef.current.clear();
    }
  }, [displaySeconds, timerState.isActive, timerState.restMode, soundEnabled, hapticsEnabled]);

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
    completionFiredRef.current = false;
    countdownFiredRef.current.clear();
    if (hapticsEnabled) triggerHaptic(30);
    setTimerState({
      isActive: true,
      restStartedAt: new Date().toISOString(),
      restTargetSeconds: targetSeconds,
      restMode: mode,
      isPaused: false,
      pausedAt: null,
      totalPausedMs: 0,
    });
    setDrawerState('expanded');
  }, [hapticsEnabled]);

  const skipRest = useCallback(() => {
    setTimerState(INITIAL_STATE);
    setDrawerState('expanded');
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
    if (hapticsEnabled) triggerHaptic(15);
    setTimerState(prev => {
      if (!prev.isActive) return prev;
      const newTarget = Math.max(0, prev.restTargetSeconds + deltaSec);
      // Simply update the target; elapsed stays the same, so remaining shifts by deltaSec
      return { ...prev, restTargetSeconds: newTarget };
    });
  }, [hapticsEnabled]);

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
