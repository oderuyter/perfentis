import { motion } from 'framer-motion';
import { ChevronDown, Check, CircleDashed, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActiveExercise } from '@/types/workout';

interface ExerciseNavProps {
  exercises: ActiveExercise[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  onClose: () => void;
}

export function ExerciseNav({ exercises, currentIndex, onSelect, onRemove, onClose }: ExerciseNavProps) {
  const activeExercises = exercises.filter(ex => !ex.skipped);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 shadow-elevated max-h-[70vh] overflow-hidden flex flex-col"
      >
        <div className="p-4 pb-0">
          <button
            onClick={onClose}
            className="absolute top-3 left-1/2 -translate-x-1/2 p-1"
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </button>
          
          <h3 className="text-lg font-semibold text-center pt-4 mb-4">Exercises</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 pb-safe">
          <div className="space-y-2 pb-4">
            {exercises.map((exercise, index) => {
              if (exercise.skipped) return null;
              
              const completedSets = exercise.sets.filter(s => s.completed).length;
              const totalSets = exercise.sets.length;
              const isComplete = completedSets === totalSets;
              const isCurrent = index === currentIndex;
              
              return (
                <div
                  key={exercise.exerciseId + index}
                  className={cn(
                    "rounded-xl p-3 border transition-all flex items-center gap-3",
                    isCurrent && "bg-primary/5 border-primary/20",
                    !isCurrent && isComplete && "bg-muted/30 border-border/30",
                    !isCurrent && !isComplete && "bg-card border-border/50"
                  )}
                >
                  <button
                    onClick={() => {
                      onSelect(index);
                      onClose();
                    }}
                    className="flex-1 flex items-center gap-3 text-left"
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                      isComplete && "bg-primary text-primary-foreground",
                      !isComplete && "bg-muted"
                    )}>
                      {isComplete ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">
                          {index + 1}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium text-sm truncate",
                        isComplete && "text-muted-foreground"
                      )}>
                        {exercise.name}
                        {exercise.addedMidWorkout && (
                          <span className="text-xs text-primary ml-2">Added</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {completedSets}/{totalSets} sets
                      </p>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => onRemove(index)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </>
  );
}
