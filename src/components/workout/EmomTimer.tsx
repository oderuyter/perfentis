// EMOM Active Workout Timer Component
import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Timer, Play, Pause, SkipForward, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EmomSettings } from "@/types/workout-blocks";

interface EmomTimerProps {
  settings: EmomSettings;
  exerciseCount: number;
  onMinuteChange: (minute: number, exerciseIndex: number) => void;
  onComplete: () => void;
  onTick?: (secondsRemaining: number) => void;
  className?: string;
}

export function EmomTimer({
  settings,
  exerciseCount,
  onMinuteChange,
  onComplete,
  onTick,
  className,
}: EmomTimerProps) {
  const [currentRound, setCurrentRound] = useState(1);
  const [secondsInMinute, setSecondsInMinute] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [restSeconds, setRestSeconds] = useState(settings.rest_seconds || 0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalRounds = settings.rounds;
  const currentExerciseIndex = settings.rotation_mode === 'rotate'
    ? (currentRound - 1) % exerciseCount
    : 0;

  useEffect(() => {
    onMinuteChange(currentRound, currentExerciseIndex);
  }, [currentRound, currentExerciseIndex]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      if (isResting) {
        setRestSeconds(prev => {
          if (prev <= 1) {
            setIsResting(false);
            setSecondsInMinute(60);
            return settings.rest_seconds || 0;
          }
          return prev - 1;
        });
      } else {
        setSecondsInMinute(prev => {
          if (prev <= 1) {
            // Minute over
            if (currentRound >= totalRounds) {
              setIsRunning(false);
              onComplete();
              return 0;
            }
            // Rest between rounds
            if (settings.rest_seconds > 0) {
              setIsResting(true);
              setRestSeconds(settings.rest_seconds);
            } else {
              setSecondsInMinute(60);
            }
            setCurrentRound(r => r + 1);
            return settings.rest_seconds > 0 ? 0 : 60;
          }
          onTick?.(prev - 1);
          return prev - 1;
        });
      }
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, isResting, currentRound, totalRounds, settings.rest_seconds]);

  const skipToNext = () => {
    if (currentRound >= totalRounds) {
      setIsRunning(false);
      onComplete();
      return;
    }
    setCurrentRound(r => r + 1);
    setSecondsInMinute(60);
    setIsResting(false);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-xl border border-amber-500/30 bg-amber-500/5 p-4", className)}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
          <Timer className="h-4 w-4 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">EMOM</p>
          <p className="text-xs text-muted-foreground">
            Minute {currentRound} of {totalRounds}
          </p>
        </div>
        <Badge variant="outline" className="border-amber-500/30 text-amber-600">
          {settings.rotation_mode === 'rotate' ? `Ex ${String.fromCharCode(65 + currentExerciseIndex)}` : 'All'}
        </Badge>
      </div>

      {/* Big Timer */}
      <div className="text-center mb-4">
        <p className={cn(
          "text-5xl font-mono font-bold tabular-nums",
          isResting ? "text-blue-500" : secondsInMinute <= 10 ? "text-red-500" : "text-foreground"
        )}>
          {isResting ? formatTime(restSeconds) : formatTime(secondsInMinute)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {isResting ? "Rest" : "Work"}
        </p>
      </div>

      {/* Round progress */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: totalRounds }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all",
              i < currentRound - 1 ? "bg-amber-500" :
              i === currentRound - 1 ? "bg-amber-500/60" :
              "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={skipToNext}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
