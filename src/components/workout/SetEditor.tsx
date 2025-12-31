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
        const isEditing = editingSet === index || isCurrent;

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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Set number indicator */}
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                  isCompleted && "bg-accent text-accent-foreground",
                  isCurrent && !isCompleted && "bg-accent text-accent-foreground shadow-sm",
                  isRemaining && "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                
                <div className="flex items-center gap-2">
                  {isCurrent && !isCompleted ? (
                    // Current set - always show inline editor
                    <ActiveSetEditor
                      weight={set.completedWeight ?? set.targetWeight ?? 0}
                      reps={set.completedReps ?? parseInt(set.targetReps.match(/\d+/)?.[0] || '0')}
                      onUpdate={(weight, reps) => {
                        onUpdateSet(index, { completedWeight: weight, completedReps: reps });
                      }}
                    />
                  ) : editingSet === index ? (
                    // Editing a completed set
                    <InlineEditor
                      weight={set.completedWeight ?? set.targetWeight ?? 0}
                      reps={set.completedReps ?? parseInt(set.targetReps.match(/\d+/)?.[0] || '0')}
                      onUpdate={(weight, reps) => {
                        onUpdateSet(index, { completedWeight: weight, completedReps: reps });
                        setEditingSet(null);
                      }}
                      onCancel={() => setEditingSet(null)}
                    />
                  ) : (
                    // Display mode
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
              </div>

              {/* Edit button for completed sets */}
              {!isCurrent && isCompleted && editingSet !== index && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSet(index);
                  }}
                  className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
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

// Always-visible editor for the current active set
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
    <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
      {/* Weight control */}
      <div className="flex items-center gap-1 bg-background/80 rounded-lg px-1 shadow-sm border border-border/50">
        <button
          onClick={() => handleWeightChange(Math.max(0, editWeight - 2.5))}
          className="h-9 w-9 flex items-center justify-center hover:bg-muted/50 rounded-lg transition-colors"
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="number"
          value={editWeight}
          onChange={e => handleWeightChange(parseFloat(e.target.value) || 0)}
          className="w-14 text-center bg-transparent text-base font-bold focus:outline-none"
          step="2.5"
        />
        <button
          onClick={() => handleWeightChange(editWeight + 2.5)}
          className="h-9 w-9 flex items-center justify-center hover:bg-muted/50 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      
      <span className="text-muted-foreground font-medium">×</span>
      
      {/* Reps control */}
      <div className="flex items-center gap-1 bg-background/80 rounded-lg px-1 shadow-sm border border-border/50">
        <button
          onClick={() => handleRepsChange(Math.max(0, editReps - 1))}
          className="h-9 w-9 flex items-center justify-center hover:bg-muted/50 rounded-lg transition-colors"
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="number"
          value={editReps}
          onChange={e => handleRepsChange(parseInt(e.target.value) || 0)}
          className="w-10 text-center bg-transparent text-base font-bold focus:outline-none"
        />
        <button
          onClick={() => handleRepsChange(editReps + 1)}
          className="h-9 w-9 flex items-center justify-center hover:bg-muted/50 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
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
    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-1 bg-muted rounded-lg px-1">
        <button
          onClick={() => setEditWeight(Math.max(0, editWeight - 2.5))}
          className="p-1.5"
        >
          <Minus className="h-3 w-3" />
        </button>
        <input
          type="number"
          value={editWeight}
          onChange={e => setEditWeight(parseFloat(e.target.value) || 0)}
          className="w-12 text-center bg-transparent text-sm font-semibold"
        />
        <button
          onClick={() => setEditWeight(editWeight + 2.5)}
          className="p-1.5"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      
      <span className="text-muted-foreground">×</span>
      
      <div className="flex items-center gap-1 bg-muted rounded-lg px-1">
        <button
          onClick={() => setEditReps(Math.max(0, editReps - 1))}
          className="p-1.5"
        >
          <Minus className="h-3 w-3" />
        </button>
        <input
          type="number"
          value={editReps}
          onChange={e => setEditReps(parseInt(e.target.value) || 0)}
          className="w-8 text-center bg-transparent text-sm font-semibold"
        />
        <button
          onClick={() => setEditReps(editReps + 1)}
          className="p-1.5"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      
      <button
        onClick={() => onUpdate(editWeight, editReps)}
        className="p-1.5 bg-accent text-accent-foreground rounded-lg"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
