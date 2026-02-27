import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  ChevronDown, ChevronUp, Minus, Plus, 
  SkipForward, Pause, Play, Volume2, VolumeX, 
  Smartphone, SmartphoneNfc, Timer, ArrowUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { DrawerState, RestMode } from '@/hooks/useRestTimer';
import type { ActiveExercise } from '@/types/workout';

interface RestTimerDrawerProps {
  isActive: boolean;
  displaySeconds: number;
  progress: number;
  isComplete: boolean;
  isOverTarget: boolean;
  restMode: RestMode;
  restTargetSeconds: number;
  isPaused: boolean;
  drawerState: DrawerState;
  setDrawerState: (s: DrawerState) => void;
  
  // Next set info
  nextExerciseName?: string;
  nextSetReps?: string | number | null;
  nextSetWeight?: number | null;
  currentSetNumber?: number;
  totalSets?: number;

  // Block timer auto-start toggle (for EMOM/AMRAP)
  isBlockTimerBlock?: boolean;
  blockTimerAutoStart?: boolean;
  onBlockTimerAutoStartToggle?: (v: boolean) => void;

  // Sound/haptics
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  onSoundToggle: (v: boolean) => void;
  onHapticsToggle: (v: boolean) => void;

  // Actions
  onSkip: () => void;
  onPause: () => void;
  onResume: () => void;
  onAdjust: (delta: number) => void;
  onSetTarget: (seconds: number) => void;
  onToggleMode: () => void;
  onApplyToAll: (seconds: number) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.abs(seconds) % 60;
  const sign = seconds < 0 ? '-' : '';
  return `${sign}${m}:${s.toString().padStart(2, '0')}`;
}

function formatTargetInput(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function parseTimeInput(value: string): number | null {
  const parts = value.split(':');
  if (parts.length !== 2) return null;
  const m = parseInt(parts[0]);
  const s = parseInt(parts[1]);
  if (isNaN(m) || isNaN(s) || s > 59 || m < 0 || s < 0) return null;
  return m * 60 + s;
}

export function RestTimerDrawer({
  isActive,
  displaySeconds,
  progress,
  isComplete,
  isOverTarget,
  restMode,
  restTargetSeconds,
  isPaused,
  drawerState,
  setDrawerState,
  nextExerciseName,
  nextSetReps,
  nextSetWeight,
  currentSetNumber,
  totalSets,
  soundEnabled,
  hapticsEnabled,
  onSoundToggle,
  onHapticsToggle,
  isBlockTimerBlock,
  blockTimerAutoStart,
  onBlockTimerAutoStartToggle,
  onSkip,
  onPause,
  onResume,
  onAdjust,
  onSetTarget,
  onToggleMode,
  onApplyToAll,
}: RestTimerDrawerProps) {
  const [showApplyPrompt, setShowApplyPrompt] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<number | null>(null);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const completeSoundRef = useRef<boolean>(false);

  // Fire haptic/sound on completion
  useEffect(() => {
    if (isComplete && !completeSoundRef.current) {
      completeSoundRef.current = true;
      if (hapticsEnabled && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      if (soundEnabled) {
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.value = 0.15;
          osc.start();
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.stop(ctx.currentTime + 0.5);
        } catch {}
      }
    }
    if (!isComplete) {
      completeSoundRef.current = false;
    }
  }, [isComplete, soundEnabled, hapticsEnabled]);

  // Subtle haptic on rest start
  useEffect(() => {
    if (isActive && hapticsEnabled && navigator.vibrate) {
      navigator.vibrate(30);
    }
  }, [isActive]);

  const handleAdjust = useCallback((delta: number) => {
    if (hapticsEnabled && navigator.vibrate) navigator.vibrate(10);
    onAdjust(delta);
    setPendingTarget(Math.max(0, restTargetSeconds + delta));
    setShowApplyPrompt(true);
  }, [onAdjust, restTargetSeconds, hapticsEnabled]);

  const handleTargetSubmit = useCallback(() => {
    const parsed = parseTimeInput(targetInput);
    if (parsed !== null && parsed > 0) {
      onSetTarget(parsed);
      setPendingTarget(parsed);
      setShowApplyPrompt(true);
    }
    setEditingTarget(false);
  }, [targetInput, onSetTarget]);

  const handleApplyDecision = useCallback((applyAll: boolean) => {
    if (applyAll && pendingTarget !== null) {
      onApplyToAll(pendingTarget);
    }
    setShowApplyPrompt(false);
    setPendingTarget(null);
  }, [pendingTarget, onApplyToAll]);

  const handleDrag = useCallback((_: any, info: PanInfo) => {
    if (info.offset.y > 60) {
      if (drawerState === 'expanded') setDrawerState('compact');
      else if (drawerState === 'compact') setDrawerState('floating');
    } else if (info.offset.y < -60) {
      if (drawerState === 'floating') setDrawerState('compact');
      else if (drawerState === 'compact') setDrawerState('expanded');
    }
  }, [drawerState, setDrawerState]);

  if (!isActive) return null;

  // ---- FLOATING CHIP ----
  if (drawerState === 'floating') {
    return (
      <motion.button
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        onClick={() => setDrawerState('compact')}
        onContextMenu={(e) => { e.preventDefault(); onSkip(); }}
        className={cn(
          "fixed bottom-24 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 shadow-lg border",
          isComplete
            ? "bg-accent text-accent-foreground border-accent/50"
            : "bg-card border-border/50"
        )}
      >
        <Timer className="h-4 w-4" />
        <span className={cn("text-sm font-bold tabular-nums", isComplete && "animate-pulse")}>
          {formatTime(displaySeconds)}
        </span>
      </motion.button>
    );
  }

  const ringSize = drawerState === 'expanded' ? 180 : 0;
  const ringRadius = (ringSize / 2) - 10;
  const circumference = 2 * Math.PI * ringRadius;

  return (
    <>
      {/* Backdrop - only for expanded */}
      {drawerState === 'expanded' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-foreground/20"
          onClick={() => setDrawerState('compact')}
        />
      )}

      {/* Drawer */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDrag}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl border-t border-border/30 shadow-xl",
          drawerState === 'expanded' ? 'max-h-[85vh]' : 'max-h-[40vh]'
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* ---- COMPACT MODE ---- */}
        {drawerState === 'compact' && (
          <div className="px-4 pb-safe">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setDrawerState('expanded')} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ChevronUp className="h-3.5 w-3.5" />
                Expand
              </button>
              <p className="text-xs text-muted-foreground">
                {restMode === 'countdown' ? 'Rest' : 'Elapsed'}
              </p>
              <button onClick={() => setDrawerState('floating')} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Minimize
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Timer display */}
            <div className="text-center mb-3">
              <p className={cn(
                "text-4xl font-bold tabular-nums tracking-tight",
                isComplete && "text-accent animate-pulse"
              )}>
                {formatTime(displaySeconds)}
              </p>
              {isComplete && (
                <p className="text-xs text-accent mt-1">Rest complete</p>
              )}
              {isOverTarget && (
                <p className="text-xs text-status-warning mt-1">Over target by {formatTime(displaySeconds - restTargetSeconds)}</p>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <button onClick={isPaused ? onResume : onPause} className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
              <Button onClick={onSkip} variant="secondary" size="sm" className="rounded-full gap-1.5 h-10 px-5">
                <SkipForward className="h-4 w-4" />
                Skip
              </Button>
            </div>

            {/* Block timer auto-start toggle (compact) */}
            {isBlockTimerBlock && onBlockTimerAutoStartToggle && (
              <div className="flex items-center justify-between bg-muted/50 rounded-xl px-3 py-2 border border-border/30 mb-2">
                <div className="flex items-center gap-2">
                  <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs">Auto-start interval</span>
                </div>
                <Switch checked={blockTimerAutoStart ?? true} onCheckedChange={onBlockTimerAutoStartToggle} />
              </div>
            )}

            {/* Next set preview */}
            {nextExerciseName && (
              <div className="bg-muted/50 rounded-xl p-3 border border-border/30">
                <p className="text-xs text-muted-foreground mb-0.5">Up next</p>
                <p className="font-medium text-sm">{nextExerciseName}</p>
                <p className="text-xs text-muted-foreground">
                  {currentSetNumber && totalSets ? `Set ${currentSetNumber} of ${totalSets}` : ''}
                  {nextSetReps ? ` · ${nextSetReps} reps` : ''}
                  {nextSetWeight ? ` · ${nextSetWeight}kg` : ''}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ---- EXPANDED MODE ---- */}
        {drawerState === 'expanded' && (
          <div className="px-4 pb-safe overflow-y-auto max-h-[80vh]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Rest Timer</p>
              <button onClick={() => setDrawerState('compact')} className="text-xs text-muted-foreground flex items-center gap-1">
                <ChevronDown className="h-3.5 w-3.5" />
                Compact
              </button>
            </div>

            {/* Ring timer */}
            <div className="flex justify-center mb-4">
              <div className="relative" style={{ width: ringSize, height: ringSize }}>
                <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${ringSize} ${ringSize}`}>
                  <circle
                    cx={ringSize / 2} cy={ringSize / 2} r={ringRadius}
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="6"
                  />
                  <circle
                    cx={ringSize / 2} cy={ringSize / 2} r={ringRadius}
                    fill="none"
                    stroke={isComplete ? 'hsl(var(--accent-primary))' : 'hsl(var(--accent-primary))'}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - progress)}
                    className="transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className={cn(
                    "text-4xl font-bold tabular-nums",
                    isComplete && "text-accent"
                  )}>
                    {formatTime(displaySeconds)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {restMode === 'countdown' ? 'remaining' : 'elapsed'}
                  </p>
                </div>
              </div>
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <button
                onClick={() => handleAdjust(-15)}
                className="h-11 w-11 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
              >
                <span className="text-xs font-semibold">-15</span>
              </button>
              <button
                onClick={isPaused ? onResume : onPause}
                className="h-14 w-14 rounded-full bg-accent text-accent-foreground flex items-center justify-center active:scale-95 transition-transform shadow-md"
              >
                {isPaused ? <Play className="h-6 w-6 ml-0.5" /> : <Pause className="h-6 w-6" />}
              </button>
              <button
                onClick={() => handleAdjust(15)}
                className="h-11 w-11 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
              >
                <span className="text-xs font-semibold">+15</span>
              </button>
            </div>

            {/* Extra adjust + skip */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <button onClick={() => handleAdjust(-30)} className="px-3 py-1.5 rounded-full bg-muted text-xs font-medium">-30s</button>
              <button onClick={() => handleAdjust(30)} className="px-3 py-1.5 rounded-full bg-muted text-xs font-medium">+30s</button>
              <button onClick={() => handleAdjust(60)} className="px-3 py-1.5 rounded-full bg-muted text-xs font-medium">+60s</button>
              <Button onClick={onSkip} variant="outline" size="sm" className="rounded-full gap-1 h-8">
                <SkipForward className="h-3.5 w-3.5" />
                Skip
              </Button>
            </div>

            {/* Mode toggle + manual input */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={onToggleMode}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted/50 border border-border/30 text-sm"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {restMode === 'countdown' ? 'Countdown' : 'Count-up'}
              </button>
              {!editingTarget ? (
                <button
                  onClick={() => { setTargetInput(formatTargetInput(restTargetSeconds)); setEditingTarget(true); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted/50 border border-border/30 text-sm"
                >
                  <Timer className="h-3.5 w-3.5" />
                  Target: {formatTime(restTargetSeconds)}
                </button>
              ) : (
                <div className="flex-1 flex items-center gap-1">
                  <input
                    type="text"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    onBlur={handleTargetSubmit}
                    onKeyDown={(e) => e.key === 'Enter' && handleTargetSubmit()}
                    placeholder="mm:ss"
                    className="flex-1 h-10 px-3 text-center bg-muted/50 border border-border/30 rounded-xl text-sm font-mono focus:outline-none focus:border-accent/50"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Sound + Haptics toggles */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  {soundEnabled ? <Volume2 className="h-4 w-4 text-muted-foreground" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-sm">Sound</span>
                </div>
                <Switch checked={soundEnabled} onCheckedChange={onSoundToggle} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  {hapticsEnabled ? <SmartphoneNfc className="h-4 w-4 text-muted-foreground" /> : <Smartphone className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-sm">Haptics</span>
                </div>
                <Switch checked={hapticsEnabled} onCheckedChange={onHapticsToggle} />
              </div>
              {isBlockTimerBlock && onBlockTimerAutoStartToggle && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Auto-start interval</span>
                  </div>
                  <Switch checked={blockTimerAutoStart ?? true} onCheckedChange={onBlockTimerAutoStartToggle} />
                </div>
              )}
            </div>

            {/* Next set preview */}
            {nextExerciseName && (
              <div className="bg-muted/50 rounded-xl p-3 border border-border/30 mb-4">
                <p className="text-xs text-muted-foreground mb-0.5">Up next</p>
                <p className="font-medium text-sm">{nextExerciseName}</p>
                <p className="text-xs text-muted-foreground">
                  {currentSetNumber && totalSets ? `Set ${currentSetNumber} of ${totalSets}` : ''}
                  {nextSetReps ? ` · ${nextSetReps} reps` : ''}
                  {nextSetWeight ? ` · ${nextSetWeight}kg` : ''}
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Apply to all prompt */}
      <AnimatePresence>
        {showApplyPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-4 right-4 z-[60] bg-card rounded-2xl border border-border/50 shadow-xl p-4"
          >
            <p className="text-sm font-medium mb-1">Apply this rest time change to all remaining sets?</p>
            <p className="text-xs text-muted-foreground mb-3">
              New target: {formatTime(pendingTarget ?? restTargetSeconds)}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-xl"
                onClick={() => handleApplyDecision(false)}
              >
                This rest only
              </Button>
              <Button
                size="sm"
                className="flex-1 rounded-xl"
                onClick={() => handleApplyDecision(true)}
              >
                All remaining
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
