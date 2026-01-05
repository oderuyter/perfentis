import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ArrowDown, Equal, ArrowUp, Search, Plus, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useExerciseLibrary } from '@/hooks/useExerciseLibrary';
import { ExerciseListItem } from '@/components/exercises/ExerciseListItem';
import { CreateExerciseSheet } from '@/components/exercises/CreateExerciseSheet';
import { ExerciseDetailSheet } from '@/components/exercises/ExerciseDetailSheet';
import type { Exercise, MuscleGroup } from '@/types/exercise';
import type { ExerciseAlternative } from '@/types/workout';

interface SwapExerciseSheetProps {
  currentExercise: string;
  currentMuscleGroup?: string;
  onSwap: (exercise: ExerciseAlternative) => void;
  onClose: () => void;
}

// Categorize exercises by difficulty relative to common exercises
const EASIER_EQUIPMENT = ['machine', 'cable', 'bodyweight'];
const HARDER_EQUIPMENT = ['barbell'];

function categorizeDifficulty(exercise: Exercise): 'easier' | 'same' | 'harder' {
  const equipment = exercise.equipment || [];
  
  if (equipment.some(eq => EASIER_EQUIPMENT.includes(eq)) && !equipment.includes('barbell')) {
    return 'easier';
  }
  if (equipment.includes('barbell') && !equipment.some(eq => EASIER_EQUIPMENT.includes(eq))) {
    return 'harder';
  }
  return 'same';
}

export function SwapExerciseSheet({ currentExercise, currentMuscleGroup, onSwap, onClose }: SwapExerciseSheetProps) {
  const [search, setSearch] = useState('');
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  
  const { 
    allExercises, 
    getExercisesByMuscle, 
    isLoading,
    createExercise,
    isCreating,
  } = useExerciseLibrary();

  // Get alternatives based on muscle group
  const alternatives = useMemo(() => {
    if (!currentMuscleGroup) {
      // If no muscle group, just show all strength exercises
      return allExercises.filter(e => 
        e.type === 'strength' && 
        e.name.toLowerCase() !== currentExercise.toLowerCase()
      );
    }
    
    return getExercisesByMuscle(currentMuscleGroup);
  }, [allExercises, currentMuscleGroup, currentExercise, getExercisesByMuscle]);

  // Filter by search and categorize
  const { easier, same, harder } = useMemo(() => {
    const filtered = alternatives.filter(e => 
      !search || e.name.toLowerCase().includes(search.toLowerCase())
    );
    
    return {
      easier: filtered.filter(e => categorizeDifficulty(e) === 'easier'),
      same: filtered.filter(e => categorizeDifficulty(e) === 'same'),
      harder: filtered.filter(e => categorizeDifficulty(e) === 'harder'),
    };
  }, [alternatives, search]);

  const handleSwap = (exercise: Exercise) => {
    onSwap({
      id: exercise.exercise_id,
      name: exercise.name,
      difficulty: categorizeDifficulty(exercise),
      muscleGroup: exercise.primary_muscle || 'unknown',
    });
    onClose();
  };

  const hasResults = easier.length > 0 || same.length > 0 || harder.length > 0;

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
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-40 shadow-elevated max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="p-4 pb-0">
          <button
            onClick={onClose}
            className="absolute top-3 left-1/2 -translate-x-1/2 p-1"
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </button>
          
          <div className="flex items-center justify-between pt-4 mb-1">
            <h3 className="text-lg font-semibold">Swap Exercise</h3>
            <button
              onClick={() => setShowCreateSheet(true)}
              className="flex items-center gap-1.5 text-sm text-primary font-medium"
            >
              <Plus className="h-4 w-4" />
              Create
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Replace {currentExercise}
          </p>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search alternatives..."
              className="pl-10 h-11 rounded-xl bg-muted border-0"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 pb-safe">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !hasResults ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              No alternatives found
            </p>
          ) : (
            <div className="space-y-4 pb-4">
              {/* Easier */}
              {easier.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDown className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Easier
                    </span>
                  </div>
                  <div className="space-y-2">
                    {easier.map(exercise => (
                      <ExerciseListItem
                        key={exercise.id}
                        exercise={exercise}
                        onClick={() => setSelectedExercise(exercise)}
                        onAdd={() => handleSwap(exercise)}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Same Difficulty */}
              {same.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Equal className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Similar
                    </span>
                  </div>
                  <div className="space-y-2">
                    {same.map(exercise => (
                      <ExerciseListItem
                        key={exercise.id}
                        exercise={exercise}
                        onClick={() => setSelectedExercise(exercise)}
                        onAdd={() => handleSwap(exercise)}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Harder */}
              {harder.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUp className="h-3.5 w-3.5 text-orange-500" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Harder
                    </span>
                  </div>
                  <div className="space-y-2">
                    {harder.map(exercise => (
                      <ExerciseListItem
                        key={exercise.id}
                        exercise={exercise}
                        onClick={() => setSelectedExercise(exercise)}
                        onAdd={() => handleSwap(exercise)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
      
      <AnimatePresence>
        {showCreateSheet && (
          <CreateExerciseSheet
            onClose={() => setShowCreateSheet(false)}
            onCreate={createExercise}
            isCreating={isCreating}
          />
        )}
        
        {selectedExercise && (
          <ExerciseDetailSheet
            exercise={selectedExercise}
            onClose={() => setSelectedExercise(null)}
            showAddButton
            onAdd={() => {
              handleSwap(selectedExercise);
              setSelectedExercise(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
