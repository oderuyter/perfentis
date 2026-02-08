import { useState } from 'react';
import { Plus, Trash2, GripVertical, Pencil, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ParsedImport, ParsedWeek, ParsedWorkout, ParsedExercise } from '@/types/import';

interface ImportStructureEditorProps {
  parsedData: ParsedImport;
  onUpdate: (data: ParsedImport) => void;
}

type MoveTarget = {
  exerciseIndex: number;
  sourceWeekIndex: number;
  sourceWorkoutIndex: number;
};

export default function ImportStructureEditor({ parsedData, onUpdate }: ImportStructureEditorProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(() => new Set(parsedData.weeks.map((_, i) => i)));
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(() => {
    const keys = new Set<string>();
    parsedData.weeks.forEach((_, wi) =>
      parsedData.weeks[wi].workouts.forEach((_, woi) => keys.add(`${wi}-${woi}`))
    );
    return keys;
  });
  const [editingWorkout, setEditingWorkout] = useState<{ weekIndex: number; workoutIndex: number } | null>(null);
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [createWorkoutWeek, setCreateWorkoutWeek] = useState<number | null>(null);
  const [newWorkoutName, setNewWorkoutName] = useState('');
  const [moveDialog, setMoveDialog] = useState<MoveTarget | null>(null);
  const [moveTargetWeek, setMoveTargetWeek] = useState<string>('');
  const [moveTargetWorkout, setMoveTargetWorkout] = useState<string>('');

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

  // --- Mutations ---

  const updateWeekName = (weekIndex: number, name: string) => {
    const updated = { ...parsedData, weeks: parsedData.weeks.map((w, i) =>
      i === weekIndex ? { ...w, name } : w
    )};
    onUpdate(updated);
  };

  const updateWorkoutName = (weekIndex: number, workoutIndex: number, name: string) => {
    const updated = { ...parsedData, weeks: parsedData.weeks.map((w, wi) =>
      wi === weekIndex ? { ...w, workouts: w.workouts.map((wo, woi) =>
        woi === workoutIndex ? { ...wo, name } : wo
      )} : w
    )};
    onUpdate(updated);
  };

  const addWorkout = (weekIndex: number, name: string) => {
    const newWorkout: ParsedWorkout = { name, exercises: [] };
    const updated = { ...parsedData, weeks: parsedData.weeks.map((w, i) =>
      i === weekIndex ? { ...w, workouts: [...w.workouts, newWorkout] } : w
    )};
    onUpdate(updated);
    // auto-expand
    setExpandedWorkouts(prev => {
      const next = new Set(prev);
      next.add(`${weekIndex}-${parsedData.weeks[weekIndex].workouts.length}`);
      return next;
    });
  };

  const removeWorkout = (weekIndex: number, workoutIndex: number) => {
    const updated = { ...parsedData, weeks: parsedData.weeks.map((w, wi) =>
      wi === weekIndex ? { ...w, workouts: w.workouts.filter((_, woi) => woi !== workoutIndex) } : w
    )};
    onUpdate(updated);
  };

  const removeExercise = (weekIndex: number, workoutIndex: number, exerciseIndex: number) => {
    const updated = { ...parsedData, weeks: parsedData.weeks.map((w, wi) =>
      wi === weekIndex ? { ...w, workouts: w.workouts.map((wo, woi) =>
        woi === workoutIndex ? { ...wo, exercises: wo.exercises.filter((_, ei) => ei !== exerciseIndex) } : wo
      )} : w
    )};
    onUpdate(updated);
  };

  const moveExercise = () => {
    if (!moveDialog || moveTargetWeek === '' || moveTargetWorkout === '') return;
    const { exerciseIndex, sourceWeekIndex, sourceWorkoutIndex } = moveDialog;
    const targetWi = parseInt(moveTargetWeek);
    const targetWoi = parseInt(moveTargetWorkout);

    if (targetWi === sourceWeekIndex && targetWoi === sourceWorkoutIndex) {
      setMoveDialog(null);
      return;
    }

    const exercise = parsedData.weeks[sourceWeekIndex].workouts[sourceWorkoutIndex].exercises[exerciseIndex];

    const updated = { ...parsedData, weeks: parsedData.weeks.map((w, wi) => ({
      ...w,
      workouts: w.workouts.map((wo, woi) => {
        let exercises = [...wo.exercises];
        // Remove from source
        if (wi === sourceWeekIndex && woi === sourceWorkoutIndex) {
          exercises = exercises.filter((_, ei) => ei !== exerciseIndex);
        }
        // Add to target
        if (wi === targetWi && woi === targetWoi) {
          exercises = [...exercises, exercise];
        }
        return { ...wo, exercises };
      }),
    }))};

    onUpdate(updated);
    setMoveDialog(null);
  };

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

  return (
    <>
      <div className="space-y-3">
        {/* Summary */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            {parsedData.weeks.length} week{parsedData.weeks.length !== 1 ? 's' : ''}, {totalWorkouts} workout{totalWorkouts !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Week list */}
        {parsedData.weeks.map((week, wi) => {
          const weekExpanded = expandedWeeks.has(wi);
          return (
            <div key={wi} className="border rounded-lg overflow-hidden">
              {/* Week header */}
              <button
                className="w-full flex items-center gap-2 p-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                onClick={() => toggleWeek(wi)}
              >
                {weekExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <span className="font-medium text-sm flex-1">{week.name || `Week ${week.week_number}`}</span>
                <Badge variant="outline" className="text-xs">{week.workouts.length} workouts</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={(e) => { e.stopPropagation(); startEditWeek(wi); }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </button>

              {weekExpanded && (
                <div className="p-2 space-y-2">
                  {week.workouts.map((workout, woi) => {
                    const woKey = `${wi}-${woi}`;
                    const woExpanded = expandedWorkouts.has(woKey);
                    return (
                      <div key={woi} className="border rounded-md bg-background">
                        {/* Workout header */}
                        <div className="flex items-center gap-2 p-2">
                          <button
                            className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                            onClick={() => toggleWorkout(woKey)}
                          >
                            {woExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                            <span className="text-sm font-medium truncate">{workout.name}</span>
                            <Badge variant="secondary" className="text-[10px] shrink-0">{workout.exercises.length}</Badge>
                          </button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 shrink-0"
                            onClick={() => startEditWorkout(wi, woi)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 shrink-0 text-destructive hover:text-destructive"
                            onClick={() => removeWorkout(wi, woi)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Exercises */}
                        {woExpanded && (
                          <div className="border-t px-2 py-1.5 space-y-1">
                            {workout.exercises.length === 0 && (
                              <p className="text-xs text-muted-foreground py-2 text-center">No exercises</p>
                            )}
                            {workout.exercises.map((ex, ei) => (
                              <div key={ei} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/30 group">
                                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{ex.name}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {ex.sets && `${ex.sets} sets`}
                                    {ex.reps && ` × ${ex.reps}`}
                                    {ex.load && ` @ ${ex.load}`}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => {
                                    setMoveTargetWeek(String(wi));
                                    setMoveTargetWorkout('');
                                    setMoveDialog({ exerciseIndex: ei, sourceWeekIndex: wi, sourceWorkoutIndex: woi });
                                  }}
                                  title="Move to another workout"
                                >
                                  <ArrowRight className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                  onClick={() => removeExercise(wi, woi, ei)}
                                  title="Remove exercise"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add workout button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-xs text-muted-foreground border border-dashed"
                    onClick={() => openCreateWorkout(wi)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Workout
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rename week dialog */}
      <Dialog open={editingWeek !== null} onOpenChange={() => setEditingWeek(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Week</DialogTitle>
          </DialogHeader>
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
          <DialogHeader>
            <DialogTitle>Rename Workout</DialogTitle>
          </DialogHeader>
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
          <DialogHeader>
            <DialogTitle>Add Workout</DialogTitle>
          </DialogHeader>
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

      {/* Move exercise dialog */}
      <Dialog open={moveDialog !== null} onOpenChange={() => setMoveDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Move Exercise</DialogTitle>
          </DialogHeader>
          {moveDialog && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Move <span className="font-medium text-foreground">
                  {parsedData.weeks[moveDialog.sourceWeekIndex]?.workouts[moveDialog.sourceWorkoutIndex]?.exercises[moveDialog.exerciseIndex]?.name}
                </span> to:
              </p>
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
                        <SelectItem key={i} value={String(i)}>
                          {wo.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialog(null)}>Cancel</Button>
            <Button onClick={moveExercise} disabled={moveTargetWorkout === ''}>Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
