import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExerciseSet } from '@/types/workout';

interface SetEditorProps {
  sets: ExerciseSet[];
  currentSetIndex: number;
  onUpdateSet: (setIndex: number, updates: Partial<ExerciseSet>) => void;
  onSelectSet: (setIndex: number) => void;
}

export function SetEditor({ sets, currentSetIndex, onUpdateSet, onSelectSet }: SetEditorProps) {
  const [editingSet, setEditingSet] = useState<number | null>(null);

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
              isCompleted && "bg-primary/5 border-primary/20",
              isCurrent && !isCompleted && "bg-card border-primary shadow-sm",
              isRemaining && "bg-muted/30 border-border/30",
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
                <div className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && !isCompleted && "bg-primary/10 text-primary",
                  isRemaining && "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  {isEditing ? (
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
                    <>
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
                        <span className="text-xs text-muted-foreground ml-2">
                          RPE {set.rpe}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {!isEditing && (isCurrent || isCompleted) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSet(index);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                >
                  Edit
                </button>
              )}
            </div>
          </motion.div>
        );
      })}
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
        className="p-1.5 bg-primary text-primary-foreground rounded-lg"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
