import { useState } from 'react';
import { Plus, Trash2, GripVertical, Pencil, ArrowRightLeft, ChevronDown, ChevronRight, X, Link2, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ParsedImport, ParsedWorkout, ParsedExercise } from '@/types/import';

interface ImportStructureEditorProps {
  parsedData: ParsedImport;
  onUpdate: (data: ParsedImport) => void;
}

type ExerciseLocation = { weekIndex: number; workoutIndex: number; exerciseIndex: number };

// Group consecutive exercises by superset_group
interface ExerciseGroup {
  type: 'standalone' | 'superset';
  supersetGroup?: string;
  exercises: { exercise: ParsedExercise; index: number }[];
}

function groupExercises(exercises: ParsedExercise[]): ExerciseGroup[] {
  const groups: ExerciseGroup[] = [];
  let currentGroup: ExerciseGroup | null = null;

  exercises.forEach((ex, idx) => {
    if (ex.superset_group) {
      if (currentGroup?.type === 'superset' && currentGroup.supersetGroup === ex.superset_group) {
        currentGroup.exercises.push({ exercise: ex, index: idx });
      } else {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { type: 'superset', supersetGroup: ex.superset_group, exercises: [{ exercise: ex, index: idx }] };
      }
    } else {
      if (currentGroup) groups.push(currentGroup);
      currentGroup = { type: 'standalone', exercises: [{ exercise: ex, index: idx }] };
    }
  });
  if (currentGroup) groups.push(currentGroup);
  return groups;
}

export default function ImportStructureEditor({ parsedData, onUpdate }: ImportStructureEditorProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(
    () => new Set(parsedData.weeks.map((_, i) => i))
  );
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(() => {
    const keys = new Set<string>();
    parsedData.weeks.forEach((_, wi) =>
      parsedData.weeks[wi].workouts.forEach((_, woi) => keys.add(`${wi}-${woi}`))
    );
    return keys;
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingWorkout, setEditingWorkout] = useState<{ weekIndex: number; workoutIndex: number } | null>(null);
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [createWorkoutWeek, setCreateWorkoutWeek] = useState<number | null>(null);
  const [newWorkoutName, setNewWorkoutName] = useState('');
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [moveTargetWeek, setMoveTargetWeek] = useState<string>('');
  const [moveTargetWorkout, setMoveTargetWorkout] = useState<string>('');

  // Drag state
  const [dragSource, setDragSource] = useState<ExerciseLocation | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ weekIndex: number; workoutIndex: number; position: number } | null>(null);

  const selectionKey = (wi: number, woi: number, ei: number) => `${wi}-${woi}-${ei}`;

  const toggleWeek = (index: number) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const toggleWorkout = (key: string) => {
    setExpandedWorkouts(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleSelect = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const selectAllInWorkout = (wi: number, woi: number) => {
    const workout = parsedData.weeks[wi]?.workouts[woi];
    if (!workout) return;
    setSelected(prev => {
      const next = new Set(prev);
      workout.exercises.forEach((_, ei) => next.add(selectionKey(wi, woi, ei)));
      return next;
    });
  };

  // --- Mutations ---

  const updateWeekName = (weekIndex: number, name: string) => {
    onUpdate({ ...parsedData, weeks: parsedData.weeks.map((w, i) =>
      i === weekIndex ? { ...w, name } : w
    )});
  };

  const updateWorkoutName = (weekIndex: number, workoutIndex: number, name: string) => {
    onUpdate({ ...parsedData, weeks: parsedData.weeks.map((w, wi) =>
      wi === weekIndex ? { ...w, workouts: w.workouts.map((wo, woi) =>
        woi === workoutIndex ? { ...wo, name } : wo
      )} : w
    )});
  };

  const addWorkout = (weekIndex: number, name: string) => {
    const newWorkout: ParsedWorkout = { name, exercises: [] };
    onUpdate({ ...parsedData, weeks: parsedData.weeks.map((w, i) =>
      i === weekIndex ? { ...w, workouts: [...w.workouts, newWorkout] } : w
    )});
    setExpandedWorkouts(prev => {
      const next = new Set(prev);
      next.add(`${weekIndex}-${parsedData.weeks[weekIndex].workouts.length}`);
      return next;
    });
  };

  const removeWorkout = (weekIndex: number, workoutIndex: number) => {
    onUpdate({ ...parsedData, weeks: parsedData.weeks.map((w, wi) =>
      wi === weekIndex ? { ...w, workouts: w.workouts.filter((_, woi) => woi !== workoutIndex) } : w
    )});
  };

  const removeExercise = (weekIndex: number, workoutIndex: number, exerciseIndex: number) => {
    onUpdate({ ...parsedData, weeks: parsedData.weeks.map((w, wi) =>
      wi === weekIndex ? { ...w, workouts: w.workouts.map((wo, woi) =>
        woi === workoutIndex ? { ...wo, exercises: wo.exercises.filter((_, ei) => ei !== exerciseIndex) } : wo
      )} : w
    )});
    setSelected(prev => {
      const next = new Set(prev);
      next.delete(selectionKey(weekIndex, workoutIndex, exerciseIndex));
      return next;
    });
  };

  // --- Superset grouping ---

  const getNextSupersetLabel = (exercises: ParsedExercise[]): string => {
    const usedLabels = new Set(exercises.map(e => e.superset_group).filter(Boolean));
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const letter of letters) {
      if (!usedLabels.has(letter)) return letter;
    }
    return `SS${usedLabels.size + 1}`;
  };

  // Check if all selected exercises are in the same workout
  const getSelectedWorkoutContext = (): { weekIndex: number; workoutIndex: number } | null => {
    if (selected.size < 2) return null;
    let targetWi: number | null = null;
    let targetWoi: number | null = null;
    for (const key of selected) {
      const [wi, woi] = key.split('-').map(Number);
      if (targetWi === null) { targetWi = wi; targetWoi = woi; }
      else if (wi !== targetWi || woi !== targetWoi) return null;
    }
    return targetWi !== null && targetWoi !== null ? { weekIndex: targetWi, workoutIndex: targetWoi } : null;
  };

  const groupAsSuperset = () => {
    const ctx = getSelectedWorkoutContext();
    if (!ctx) return;

    const { weekIndex, workoutIndex } = ctx;
    const workout = parsedData.weeks[weekIndex].workouts[workoutIndex];
    const label = getNextSupersetLabel(workout.exercises);

    const selectedIndices = new Set<number>();
    selected.forEach(key => {
      const [wi, woi, ei] = key.split('-').map(Number);
      if (wi === weekIndex && woi === workoutIndex) selectedIndices.add(ei);
    });

    // Re-order: move selected exercises to be consecutive, starting at the lowest selected index
    const sortedIndices = [...selectedIndices].sort((a, b) => a - b);
    const insertAt = sortedIndices[0];
    const selectedExercises = sortedIndices.map(i => ({
      ...workout.exercises[i],
      superset_group: label,
    }));
    const otherExercises = workout.exercises.filter((_, i) => !selectedIndices.has(i));
    const newExercises = [
      ...otherExercises.slice(0, insertAt),
      ...selectedExercises,
      ...otherExercises.slice(insertAt),
    ];

    onUpdate({ ...parsedData, weeks: parsedData.weeks.map((w, wi) =>
      wi === weekIndex ? { ...w, workouts: w.workouts.map((wo, woi) =>
        woi === workoutIndex ? { ...wo, exercises: newExercises } : wo
      )} : w
    )});
    clearSelection();
  };

  const ungroupSuperset = (weekIndex: number, workoutIndex: number, supersetGroup: string) => {
    onUpdate({ ...parsedData, weeks: parsedData.weeks.map((w, wi) =>
      wi === weekIndex ? { ...w, workouts: w.workouts.map((wo, woi) =>
        woi === workoutIndex ? {
          ...wo,
          exercises: wo.exercises.map(ex =>
            ex.superset_group === supersetGroup ? { ...ex, superset_group: undefined } : ex
          ),
        } : wo
      )} : w
    )});
  };

  // Bulk move selected exercises
  const bulkMoveExercises = () => {
    if (moveTargetWeek === '' || moveTargetWorkout === '') return;
    const targetWi = parseInt(moveTargetWeek);
    const targetWoi = parseInt(moveTargetWorkout);

    const toMove: ExerciseLocation[] = [];
    selected.forEach(key => {
      const [wi, woi, ei] = key.split('-').map(Number);
      toMove.push({ weekIndex: wi, workoutIndex: woi, exerciseIndex: ei });
    });

    if (toMove.length === 0) return;

    const exercisesToMove: ParsedExercise[] = toMove.map(loc =>
      parsedData.weeks[loc.weekIndex].workouts[loc.workoutIndex].exercises[loc.exerciseIndex]
    );

    const removeSet = new Set(Array.from(selected));

    const updated = { ...parsedData, weeks: parsedData.weeks.map((w, wi) => ({
      ...w,
      workouts: w.workouts.map((wo, woi) => {
        let exercises = wo.exercises.filter((_, ei) => !removeSet.has(selectionKey(wi, woi, ei)));
        if (wi === targetWi && woi === targetWoi) {
          exercises = [...exercises, ...exercisesToMove];
        }
        return { ...wo, exercises };
      }),
    }))};

    onUpdate(updated);
    clearSelection();
    setBulkMoveOpen(false);
  };

  // Drag and drop
  const handleDragStart = (e: React.DragEvent, loc: ExerciseLocation) => {
    setDragSource(loc);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  };

  const handleDragOver = (e: React.DragEvent, wi: number, woi: number, position: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget({ weekIndex: wi, workoutIndex: woi, position });
  };

  const handleDragOverWorkout = (e: React.DragEvent, wi: number, woi: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const workout = parsedData.weeks[wi]?.workouts[woi];
    setDragOverTarget({ weekIndex: wi, workoutIndex: woi, position: workout?.exercises.length || 0 });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragSource || !dragOverTarget) {
      setDragSource(null);
      setDragOverTarget(null);
      return;
    }

    const { weekIndex: srcWi, workoutIndex: srcWoi, exerciseIndex: srcEi } = dragSource;
    const { weekIndex: tgtWi, workoutIndex: tgtWoi, position: tgtPos } = dragOverTarget;
    const exercise = parsedData.weeks[srcWi].workouts[srcWoi].exercises[srcEi];

    const updated = { ...parsedData, weeks: parsedData.weeks.map((w, wi) => ({
      ...w,
      workouts: w.workouts.map((wo, woi) => {
        let exercises = [...wo.exercises];
        if (wi === srcWi && woi === srcWoi) {
          exercises = exercises.filter((_, ei) => ei !== srcEi);
        }
        if (wi === tgtWi && woi === tgtWoi) {
          let insertAt = tgtPos;
          if (srcWi === tgtWi && srcWoi === tgtWoi && srcEi < tgtPos) {
            insertAt = Math.max(0, insertAt - 1);
          }
          exercises.splice(insertAt, 0, exercise);
        }
        return { ...wo, exercises };
      }),
    }))};

    onUpdate(updated);
    setDragSource(null);
    setDragOverTarget(null);
  };

  const handleDragEnd = () => {
    setDragSource(null);
    setDragOverTarget(null);
  };

  // Edit helpers
  const startEditWeek = (weekIndex: number) => {
    setEditingWeek(weekIndex);
    setEditName(parsedData.weeks[weekIndex].name || `Week ${parsedData.weeks[weekIndex].week_number}`);
  };
  const saveEditWeek = () => {
    if (editingWeek !== null && editName.trim()) {
      updateWeekName(editingWeek, editName.trim());
      setEditingWeek(null);
    }
  };
  const startEditWorkout = (weekIndex: number, workoutIndex: number) => {
    setEditingWorkout({ weekIndex, workoutIndex });
    setEditName(parsedData.weeks[weekIndex].workouts[workoutIndex].name);
  };
  const saveEditWorkout = () => {
    if (editingWorkout && editName.trim()) {
      updateWorkoutName(editingWorkout.weekIndex, editingWorkout.workoutIndex, editName.trim());
      setEditingWorkout(null);
    }
  };
  const openCreateWorkout = (weekIndex: number) => {
    setCreateWorkoutWeek(weekIndex);
    setNewWorkoutName('');
  };
  const confirmCreateWorkout = () => {
    if (createWorkoutWeek !== null && newWorkoutName.trim()) {
      addWorkout(createWorkoutWeek, newWorkoutName.trim());
      setCreateWorkoutWeek(null);
    }
  };

  const totalWorkouts = parsedData.weeks.reduce((sum, w) => sum + w.workouts.length, 0);
  const hasSelection = selected.size > 0;
  const supersetContext = getSelectedWorkoutContext();
  const canGroupSuperset = supersetContext !== null && selected.size >= 2;

  // Render an exercise row
  const renderExerciseRow = (ex: ParsedExercise, ei: number, wi: number, woi: number, inSuperset: boolean) => {
    const key = selectionKey(wi, woi, ei);
    const isSelected = selected.has(key);
    const isDragging = dragSource?.weekIndex === wi && dragSource?.workoutIndex === woi && dragSource?.exerciseIndex === ei;
    const isDropTarget = dragOverTarget?.weekIndex === wi && dragOverTarget?.workoutIndex === woi && dragOverTarget?.position === ei;

    return (
      <div key={ei}>
        {isDropTarget && (
          <div className="h-0.5 mx-2 my-0.5 rounded-full bg-primary" />
        )}
        <div
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 rounded-md transition-all group",
            isDragging ? "opacity-30" : "",
            isSelected ? "bg-primary/8" : "hover:bg-muted/40",
          )}
          draggable
          onDragStart={(e) => handleDragStart(e, { weekIndex: wi, workoutIndex: woi, exerciseIndex: ei })}
          onDragOver={(e) => handleDragOver(e, wi, woi, ei)}
          onDragEnd={handleDragEnd}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleSelect(key)}
            className="h-3.5 w-3.5 shrink-0"
          />
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 cursor-grab active:cursor-grabbing" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{ex.name}</p>
            {(ex.sets || ex.reps || ex.load) && (
              <p className="text-[10px] text-muted-foreground/70">
                {[
                  ex.sets && `${ex.sets}s`,
                  ex.reps && `${ex.reps}r`,
                  ex.load,
                ].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-destructive"
            onClick={() => removeExercise(wi, woi, ei)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Bulk action bar */}
      {hasSelection && (
        <div className="sticky top-0 z-10 flex items-center gap-2 p-2.5 rounded-lg bg-primary/10 backdrop-blur-sm mb-3">
          <Badge variant="default" className="text-xs">{selected.size} selected</Badge>
          <div className="flex-1" />
          {canGroupSuperset && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={groupAsSuperset}
            >
              <Link2 className="h-3 w-3 mr-1" /> Superset
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setMoveTargetWeek('');
              setMoveTargetWorkout('');
              setBulkMoveOpen(true);
            }}
          >
            <ArrowRightLeft className="h-3 w-3 mr-1" /> Move
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearSelection}>
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {/* Summary */}
        <p className="text-sm text-muted-foreground">
          {parsedData.weeks.length} week{parsedData.weeks.length !== 1 ? 's' : ''} · {totalWorkouts} workout{totalWorkouts !== 1 ? 's' : ''}
        </p>

        {/* Week list */}
        {parsedData.weeks.map((week, wi) => {
          const weekExpanded = expandedWeeks.has(wi);
          return (
            <div key={wi} className="rounded-xl bg-muted/20 overflow-hidden">
              <button
                className="w-full flex items-center gap-2.5 px-3.5 py-3 hover:bg-muted/30 transition-colors text-left"
                onClick={() => toggleWeek(wi)}
              >
                {weekExpanded
                  ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                }
                <span className="font-semibold text-sm flex-1">{week.name || `Week ${week.week_number}`}</span>
                <span className="text-xs text-muted-foreground">{week.workouts.length} workouts</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-60 hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); startEditWeek(wi); }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </button>

              {weekExpanded && (
                <div className="px-2 pb-2 space-y-1.5">
                  {week.workouts.map((workout, woi) => {
                    const woKey = `${wi}-${woi}`;
                    const woExpanded = expandedWorkouts.has(woKey);
                    const exerciseGroups = groupExercises(workout.exercises);

                    return (
                      <div
                        key={woi}
                        className="rounded-lg bg-background/60 overflow-hidden"
                        onDragOver={(e) => handleDragOverWorkout(e, wi, woi)}
                        onDrop={handleDrop}
                      >
                        {/* Workout header */}
                        <div className="flex items-center gap-2 px-3 py-2">
                          <button
                            className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                            onClick={() => toggleWorkout(woKey)}
                          >
                            {woExpanded
                              ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                              : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                            }
                            <span className="text-sm font-medium truncate">{workout.name}</span>
                          </button>
                          <span className="text-[10px] text-muted-foreground tabular-nums">{workout.exercises.length} ex</span>
                          {woExpanded && workout.exercises.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-[10px] text-muted-foreground opacity-60 hover:opacity-100"
                              onClick={() => selectAllInWorkout(wi, woi)}
                            >
                              Select all
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 shrink-0 opacity-60 hover:opacity-100"
                            onClick={() => startEditWorkout(wi, woi)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 shrink-0 opacity-40 hover:opacity-100 hover:text-destructive"
                            onClick={() => removeWorkout(wi, woi)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Exercises with superset grouping */}
                        {woExpanded && (
                          <div className="px-1.5 pb-1.5">
                            {workout.exercises.length === 0 && (
                              <p className="text-xs text-muted-foreground/60 py-3 text-center">
                                Drop exercises here or add a workout
                              </p>
                            )}
                            {exerciseGroups.map((group, gi) => {
                              if (group.type === 'superset' && group.supersetGroup) {
                                return (
                                  <div
                                    key={`ss-${gi}`}
                                    className="my-1 rounded-md bg-primary/5 relative"
                                  >
                                    {/* Superset header */}
                                    <div className="flex items-center gap-1.5 px-2 py-1">
                                      <Link2 className="h-3 w-3 text-primary/70" />
                                      <span className="text-[10px] font-semibold text-primary/80 uppercase tracking-wide">
                                        Superset {group.supersetGroup}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {group.exercises.length} exercises
                                      </span>
                                      <div className="flex-1" />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 px-1 text-[10px] text-muted-foreground opacity-60 hover:opacity-100"
                                        onClick={() => ungroupSuperset(wi, woi, group.supersetGroup!)}
                                      >
                                        <Unlink className="h-2.5 w-2.5 mr-0.5" /> Ungroup
                                      </Button>
                                    </div>
                                    {/* Superset left accent */}
                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-md bg-primary/40" />
                                    <div className="pl-1">
                                      {group.exercises.map(({ exercise, index }) =>
                                        renderExerciseRow(exercise, index, wi, woi, true)
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                              // Standalone exercises
                              return group.exercises.map(({ exercise, index }) =>
                                renderExerciseRow(exercise, index, wi, woi, false)
                              );
                            })}
                            {/* Drop indicator at end */}
                            {dragOverTarget?.weekIndex === wi && dragOverTarget?.workoutIndex === woi && dragOverTarget?.position === workout.exercises.length && (
                              <div className="h-0.5 mx-2 my-0.5 rounded-full bg-primary" />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground/60 hover:text-muted-foreground rounded-lg hover:bg-muted/20 transition-colors"
                    onClick={() => openCreateWorkout(wi)}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Workout
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rename week dialog */}
      <Dialog open={editingWeek !== null} onOpenChange={() => setEditingWeek(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rename Week</DialogTitle></DialogHeader>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveEditWeek()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingWeek(null)}>Cancel</Button>
            <Button onClick={saveEditWeek}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename workout dialog */}
      <Dialog open={editingWorkout !== null} onOpenChange={() => setEditingWorkout(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rename Workout</DialogTitle></DialogHeader>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveEditWorkout()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingWorkout(null)}>Cancel</Button>
            <Button onClick={saveEditWorkout}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create workout dialog */}
      <Dialog open={createWorkoutWeek !== null} onOpenChange={() => setCreateWorkoutWeek(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Workout</DialogTitle></DialogHeader>
          <div>
            <Label>Workout Name</Label>
            <Input
              value={newWorkoutName}
              onChange={(e) => setNewWorkoutName(e.target.value)}
              placeholder="e.g. Push Day, Upper Body"
              onKeyDown={(e) => e.key === 'Enter' && confirmCreateWorkout()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateWorkoutWeek(null)}>Cancel</Button>
            <Button onClick={confirmCreateWorkout} disabled={!newWorkoutName.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk move dialog */}
      <Dialog open={bulkMoveOpen} onOpenChange={setBulkMoveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Move {selected.size} exercise{selected.size !== 1 ? 's' : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Week</Label>
              <Select value={moveTargetWeek} onValueChange={(v) => { setMoveTargetWeek(v); setMoveTargetWorkout(''); }}>
                <SelectTrigger><SelectValue placeholder="Select week" /></SelectTrigger>
                <SelectContent>
                  {parsedData.weeks.map((w, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {w.name || `Week ${w.week_number}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {moveTargetWeek !== '' && (
              <div>
                <Label>Workout</Label>
                <Select value={moveTargetWorkout} onValueChange={setMoveTargetWorkout}>
                  <SelectTrigger><SelectValue placeholder="Select workout" /></SelectTrigger>
                  <SelectContent>
                    {parsedData.weeks[parseInt(moveTargetWeek)]?.workouts.map((wo, i) => (
                      <SelectItem key={i} value={String(i)}>{wo.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkMoveOpen(false)}>Cancel</Button>
            <Button onClick={bulkMoveExercises} disabled={moveTargetWorkout === ''}>Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
