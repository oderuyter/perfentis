import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Plus, Loader2, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useExerciseLibrary } from '@/hooks/useExerciseLibrary';
import { ExerciseListItem } from '@/components/exercises/ExerciseListItem';
import { ExerciseFiltersBar } from '@/components/exercises/ExerciseFilters';
import { CreateExerciseSheet } from '@/components/exercises/CreateExerciseSheet';
import { ExerciseDetailSheet } from '@/components/exercises/ExerciseDetailSheet';
import type { Exercise } from '@/types/exercise';

interface AddExerciseSheetProps {
  onAdd: (exercise: { id: string; name: string; sets?: number; version?: number; exerciseType?: 'strength' | 'cardio' }) => void;
  onClose: () => void;
  multiSelect?: boolean;
}

export function AddExerciseSheet({ onAdd, onClose, multiSelect = false }: AddExerciseSheetProps) {
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  
  const {
    groupedExercises,
    isLoading,
    filters,
    updateFilters,
    clearFilters,
    createExercise,
    isCreating,
    deleteExercise,
  } = useExerciseLibrary();

  const handleAddExercise = (exercise: Exercise) => {
    onAdd({ 
      id: exercise.exercise_id, 
      name: exercise.name, 
      sets: 3,
      version: exercise.version,
      exerciseType: exercise.type,
    });
    if (!multiSelect) {
      onClose();
    }
  };

  const toggleSelection = (exercise: Exercise) => {
    setSelectedExercises(prev => {
      const exists = prev.find(e => e.exercise_id === exercise.exercise_id);
      if (exists) return prev.filter(e => e.exercise_id !== exercise.exercise_id);
      return [...prev, exercise];
    });
  };

  const isSelected = (exercise: Exercise) => 
    selectedExercises.some(e => e.exercise_id === exercise.exercise_id);

  const handleAddAll = () => {
    selectedExercises.forEach(ex => handleAddExercise(ex));
    setSelectedExercises([]);
    onClose();
  };

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
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-40 shadow-elevated max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="p-4 pb-0">
          <button
            onClick={onClose}
            className="absolute top-3 left-1/2 -translate-x-1/2 p-1"
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </button>
          
          <div className="flex items-center justify-between pt-4 mb-4">
            <h3 className="text-lg font-semibold">Add Exercise{multiSelect ? 's' : ''}</h3>
            <button
              onClick={() => setShowCreateSheet(true)}
              className="flex items-center gap-1.5 text-sm text-primary font-medium"
            >
              <Plus className="h-4 w-4" />
              Create
            </button>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={filters.search || ''}
              onChange={(e) => updateFilters({ search: e.target.value })}
              placeholder="Search exercises..."
              className="pl-10 h-11 rounded-xl bg-muted border-0"
            />
          </div>
          
          <ExerciseFiltersBar 
            filters={filters} 
            onUpdateFilters={updateFilters} 
            onClearFilters={clearFilters} 
          />
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 pb-safe mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : Object.keys(groupedExercises).length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              No exercises found
            </p>
          ) : (
            <div className="space-y-4 pb-4">
              {Object.entries(groupedExercises).map(([category, exercises]) => (
                <div key={category}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    {category}
                  </p>
                  <div className="space-y-2">
                    {exercises.map(exercise => (
                      <div key={exercise.id} className="relative">
                        {multiSelect && isSelected(exercise) && (
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                        <ExerciseListItem
                          exercise={exercise}
                          showAddButton={!multiSelect}
                          onClick={() => {
                            if (multiSelect) {
                              toggleSelection(exercise);
                            } else {
                              setSelectedExercise(exercise);
                            }
                          }}
                          onAdd={() => handleAddExercise(exercise)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Multi-select action bar */}
        {multiSelect && selectedExercises.length > 0 && (
          <div className="border-t border-border/50 p-4 pb-safe">
            <Button onClick={handleAddAll} className="w-full h-12 rounded-xl font-semibold gap-2">
              <Plus className="h-5 w-5" />
              Add {selectedExercises.length} Exercise{selectedExercises.length > 1 ? 's' : ''}
            </Button>
          </div>
        )}
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
            onDelete={selectedExercise.source === 'user' ? () => deleteExercise(selectedExercise.exercise_id) : undefined}
            showAddButton
            onAdd={() => {
              handleAddExercise(selectedExercise);
              setSelectedExercise(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
