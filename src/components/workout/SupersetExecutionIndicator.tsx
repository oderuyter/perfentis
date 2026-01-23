// Superset execution indicator for active workout
import { motion } from "framer-motion";
import { Layers, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActiveExercise, ActiveSupersetBlock } from "@/types/workout";

interface SupersetExecutionIndicatorProps {
  currentExercise: ActiveExercise;
  superset: ActiveSupersetBlock;
  exercises: ActiveExercise[];
  className?: string;
}

export function SupersetExecutionIndicator({
  currentExercise,
  superset,
  exercises,
  className,
}: SupersetExecutionIndicatorProps) {
  const supersetExercises = exercises.filter(
    (ex) => ex.blockId === superset.id && !ex.skipped
  );
  const currentPosition = currentExercise.blockPosition || 0;
  const totalInSuperset = supersetExercises.length;
  
  // Calculate progress
  const completedInRound = currentPosition;
  const isLastInRound = currentPosition === totalInSuperset - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-3 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20",
        className
      )}
    >
      <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
        <Layers className="h-4 w-4 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">
            {superset.name || "Superset"}
          </p>
          {superset.rounds > 1 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <RotateCcw className="h-3 w-3" />
              <span>
                Round {superset.currentRound}/{superset.rounds}
              </span>
            </div>
          )}
        </div>
        
        {/* Progress dots */}
        <div className="flex items-center gap-1 mt-1">
          {supersetExercises.map((ex, i) => (
            <div
              key={ex.exerciseId}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === currentPosition
                  ? "w-4 bg-primary"
                  : i < currentPosition
                  ? "w-2 bg-primary/50"
                  : "w-2 bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      <Badge variant="secondary" className="text-xs">
        {String.fromCharCode(65 + currentPosition)} of {totalInSuperset}
      </Badge>
    </motion.div>
  );
}

// Helper to get next exercise in superset flow
export function getNextSupersetExercise(
  currentExercise: ActiveExercise,
  exercises: ActiveExercise[],
  supersets: ActiveSupersetBlock[]
): { nextExercise: ActiveExercise | null; isRoundComplete: boolean; isSupersetComplete: boolean } {
  const superset = supersets.find((s) => s.id === currentExercise.blockId);
  
  if (!superset) {
    // Not in a superset, return null
    return { nextExercise: null, isRoundComplete: false, isSupersetComplete: false };
  }

  const supersetExercises = exercises.filter(
    (ex) => ex.blockId === superset.id && !ex.skipped
  );
  const currentPosition = currentExercise.blockPosition || 0;
  const nextPosition = currentPosition + 1;

  if (nextPosition < supersetExercises.length) {
    // More exercises in this round
    const nextEx = supersetExercises.find((ex) => ex.blockPosition === nextPosition);
    return { nextExercise: nextEx || null, isRoundComplete: false, isSupersetComplete: false };
  }

  // Round complete
  if (superset.currentRound < superset.rounds) {
    // More rounds to go - wrap back to first exercise in superset
    const firstEx = supersetExercises.find((ex) => ex.blockPosition === 0);
    return { nextExercise: firstEx || null, isRoundComplete: true, isSupersetComplete: false };
  }

  // Superset complete
  return { nextExercise: null, isRoundComplete: true, isSupersetComplete: true };
}

// Get rest duration based on superset position
export function getSupersetRestDuration(
  currentExercise: ActiveExercise,
  exercises: ActiveExercise[],
  supersets: ActiveSupersetBlock[],
  isRoundComplete: boolean
): number {
  const superset = supersets.find((s) => s.id === currentExercise.blockId);
  
  if (!superset) {
    // Not in a superset, use normal rest
    return currentExercise.restDuration;
  }

  if (isRoundComplete) {
    // Rest after completing full round
    return superset.restAfterRoundSeconds;
  }

  // Rest between exercises (usually 0 for true supersets)
  return superset.restBetweenExercisesSeconds;
}

export default SupersetExecutionIndicator;
