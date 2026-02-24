// AMRAP Active Workout Timer Component
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Zap, Play, Pause, Plus, Minus, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AmrapSettings } from "@/types/workout-blocks";

interface AmrapTimerProps {
  settings: AmrapSettings;
  onComplete: (score: { rounds: number; reps: number }) => void;
  onTick?: (secondsRemaining: number) => void;
  className?: string;
}

export function AmrapTimer({
  settings,
  onComplete,
  onTick,
  className,
}: AmrapTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(settings.time_cap_seconds);
  const [isRunning, setIsRunning] = useState(false);
  const [roundsCompleted, setRoundsCompleted] = useState(0);
  const [repsInRound, setRepsInRound] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef(0);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (startTimeRef.current) {
        elapsedBeforePauseRef.current += (Date.now() - startTimeRef.current) / 1000;
        startTimeRef.current = null;
      }
      return;
    }

    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = elapsedBeforePauseRef.current + (Date.now() - (startTimeRef.current || Date.now())) / 1000;
      const remaining = Math.max(0, settings.time_cap_seconds - Math.floor(elapsed));
      setSecondsRemaining(remaining);
      onTick?.(remaining);

      if (remaining <= 0) {
        setIsRunning(false);
        onComplete({ rounds: roundsCompleted, reps: repsInRound });
      }
    }, 250);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, settings.time_cap_seconds, roundsCompleted, repsInRound]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = 1 - (secondsRemaining / settings.time_cap_seconds);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-xl border border-red-500/30 bg-red-500/5 p-4", className)}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-red-500/20 flex items-center justify-center">
          <Zap className="h-4 w-4 text-red-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">AMRAP</p>
          <p className="text-xs text-muted-foreground">
            {Math.floor(settings.time_cap_seconds / 60)} min cap
          </p>
        </div>
        {settings.rest_enabled && (
          <Button
            variant="ghost"
            size="sm"
            className={cn("gap-1", isResting && "text-blue-500")}
            onClick={() => setIsResting(!isResting)}
          >
            <Coffee className="h-3 w-3" />
            Rest
          </Button>
        )}
      </div>

      {/* Big countdown */}
      <div className="text-center mb-4">
        <p className={cn(
          "text-5xl font-mono font-bold tabular-nums",
          secondsRemaining <= 30 ? "text-red-500 animate-pulse" :
          secondsRemaining <= 60 ? "text-amber-500" :
          "text-foreground"
        )}>
          {formatTime(secondsRemaining)}
        </p>
        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Score tracking */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-background/80 rounded-lg p-3 text-center border border-border/50">
          <p className="text-xs text-muted-foreground mb-1">Rounds</p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRoundsCompleted(Math.max(0, roundsCompleted - 1))}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-2xl font-bold tabular-nums w-8 text-center">{roundsCompleted}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRoundsCompleted(roundsCompleted + 1)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="bg-background/80 rounded-lg p-3 text-center border border-border/50">
          <p className="text-xs text-muted-foreground mb-1">+ Reps</p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRepsInRound(Math.max(0, repsInRound - 1))}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-2xl font-bold tabular-nums w-8 text-center">{repsInRound}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRepsInRound(repsInRound + 1)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant={isRunning ? "outline" : "default"}
          size="lg"
          className="gap-2 rounded-full px-8"
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? <><Pause className="h-4 w-4" />Pause</> : <><Play className="h-4 w-4" />Start</>}
        </Button>
      </div>
    </motion.div>
  );
}
