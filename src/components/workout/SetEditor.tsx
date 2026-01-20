import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Minus, Plus, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExerciseSet } from '@/types/workout';

interface SetEditorProps {
  sets: ExerciseSet[];
  currentSetIndex: number;
  onUpdateSet: (setIndex: number, updates: Partial<ExerciseSet>) => void;
  onSelectSet: (setIndex: number) => void;
}

export function SetEditor({ sets, currentSetIndex, onUpdateSet, onSelectSet }: SetEditorProps) {
  // Current set is always in edit mode
  const [editingSet, setEditingSet] = useState<number | null>(null);

  // Auto-open edit mode for current set when it changes
  useEffect(() => {
    setEditingSet(null);
  }, [currentSetIndex]);

  return (
    <div className="space-y-2">
      {sets.map((set, index) => {
        const isCompleted = set.completed;
        const isCurrent = index === currentSetIndex;
        const isRemaining = index > currentSetIndex && !isCompleted;
        const isEditing = editingSet === index;

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "rounded-xl p-3 border transition-all",
              // Completed sets
              isCompleted && "bg-accent-subtle/50 border-accent/30",
              // Current/active set - highlighted with gradient
              isCurrent && !isCompleted && "gradient-card-accent border-accent shadow-md ring-2 ring-accent/20",
              // Remaining sets
              isRemaining && "bg-muted/30 border-border/30 opacity-60",
              // Clickable non-current sets
              !isCurrent && "cursor-pointer active:scale-[0.98]"
            )}
            onClick={() => {
              if (!isCurrent && !isCompleted) {
                onSelectSet(index);
              }
            }}
          >
            {/* Set Header Row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                {/* Set number indicator */}
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors flex-shrink-0",
                  isCompleted && "bg-accent text-accent-foreground",
                  isCurrent && !isCompleted && "bg-accent text-accent-foreground shadow-sm",
                  isRemaining && "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                
                {/* Display values for non-editing states */}
                {!isCurrent && !isEditing && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className={cn(
                      "font-semibold",
                      isCompleted && "text-foreground",
                      isRemaining && "text-muted-foreground"
                    )}>
                      {set.completedWeight ?? set.targetWeight ?? '—'} kg
                    </span>
                    <span className="text-muted-foreground">×</span>
                    <span className={cn(
                      "font-semibold",
                      isCompleted && "text-foreground",
                      isRemaining && "text-muted-foreground"
                    )}>
                      {set.completedReps ?? set.targetReps}
                    </span>
                    {set.rpe && (
                      <span className="text-xs text-muted-foreground ml-1 px-1.5 py-0.5 bg-muted rounded">
                        RPE {set.rpe}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Edit button for completed sets */}
              {!isCurrent && isCompleted && !isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSet(index);
                  }}
                  className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Editing Interface - Full width below header */}
            {(isCurrent && !isCompleted) && (
              <ActiveSetEditor
                weight={set.completedWeight ?? set.targetWeight ?? 0}
                reps={set.completedReps ?? parseInt(set.targetReps.match(/\d+/)?.[0] || '0')}
                onUpdate={(weight, reps) => {
                  onUpdateSet(index, { completedWeight: weight, completedReps: reps });
                }}
              />
            )}

            {isEditing && (
              <InlineEditor
                weight={set.completedWeight ?? set.targetWeight ?? 0}
                reps={set.completedReps ?? parseInt(set.targetReps.match(/\d+/)?.[0] || '0')}
                onUpdate={(weight, reps) => {
                  onUpdateSet(index, { completedWeight: weight, completedReps: reps });
                  setEditingSet(null);
                }}
                onCancel={() => setEditingSet(null)}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

interface ActiveSetEditorProps {
  weight: number;
  reps: number;
  onUpdate: (weight: number, reps: number) => void;
}

// Always-visible editor for the current active set - mobile-optimized stacked layout
function ActiveSetEditor({ weight, reps, onUpdate }: ActiveSetEditorProps) {
  const [editWeight, setEditWeight] = useState(weight);
  const [editReps, setEditReps] = useState(reps);

  // Sync with props when they change externally
  useEffect(() => {
    setEditWeight(weight);
    setEditReps(reps);
  }, [weight, reps]);

  const handleWeightChange = (newWeight: number) => {
    setEditWeight(newWeight);
    onUpdate(newWeight, editReps);
  };

  const handleRepsChange = (newReps: number) => {
    setEditReps(newReps);
    onUpdate(editWeight, newReps);
  };

  return (
    <div className="space-y-3" onClick={e => e.stopPropagation()}>
      {/* Weight row */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase w-12 flex-shrink-0">Weight</span>
        <div className="flex-1 flex items-center justify-center gap-2 bg-background/80 rounded-xl p-1 shadow-sm border border-border/50">
          <button
            onClick={() => handleWeightChange(Math.max(0, editWeight - 2.5))}
            className="h-11 w-11 flex items-center justify-center hover:bg-muted rounded-lg transition-colors active:scale-95"
          >
            <Minus className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <input
              type="number"
              inputMode="decimal"
              value={editWeight}
              onChange={e => handleWeightChange(parseFloat(e.target.value) || 0)}
              className="w-full text-center bg-transparent text-xl font-bold focus:outline-none"
              step="2.5"
            />
            <span className="text-xs text-muted-foreground">kg</span>
          </div>
          <button
            onClick={() => handleWeightChange(editWeight + 2.5)}
            className="h-11 w-11 flex items-center justify-center hover:bg-muted rounded-lg transition-colors active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Reps row */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase w-12 flex-shrink-0">Reps</span>
        <div className="flex-1 flex items-center justify-center gap-2 bg-background/80 rounded-xl p-1 shadow-sm border border-border/50">
          <button
            onClick={() => handleRepsChange(Math.max(0, editReps - 1))}
            className="h-11 w-11 flex items-center justify-center hover:bg-muted rounded-lg transition-colors active:scale-95"
          >
            <Minus className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <input
              type="number"
              inputMode="numeric"
              value={editReps}
              onChange={e => handleRepsChange(parseInt(e.target.value) || 0)}
              className="w-full text-center bg-transparent text-xl font-bold focus:outline-none"
            />
            <span className="text-xs text-muted-foreground">reps</span>
          </div>
          <button
            onClick={() => handleRepsChange(editReps + 1)}
            className="h-11 w-11 flex items-center justify-center hover:bg-muted rounded-lg transition-colors active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface InlineEditorProps {
  weight: number;
  reps: number;
  onUpdate: (weight: number, reps: number) => void;
  onCancel: () => void;
}

function InlineEditor({ weight, reps, onUpdate, onCancel }: InlineEditorProps) {
  const [editWeight, setEditWeight] = useState(weight);
  const [editReps, setEditReps] = useState(reps);

  return (
    <div className="space-y-3" onClick={e => e.stopPropagation()}>
      {/* Weight row */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase w-12 flex-shrink-0">Weight</span>
        <div className="flex-1 flex items-center justify-center gap-2 bg-muted rounded-xl p-1">
          <button
            onClick={() => setEditWeight(Math.max(0, editWeight - 2.5))}
            className="h-9 w-9 flex items-center justify-center hover:bg-muted-foreground/10 rounded-lg transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <input
              type="number"
              inputMode="decimal"
              value={editWeight}
              onChange={e => setEditWeight(parseFloat(e.target.value) || 0)}
              className="w-full text-center bg-transparent text-lg font-semibold focus:outline-none"
              step="2.5"
            />
            <span className="text-xs text-muted-foreground">kg</span>
          </div>
          <button
            onClick={() => setEditWeight(editWeight + 2.5)}
            className="h-9 w-9 flex items-center justify-center hover:bg-muted-foreground/10 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Reps row */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase w-12 flex-shrink-0">Reps</span>
        <div className="flex-1 flex items-center justify-center gap-2 bg-muted rounded-xl p-1">
          <button
            onClick={() => setEditReps(Math.max(0, editReps - 1))}
            className="h-9 w-9 flex items-center justify-center hover:bg-muted-foreground/10 rounded-lg transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <input
              type="number"
              inputMode="numeric"
              value={editReps}
              onChange={e => setEditReps(parseInt(e.target.value) || 0)}
              className="w-full text-center bg-transparent text-lg font-semibold focus:outline-none"
            />
            <span className="text-xs text-muted-foreground">reps</span>
          </div>
          <button
            onClick={() => setEditReps(editReps + 1)}
            className="h-9 w-9 flex items-center justify-center hover:bg-muted-foreground/10 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Confirm button */}
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onUpdate(editWeight, editReps)}
          className="px-4 py-1.5 bg-accent text-accent-foreground rounded-lg text-sm font-medium flex items-center gap-1.5"
        >
          <Check className="h-4 w-4" />
          Save
        </button>
      </div>
    </div>
  );
}
