import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AddExerciseSheetProps {
  onAdd: (exercise: { id: string; name: string; sets?: number }) => void;
  onClose: () => void;
}

// Mock exercise library - in real app, this would be from database
const exerciseLibrary = [
  { id: 'ex-1', name: 'Bench Press', category: 'Chest' },
  { id: 'ex-2', name: 'Incline Press', category: 'Chest' },
  { id: 'ex-3', name: 'Dumbbell Fly', category: 'Chest' },
  { id: 'ex-4', name: 'Squat', category: 'Legs' },
  { id: 'ex-5', name: 'Leg Press', category: 'Legs' },
  { id: 'ex-6', name: 'Romanian Deadlift', category: 'Legs' },
  { id: 'ex-7', name: 'Pull-ups', category: 'Back' },
  { id: 'ex-8', name: 'Barbell Row', category: 'Back' },
  { id: 'ex-9', name: 'Lat Pulldown', category: 'Back' },
  { id: 'ex-10', name: 'Overhead Press', category: 'Shoulders' },
  { id: 'ex-11', name: 'Lateral Raise', category: 'Shoulders' },
  { id: 'ex-12', name: 'Bicep Curl', category: 'Arms' },
  { id: 'ex-13', name: 'Tricep Extension', category: 'Arms' },
];

export function AddExerciseSheet({ onAdd, onClose }: AddExerciseSheetProps) {
  const [search, setSearch] = useState('');

  const filteredExercises = exerciseLibrary.filter(ex =>
    ex.name.toLowerCase().includes(search.toLowerCase()) ||
    ex.category.toLowerCase().includes(search.toLowerCase())
  );

  const groupedExercises = filteredExercises.reduce((groups, exercise) => {
    if (!groups[exercise.category]) {
      groups[exercise.category] = [];
    }
    groups[exercise.category].push(exercise);
    return groups;
  }, {} as Record<string, typeof exerciseLibrary>);

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
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 shadow-elevated max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="p-4 pb-0">
          <button
            onClick={onClose}
            className="absolute top-3 left-1/2 -translate-x-1/2 p-1"
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </button>
          
          <h3 className="text-lg font-semibold text-center pt-4 mb-4">Add Exercise</h3>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises..."
              className="pl-10 h-11 rounded-xl bg-muted border-0"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 pb-safe">
          <div className="space-y-4 pb-4">
            {Object.entries(groupedExercises).map(([category, exercises]) => (
              <div key={category}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {category}
                </p>
                <div className="space-y-2">
                  {exercises.map(exercise => (
                    <button
                      key={exercise.id}
                      onClick={() => {
                        onAdd({ id: exercise.id, name: exercise.name, sets: 3 });
                        onClose();
                      }}
                      className="w-full bg-muted/30 rounded-xl p-3 border border-border/30 flex items-center justify-between active:scale-[0.98] transition-transform"
                    >
                      <span className="font-medium text-sm">{exercise.name}</span>
                      <Plus className="h-4 w-4 text-primary" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            
            {filteredExercises.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">
                No exercises found
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
