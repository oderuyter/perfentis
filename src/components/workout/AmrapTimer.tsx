// AMRAP Timer — timestamp-based, resilient, persisted to block_instances.context_json
import { motion } from "framer-motion";
import { Zap, Play, Pause, Plus, Minus, ArrowUpDown, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UseAmrapTimerReturn } from "./BlockTimerTypes";

function formatTime(s: number) {
  const mins = Math.floor(Math.abs(s) / 60);
  const secs = Math.abs(s) % 60;
  return `${s < 0 ? '-' : ''}${mins}:${secs.toString().padStart(2, '0')}`;
}

interface AmrapTimerProps {
  timer: UseAmrapTimerReturn;
  className?: string;
}

export function AmrapTimer({ timer, className }: AmrapTimerProps) {
  const {
    timerState, elapsed, remaining, progress, isCompleted,
    isRunning, isStarted, start, pause, resume, toggleMode, updateScore, endEarly,
  } = timer;

  const displaySeconds = timerState.timer_mode === "countdown" ? remaining : elapsed;

  const handleEndEarly = () => {
    if (confirm("End AMRAP early? Your current score will be saved.")) {
      endEarly();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-xl border border-red-500/30 bg-red-500/5 p-4", className)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-red-500/20 flex items-center justify-center">
          <Zap className="h-4 w-4 text-red-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">AMRAP</p>
          <p className="text-xs text-muted-foreground">
            {Math.floor(timerState.time_cap_seconds / 60)} min cap
          </p>
        </div>
      </div>

      {/* Big countdown / countup */}
      <div className="text-center mb-4">
        <p className={cn(
          "text-5xl font-mono font-bold tabular-nums",
          isCompleted ? "text-emerald-500" :
          remaining <= 30 ? "text-red-500 animate-pulse" :
          remaining <= 60 ? "text-amber-500" :
          "text-foreground"
        )}>
          {isCompleted ? "Time!" : formatTime(Math.round(displaySeconds))}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {timerState.timer_mode === "countdown" ? "remaining" : "elapsed"}
        </p>
        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
      </div>

      {/* Score tracking */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-background/80 rounded-lg p-3 text-center border border-border/50">
          <p className="text-xs text-muted-foreground mb-1">Rounds</p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => updateScore(Math.max(0, timerState.rounds_completed - 1), timerState.reps_in_current_round)}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-2xl font-bold tabular-nums w-8 text-center">{timerState.rounds_completed}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => updateScore(timerState.rounds_completed + 1, timerState.reps_in_current_round)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="bg-background/80 rounded-lg p-3 text-center border border-border/50">
          <p className="text-xs text-muted-foreground mb-1">+ Reps</p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => updateScore(timerState.rounds_completed, Math.max(0, timerState.reps_in_current_round - 1))}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-2xl font-bold tabular-nums w-8 text-center">{timerState.reps_in_current_round}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => updateScore(timerState.rounds_completed, timerState.reps_in_current_round + 1)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {!isStarted ? (
          <Button onClick={start} size="lg" className="gap-2 rounded-full px-8">
            <Play className="h-4 w-4" />Start
          </Button>
        ) : (
          <>
            <Button
              variant={isRunning ? "outline" : "default"}
              size="lg"
              className="gap-2 rounded-full px-6"
              onClick={isRunning ? pause : resume}
              disabled={isCompleted}
            >
              {isRunning ? <><Pause className="h-4 w-4" />Pause</> : <><Play className="h-4 w-4" />Resume</>}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={toggleMode}
              title={timerState.timer_mode === "countdown" ? "Switch to count-up" : "Switch to countdown"}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
            {!isCompleted && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full text-destructive"
                onClick={handleEndEarly}
                title="End AMRAP early"
              >
                <Square className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
