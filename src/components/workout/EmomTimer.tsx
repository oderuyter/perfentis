// EMOM Timer — "Every Minute On the Minute" work timer
// Shows how much time the athlete has to complete their work in the current interval
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Play, Pause, SkipForward, ArrowUpDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UseEmomTimerReturn } from "./BlockTimerTypes";

function formatTime(s: number) {
  const mins = Math.floor(Math.abs(s) / 60);
  const secs = Math.abs(s) % 60;
  return `${s < 0 ? "-" : ""}${mins}:${secs.toString().padStart(2, "0")}`;
}

interface EmomTimerProps {
  timer: UseEmomTimerReturn;
  exerciseNames?: string[];
  className?: string;
}

export function EmomTimer({ timer, exerciseNames = [], className }: EmomTimerProps) {
  const { timerState, derived, isRunning, isStarted, start, pause, resume, toggleMode, skipToNextRound } = timer;
  const { current_round_index, rounds_total, interval_seconds, timer_mode, current_item_index } = timerState;

  // Work time remaining in the current interval (primary display)
  const workRemaining = derived.current_interval_remaining;
  const workElapsed = derived.current_interval_elapsed;
  const displaySeconds = timer_mode === "countdown" ? workRemaining : workElapsed;

  // Progress within current interval (0→1)
  const intervalProgress = interval_seconds > 0 ? workElapsed / interval_seconds : 0;

  // Urgency thresholds
  const isUrgent = workRemaining <= 5 && workRemaining > 0;
  const isWarning = workRemaining <= 15 && workRemaining > 5;

  // Flash effect when a new round starts
  const [flashRound, setFlashRound] = useState(false);
  const prevRoundRef = useRef(current_round_index);
  useEffect(() => {
    if (current_round_index !== prevRoundRef.current && isRunning) {
      prevRoundRef.current = current_round_index;
      setFlashRound(true);
      const t = setTimeout(() => setFlashRound(false), 600);
      return () => clearTimeout(t);
    }
  }, [current_round_index, isRunning]);

  const currentExName = exerciseNames[current_item_index] || `Exercise ${String.fromCharCode(65 + current_item_index)}`;
  const nextExName = exerciseNames[(current_round_index) % exerciseNames.length] || "—";

  const handleSkip = () => {
    if (current_round_index >= rounds_total) {
      if (confirm("End EMOM block?")) skipToNextRound();
    } else {
      skipToNextRound();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border p-4 transition-colors duration-300",
        derived.is_completed
          ? "border-emerald-500/30 bg-emerald-500/5"
          : isUrgent
          ? "border-red-500/40 bg-red-500/5"
          : isWarning
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-amber-500/20 bg-amber-500/5",
        className
      )}
    >
      {/* Header: EMOM label + round counter */}
      <div className="flex items-center gap-2 mb-3">
        <div className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
          isUrgent ? "bg-red-500/20" : "bg-amber-500/20"
        )}>
          <Timer className={cn("h-4 w-4", isUrgent ? "text-red-500" : "text-amber-600")} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold tracking-wide">EMOM</p>
          <p className="text-xs text-muted-foreground">
            Round {current_round_index} of {rounds_total} · {interval_seconds}s intervals
          </p>
        </div>
      </div>

      {/* Active work phase badge + exercise */}
      {isStarted && !derived.is_completed && (
        <AnimatePresence mode="wait">
          <motion.div
            key={current_round_index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center justify-center gap-2 mb-3"
          >
            <Badge className={cn(
              "gap-1.5 text-xs font-semibold px-3 py-1",
              isUrgent
                ? "bg-red-500/20 text-red-500 border-red-500/30"
                : "bg-amber-500/20 text-amber-600 border-amber-500/30"
            )} variant="outline">
              <Zap className="h-3 w-3" />
              WORK — {currentExName}
            </Badge>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Big work timer */}
      <div className="text-center mb-2">
        <AnimatePresence mode="wait">
          {derived.is_completed ? (
            <motion.p
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-5xl font-mono font-bold text-emerald-500"
            >
              Done ✓
            </motion.p>
          ) : (
            <motion.p
              key={`timer-${flashRound ? "flash" : "normal"}`}
              initial={flashRound ? { scale: 1.1, color: "hsl(var(--primary))" } : {}}
              animate={{ scale: 1 }}
              className={cn(
                "text-5xl font-mono font-bold tabular-nums transition-colors duration-300",
                isUrgent ? "text-red-500" :
                isWarning ? "text-amber-500" :
                "text-foreground"
              )}
            >
              {formatTime(Math.round(displaySeconds))}
            </motion.p>
          )}
        </AnimatePresence>
        {!derived.is_completed && (
          <p className="text-xs text-muted-foreground mt-1">
            {timer_mode === "countdown" ? "work time remaining" : "work time elapsed"}
          </p>
        )}
      </div>

      {/* Interval progress bar */}
      {isStarted && !derived.is_completed && (
        <div className="w-full h-2 bg-muted rounded-full mb-3 overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full transition-colors duration-300",
              isUrgent ? "bg-red-500" :
              isWarning ? "bg-amber-500" :
              "bg-amber-500/70"
            )}
            style={{ width: `${Math.min(100, intervalProgress * 100)}%` }}
            transition={{ duration: 0.25 }}
          />
        </div>
      )}

      {/* Total time */}
      {isStarted && (
        <p className="text-center text-xs text-muted-foreground mb-3 tabular-nums">
          Total elapsed: {formatTime(Math.round(derived.elapsed_seconds))} / {formatTime(rounds_total * interval_seconds)}
        </p>
      )}

      {/* Round progress dots */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: rounds_total }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all",
              i < current_round_index - 1 ? "bg-amber-500" :
              i === current_round_index - 1
                ? (isUrgent ? "bg-red-500/60" : "bg-amber-500/60")
                : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Next exercise preview */}
      {timerState.rotation_mode === "rotate" && exerciseNames.length > 1 && !derived.is_completed && (
        <div className="bg-background/60 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-muted-foreground">
            Next up: <span className="font-medium text-foreground">{nextExName}</span>
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {!isStarted ? (
          <Button onClick={start} size="lg" className="gap-2 rounded-full px-8">
            <Play className="h-4 w-4" />Start EMOM
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={isRunning ? pause : resume}
            >
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={handleSkip}
              disabled={derived.is_completed}
              title="Skip to next round"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={toggleMode}
              title={timer_mode === "countdown" ? "Switch to count-up" : "Switch to countdown"}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}
