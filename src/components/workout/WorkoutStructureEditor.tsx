// Workout Structure Editor - handles both exercises and supersets
import { useState, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Plus, Layers, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { SupersetBlockComponent } from "./SupersetBlock";
import { ExerciseItemCard } from "./ExerciseItemCard";
import { AddExerciseSheet } from "./AddExerciseSheet";
import {
  type WorkoutStructureItem,
  type ExerciseItem,
  type SupersetBlock,
  isSuperset,
  isExercise,
  generateItemId,
  createExerciseItem,
  createEmptySuperset,
} from "@/types/superset";

interface WorkoutStructureEditorProps {
  items: WorkoutStructureItem[];
  onChange: (items: WorkoutStructureItem[]) => void;
  title?: string;
  readOnly?: boolean;
}

export function WorkoutStructureEditor({
  items,
  onChange,
  title = "Exercises",
  readOnly = false,
}: WorkoutStructureEditorProps) {
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [addingToSuperset, setAddingToSuperset] = useState<string | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());

  // Reorder items in the list
  const handleReorder = useCallback(
    (newOrder: WorkoutStructureItem[]) => {
      const reindexed = newOrder.map((item, index) => ({
        ...item,
        order_index: index,
      }));
      onChange(reindexed);
    },
    [onChange]
  );

  // Add a new exercise
  const handleAddExercise = useCallback(
    (exercise: { id: string; name: string; sets?: number; exerciseType?: 'strength' | 'cardio' }) => {
      if (addingToSuperset) {
        // Add to specific superset
        const updatedItems = items.map((item) => {
          if (isSuperset(item) && item.id === addingToSuperset) {
            const newExercise = createExerciseItem(
              { id: exercise.id, name: exercise.name, exerciseType: exercise.exerciseType },
              item.items.length
            );
            return { ...item, items: [...item.items, newExercise] };
          }
          return item;
        });
        onChange(updatedItems);
        setAddingToSuperset(null);
      } else {
        // Add as standalone exercise
        const newExercise = createExerciseItem(
          { id: exercise.id, name: exercise.name, exerciseType: exercise.exerciseType },
          items.length
        );
        onChange([...items, newExercise]);
      }
      setShowAddExercise(false);
    },
    [items, onChange, addingToSuperset]
  );

  // Update an exercise (standalone or in superset)
  const handleUpdateExercise = useCallback(
    (itemId: string, updates: Partial<ExerciseItem>) => {
      const updatedItems = items.map((item) => {
        if (isExercise(item) && item.id === itemId) {
          return { ...item, ...updates };
        }
        if (isSuperset(item)) {
          return {
            ...item,
            items: item.items.map((ex) =>
              ex.id === itemId ? { ...ex, ...updates } : ex
            ),
          };
        }
        return item;
      });
      onChange(updatedItems);
    },
    [items, onChange]
  );

  // Remove an item (exercise or superset)
  const handleRemoveItem = useCallback(
    (itemId: string) => {
      const filtered = items.filter((item) => item.id !== itemId);
      const reindexed = filtered.map((item, index) => ({
        ...item,
        order_index: index,
      }));
      onChange(reindexed);
    },
    [items, onChange]
  );

  // Update a superset
  const handleUpdateSuperset = useCallback(
    (supersetId: string, updates: Partial<SupersetBlock>) => {
      const updatedItems = items.map((item) => {
        if (isSuperset(item) && item.id === supersetId) {
          return { ...item, ...updates };
        }
        return item;
      });
      onChange(updatedItems);
    },
    [items, onChange]
  );

  // Remove exercise from superset
  const handleRemoveFromSuperset = useCallback(
    (supersetId: string, exerciseIndex: number) => {
      const updatedItems = items.map((item) => {
        if (isSuperset(item) && item.id === supersetId) {
          const newItems = item.items.filter((_, i) => i !== exerciseIndex);
          // If only one exercise left, auto-ungroup
          if (newItems.length === 1) {
            return {
              ...newItems[0],
              order_index: item.order_index,
            };
          }
          // If no exercises left, remove superset
          if (newItems.length === 0) {
            return null;
          }
          return { ...item, items: newItems.map((ex, i) => ({ ...ex, order_index: i })) };
        }
        return item;
      }).filter(Boolean) as WorkoutStructureItem[];
      
      onChange(updatedItems.map((item, index) => ({ ...item, order_index: index })));
    },
    [items, onChange]
  );

  // Move exercise within superset
  const handleMoveInSuperset = useCallback(
    (supersetId: string, exerciseIndex: number, direction: 'up' | 'down') => {
      const updatedItems = items.map((item) => {
        if (isSuperset(item) && item.id === supersetId) {
          const newIndex = direction === 'up' ? exerciseIndex - 1 : exerciseIndex + 1;
          if (newIndex < 0 || newIndex >= item.items.length) return item;
          
          const newItems = [...item.items];
          [newItems[exerciseIndex], newItems[newIndex]] = [newItems[newIndex], newItems[exerciseIndex]];
          return { ...item, items: newItems.map((ex, i) => ({ ...ex, order_index: i })) };
        }
        return item;
      });
      onChange(updatedItems);
    },
    [items, onChange]
  );

  // Ungroup superset back to individual exercises
  const handleUngroupSuperset = useCallback(
    (supersetId: string) => {
      const supersetIndex = items.findIndex(
        (item) => isSuperset(item) && item.id === supersetId
      );
      if (supersetIndex === -1) return;

      const superset = items[supersetIndex] as SupersetBlock;
      const beforeItems = items.slice(0, supersetIndex);
      const afterItems = items.slice(supersetIndex + 1);
      
      const ungroupedExercises = superset.items.map((ex) => ({
        ...ex,
        type: 'exercise' as const,
      }));

      const newItems = [...beforeItems, ...ungroupedExercises, ...afterItems];
      onChange(newItems.map((item, index) => ({ ...item, order_index: index })));
      toast.success("Superset ungrouped");
    },
    [items, onChange]
  );

  // Toggle exercise selection
  const handleToggleSelection = useCallback(
    (exerciseId: string, selected: boolean) => {
      setSelectedExercises((prev) => {
        const next = new Set(prev);
        if (selected) {
          next.add(exerciseId);
        } else {
          next.delete(exerciseId);
        }
        return next;
      });
    },
    []
  );

  // Create superset from selected exercises
  const handleCreateSuperset = useCallback(() => {
    if (selectedExercises.size < 2) {
      toast.error("Select at least 2 exercises");
      return;
    }

    // Get selected exercises and their indices
    const selectedItems: { item: ExerciseItem; index: number }[] = [];
    items.forEach((item, index) => {
      if (isExercise(item) && selectedExercises.has(item.id)) {
        selectedItems.push({ item, index });
      }
    });

    if (selectedItems.length < 2) {
      toast.error("Select at least 2 standalone exercises");
      return;
    }

    // Find the earliest position
    const insertIndex = Math.min(...selectedItems.map((s) => s.index));

    // Create superset
    const superset = createEmptySuperset(insertIndex);
    superset.items = selectedItems.map((s, i) => ({ ...s.item, order_index: i }));

    // Remove selected items and insert superset
    const remainingItems = items.filter(
      (item) => !isExercise(item) || !selectedExercises.has(item.id)
    );
    const newItems = [
      ...remainingItems.slice(0, insertIndex),
      superset,
      ...remainingItems.slice(insertIndex),
    ];

    onChange(newItems.map((item, index) => ({ ...item, order_index: index })));
    setSelectedExercises(new Set());
    toast.success("Superset created");
  }, [items, selectedExercises, onChange]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedExercises(new Set());
  }, []);

  const hasSelection = selectedExercises.size > 0;
  const standalonExercises = items.filter(isExercise);
  const canCreateSuperset = selectedExercises.size >= 2;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{items.length}</Badge>
            {hasSelection && (
              <Button
                size="sm"
                variant="outline"
                onClick={clearSelection}
                className="text-xs"
              >
                Clear ({selectedExercises.size})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-8">
            <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No exercises added yet
            </p>
            <Button
              onClick={() => setShowAddExercise(true)}
              variant="outline"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Exercise
            </Button>
          </div>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  {isSuperset(item) ? (
                    <SupersetBlockComponent
                      superset={item}
                      onUpdate={(updates) => handleUpdateSuperset(item.id, updates)}
                      onRemove={() => handleRemoveItem(item.id)}
                      onUngroup={() => handleUngroupSuperset(item.id)}
                      onAddExercise={() => {
                        setAddingToSuperset(item.id);
                        setShowAddExercise(true);
                      }}
                      onUpdateExercise={(index, updates) => {
                        handleUpdateExercise(item.items[index].id, updates);
                      }}
                      onRemoveExercise={(index) => handleRemoveFromSuperset(item.id, index)}
                      onMoveExercise={(index, dir) => handleMoveInSuperset(item.id, index, dir)}
                      readOnly={readOnly}
                    />
                  ) : (
                    <ExerciseItemCard
                      exercise={item}
                      isSelected={selectedExercises.has(item.id)}
                      onSelect={
                        !readOnly
                          ? (selected) => handleToggleSelection(item.id, selected)
                          : undefined
                      }
                      onUpdate={(updates) => handleUpdateExercise(item.id, updates)}
                      onRemove={() => handleRemoveItem(item.id)}
                      showSelection={!readOnly && standalonExercises.length >= 2}
                      readOnly={readOnly}
                    />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {!readOnly && (
              <div className="flex gap-2 mt-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex-1 gap-2">
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setShowAddExercise(true)}>
                      <Dumbbell className="h-4 w-4 mr-2" />
                      Exercise
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        const newSuperset = createEmptySuperset(items.length);
                        onChange([...items, newSuperset]);
                        toast.success("Empty superset added");
                      }}
                    >
                      <Layers className="h-4 w-4 mr-2" />
                      Empty Superset
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {canCreateSuperset && (
                  <Button onClick={handleCreateSuperset} className="gap-2">
                    <Layers className="h-4 w-4" />
                    Group as Superset
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Add Exercise Sheet */}
      {showAddExercise && (
        <AddExerciseSheet
          onAdd={handleAddExercise}
          onClose={() => {
            setShowAddExercise(false);
            setAddingToSuperset(null);
          }}
        />
      )}
    </Card>
  );
}

export default WorkoutStructureEditor;
