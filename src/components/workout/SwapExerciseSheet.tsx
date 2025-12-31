import { motion } from 'framer-motion';
import { ChevronDown, ArrowDown, Equal, ArrowUp } from 'lucide-react';
import type { ExerciseAlternative } from '@/types/workout';

interface SwapExerciseSheetProps {
  currentExercise: string;
  onSwap: (exercise: ExerciseAlternative) => void;
  onClose: () => void;
}

// Mock alternatives - in real app, these would be fetched based on muscle group
const mockAlternatives: ExerciseAlternative[] = [
  { id: 'alt-1', name: 'Machine Chest Press', difficulty: 'easier', muscleGroup: 'Chest' },
  { id: 'alt-2', name: 'Push-ups', difficulty: 'easier', muscleGroup: 'Chest' },
  { id: 'alt-3', name: 'Dumbbell Bench Press', difficulty: 'same', muscleGroup: 'Chest' },
  { id: 'alt-4', name: 'Incline Bench Press', difficulty: 'same', muscleGroup: 'Chest' },
  { id: 'alt-5', name: 'Weighted Dips', difficulty: 'harder', muscleGroup: 'Chest' },
  { id: 'alt-6', name: 'Pause Bench Press', difficulty: 'harder', muscleGroup: 'Chest' },
];

export function SwapExerciseSheet({ currentExercise, onSwap, onClose }: SwapExerciseSheetProps) {
  const easier = mockAlternatives.filter(a => a.difficulty === 'easier');
  const same = mockAlternatives.filter(a => a.difficulty === 'same');
  const harder = mockAlternatives.filter(a => a.difficulty === 'harder');

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
          
          <h3 className="text-lg font-semibold text-center pt-4 mb-1">Swap Exercise</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Replace {currentExercise}
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 pb-safe">
          <div className="space-y-4 pb-4">
            {/* Easier */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ArrowDown className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Easier
                </span>
              </div>
              <div className="space-y-2">
                {easier.map(alt => (
                  <ExerciseOption key={alt.id} exercise={alt} onSelect={onSwap} />
                ))}
              </div>
            </div>
            
            {/* Same Difficulty */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Equal className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Similar
                </span>
              </div>
              <div className="space-y-2">
                {same.map(alt => (
                  <ExerciseOption key={alt.id} exercise={alt} onSelect={onSwap} />
                ))}
              </div>
            </div>
            
            {/* Harder */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ArrowUp className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Harder
                </span>
              </div>
              <div className="space-y-2">
                {harder.map(alt => (
                  <ExerciseOption key={alt.id} exercise={alt} onSelect={onSwap} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function ExerciseOption({ 
  exercise, 
  onSelect 
}: { 
  exercise: ExerciseAlternative; 
  onSelect: (ex: ExerciseAlternative) => void 
}) {
  return (
    <button
      onClick={() => onSelect(exercise)}
      className="w-full bg-muted/30 rounded-xl p-3 border border-border/30 text-left active:scale-[0.98] transition-transform"
    >
      <span className="font-medium text-sm">{exercise.name}</span>
    </button>
  );
}
