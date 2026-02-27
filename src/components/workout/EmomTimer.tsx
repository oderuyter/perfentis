// EMOM Timer — timestamp-based, resilient, persisted to block_instances.context_json
import { motion } from "framer-motion";
import { Timer, Play, Pause, SkipForward, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UseEmomTimerReturn } from "./BlockTimerTypes";

function formatTime(s: number) {
  const mins = Math.floor(Math.abs(s) / 60);
  const secs = Math.abs(s) % 60;
  return `${s < 0 ? '-' : ''}${mins}:${secs.toString().padStart(2, '0')}`;
}

interface EmomTimerProps {
  timer: UseEmomTimerReturn;
  exerciseNames?: string[];
  className?: string;
}

export function EmomTimer({ timer, exerciseNames = [], className }: EmomTimerProps) {
  const { timerState, derived, isRunning, isStarted, start, pause, resume, toggleMode, skipToNextRound } = timer;
  const { current_round_index, rounds_total, interval_seconds, timer_mode, current_item_index } = timerState;

  const displaySeconds = timer_mode === "countdown"
    ? derived.current_interval_remaining
    : derived.current_interval_elapsed;

  const totalDisplaySeconds = timer_mode === "countdown"
    ? derived.remaining_seconds
    : derived.elapsed_seconds;

  const currentExName = exerciseNames[current_item_index] || `Exercise ${String.fromCharCode(65 + current_item_index)}`;

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
      className={cn("rounded-xl border border-amber-500/30 bg-amber-500/5 p-4", className)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
          <Timer className="h-4 w-4 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">EMOM</p>
          <p className="text-xs text-muted-foreground">
            Round {current_round_index} of {rounds_total}
          </p>
        </div>
        <Badge variant="outline" className="border-amber-500/30 text-amber-600">
          {currentExName}
        </Badge>
      </div>

      {/* Big interval timer */}
      <div className="text-center mb-3">
        <p className={cn(
          "text-5xl font-mono font-bold tabular-nums",
          derived.is_completed ? "text-emerald-500" :
          displaySeconds <= 5 ? "text-red-500" :
          displaySeconds <= 15 ? "text-amber-500" :
          "text-foreground"
        )}>
          {derived.is_completed ? "Done" : formatTime(Math.round(displaySeconds))}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {timer_mode === "countdown" ? "remaining in interval" : "elapsed in interval"}
        </p>
      </div>

      {/* Total time */}
      <p className="text-center text-xs text-muted-foreground mb-3 tabular-nums">
        Total: {formatTime(Math.round(totalDisplaySeconds))}
      </p>

      {/* Round progress dots */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: rounds_total }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all",
              i < current_round_index - 1 ? "bg-amber-500" :
              i === current_round_index - 1 ? "bg-amber-500/60" :
              "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Next exercise preview */}
      {timerState.rotation_mode === "rotate" && exerciseNames.length > 1 && !derived.is_completed && (
        <div className="bg-background/60 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-muted-foreground">
            Next: {exerciseNames[(current_round_index) % exerciseNames.length] || "—"}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {!isStarted ? (
          <Button onClick={start} size="lg" className="gap-2 rounded-full px-8">
            <Play className="h-4 w-4" />Start
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
