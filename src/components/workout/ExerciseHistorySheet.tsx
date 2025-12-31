import { motion } from 'framer-motion';
import { ChevronDown, TrendingUp } from 'lucide-react';
import { calculateOneRM } from '@/types/workout';

interface ExerciseHistorySheetProps {
  exerciseName: string;
  currentWeight: number | null;
  currentReps: number | null;
  onClose: () => void;
}

// Mock history data - in real app, this would come from database
const mockHistory = [
  { date: 'Dec 28', sets: [{ weight: 80, reps: 6 }, { weight: 80, reps: 6 }, { weight: 80, reps: 5 }, { weight: 77.5, reps: 6 }] },
  { date: 'Dec 24', sets: [{ weight: 77.5, reps: 7 }, { weight: 77.5, reps: 6 }, { weight: 77.5, reps: 6 }, { weight: 75, reps: 7 }] },
  { date: 'Dec 20', sets: [{ weight: 77.5, reps: 6 }, { weight: 75, reps: 7 }, { weight: 75, reps: 7 }, { weight: 75, reps: 6 }] },
];

export function ExerciseHistorySheet({ exerciseName, currentWeight, currentReps, onClose }: ExerciseHistorySheetProps) {
  const estimatedOneRM = currentWeight && currentReps 
    ? calculateOneRM(currentWeight, currentReps) 
    : null;

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
          
          <h3 className="text-lg font-semibold text-center pt-4 mb-4">{exerciseName}</h3>
          
          {/* Estimated 1RM */}
          {estimatedOneRM && (
            <div className="bg-primary/5 rounded-xl p-4 mb-4 border border-primary/10">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-primary uppercase tracking-wide">
                  Estimated 1RM
                </span>
              </div>
              <p className="text-3xl font-bold">{estimatedOneRM} kg</p>
              <p className="text-xs text-muted-foreground mt-1">
                Based on {currentWeight} kg × {currentReps} reps (Epley formula)
              </p>
            </div>
          )}
          
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Recent Sessions
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 pb-safe">
          <div className="space-y-3 pb-4">
            {mockHistory.map((session, index) => {
              const bestSet = session.sets.reduce((best, set) => 
                (set.weight * set.reps > best.weight * best.reps) ? set : best
              , session.sets[0]);
              const sessionOneRM = calculateOneRM(bestSet.weight, bestSet.reps);
              
              return (
                <div key={index} className="bg-muted/30 rounded-xl p-3 border border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{session.date}</span>
                    <span className="text-xs text-muted-foreground">
                      Est. 1RM: {sessionOneRM} kg
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {session.sets.map((set, setIndex) => (
                      <span
                        key={setIndex}
                        className="text-xs bg-background rounded px-2 py-1"
                      >
                        {set.weight} × {set.reps}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </>
  );
}
