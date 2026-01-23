// Coach Workout Structure Editor - handles exercises and supersets for training plans
import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dumbbell,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Search,
  ChevronDown,
  ChevronUp,
  Layers,
  Settings,
  Unlink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useExerciseLibrary } from "@/hooks/useExerciseLibrary";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Exercise } from "@/types/exercise";

interface CoachWorkoutStructureEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: string;
  workoutName: string;
  initialExerciseData?: WorkoutItem[];
  onSave?: () => void;
}

// Single exercise in a plan workout
interface ExerciseData {
  type?: 'exercise';
  exercise_id: string;
  name: string;
  sets: number;
  reps: number;
  reps_min?: number;
  reps_max?: number;
  sets_min?: number;
  sets_max?: number;
  load_guidance?: string;
  rest_seconds?: number;
  notes?: string;
  order_index: number;
}

// Superset block
interface SupersetData {
  type: 'superset';
  id: string;
  name?: string;
  rounds?: number;
  rest_after_round_seconds?: number;
  rest_between_exercises_seconds?: number;
  items: ExerciseData[];
  order_index: number;
}

type WorkoutItem = ExerciseData | SupersetData;

function isSuperset(item: WorkoutItem): item is SupersetData {
  return item.type === 'superset';
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function CoachWorkoutStructureEditor({
  open,
  onOpenChange,
  workoutId,
  workoutName,
  initialExerciseData = [],
  onSave,
}: CoachWorkoutStructureEditorProps) {
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<WorkoutItem[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [addingToSupersetId, setAddingToSupersetId] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());
  
  const { exercises: libraryExercises, filters, updateFilters, isLoading: loadingLibrary } = useExerciseLibrary();

  // Reset when opened with new data
  useEffect(() => {
    if (open) {
      // Ensure items have type field
      const normalized = initialExerciseData.map((item, i) => ({
        ...item,
        type: item.type || 'exercise',
        order_index: i,
      })) as WorkoutItem[];
      setItems(normalized.length > 0 ? normalized : []);
      setSelectedExercises(new Set());
    }
  }, [open, initialExerciseData]);

  const addExercise = (exercise: Exercise, toSupersetId?: string) => {
    const newExercise: ExerciseData = {
      type: 'exercise',
      exercise_id: exercise.exercise_id,
      name: exercise.name,
      sets: 3,
      reps: 10,
      rest_seconds: 90,
      order_index: 0,
    };

    if (toSupersetId) {
      setItems(prev => prev.map(item => {
        if (isSuperset(item) && item.id === toSupersetId) {
          const updatedItems = [...item.items, { ...newExercise, order_index: item.items.length }];
          return { ...item, items: updatedItems };
        }
        return item;
      }));
    } else {
      setItems(prev => [...prev, { ...newExercise, order_index: prev.length }]);
    }
    
    setShowExercisePicker(false);
    setAddingToSupersetId(null);
    updateFilters({ search: '' });
  };

  const updateExercise = (itemIndex: number, updates: Partial<ExerciseData>) => {
    setItems(prev => prev.map((item, i) => {
      if (i === itemIndex && !isSuperset(item)) {
        return { ...item, ...updates } as ExerciseData;
      }
      return item;
    }));
  };

  const updateSupersetExercise = (supersetIndex: number, exerciseIndex: number, updates: Partial<ExerciseData>) => {
    setItems(prev => prev.map((item, i) => {
      if (i === supersetIndex && isSuperset(item)) {
        const updatedItems = item.items.map((ex, j) => 
          j === exerciseIndex ? { ...ex, ...updates } : ex
        );
        return { ...item, items: updatedItems };
      }
      return item;
    }));
  };

  const removeItem = (index: number) => {
    setItems(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((item, i) => ({ ...item, order_index: i }));
    });
  };

  const removeFromSuperset = (supersetIndex: number, exerciseIndex: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i === supersetIndex && isSuperset(item)) {
        const newItems = item.items.filter((_, j) => j !== exerciseIndex);
        // If only 1 exercise left, convert back to single
        if (newItems.length === 1) {
          return { ...newItems[0], order_index: item.order_index };
        }
        // If no exercises left, remove superset
        if (newItems.length === 0) {
          return null as any;
        }
        return { ...item, items: newItems.map((ex, j) => ({ ...ex, order_index: j })) };
      }
      return item;
    }).filter(Boolean) as WorkoutItem[]);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;
    
    setItems(prev => {
      const newList = [...prev];
      [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
      return newList.map((item, i) => ({ ...item, order_index: i }));
    });
  };

  const moveInSuperset = (supersetIndex: number, exerciseIndex: number, direction: 'up' | 'down') => {
    const newExIndex = direction === 'up' ? exerciseIndex - 1 : exerciseIndex + 1;
    
    setItems(prev => prev.map((item, i) => {
      if (i === supersetIndex && isSuperset(item)) {
        if (newExIndex < 0 || newExIndex >= item.items.length) return item;
        const newItems = [...item.items];
        [newItems[exerciseIndex], newItems[newExIndex]] = [newItems[newExIndex], newItems[exerciseIndex]];
        return { ...item, items: newItems.map((ex, j) => ({ ...ex, order_index: j })) };
      }
      return item;
    }));
  };

  const updateSuperset = (index: number, updates: Partial<SupersetData>) => {
    setItems(prev => prev.map((item, i) => 
      i === index && isSuperset(item) ? { ...item, ...updates } : item
    ));
  };

  const createSuperset = () => {
    if (selectedExercises.size < 2) {
      toast.error("Select at least 2 exercises");
      return;
    }

    // Get selected exercise indices
    const selectedIndices: number[] = [];
    items.forEach((item, index) => {
      if (!isSuperset(item) && selectedExercises.has(`ex-${index}`)) {
        selectedIndices.push(index);
      }
    });

    if (selectedIndices.length < 2) {
      toast.error("Select at least 2 standalone exercises");
      return;
    }

    const insertIndex = Math.min(...selectedIndices);
    const selectedItems = selectedIndices.map(i => items[i] as ExerciseData);

    const superset: SupersetData = {
      type: 'superset',
      id: generateId(),
      name: 'Superset',
      rounds: 1,
      rest_after_round_seconds: 90,
      rest_between_exercises_seconds: 0,
      items: selectedItems.map((ex, i) => ({ ...ex, order_index: i })),
      order_index: insertIndex,
    };

    // Remove selected items and insert superset
    const remaining = items.filter((_, i) => !selectedIndices.includes(i));
    const newItems = [
      ...remaining.slice(0, insertIndex),
      superset,
      ...remaining.slice(insertIndex),
    ];

    setItems(newItems.map((item, i) => ({ ...item, order_index: i })));
    setSelectedExercises(new Set());
    toast.success("Superset created");
  };

  const ungroupSuperset = (index: number) => {
    const item = items[index];
    if (!isSuperset(item)) return;

    const before = items.slice(0, index);
    const after = items.slice(index + 1);
    const ungrouped = item.items.map(ex => ({ ...ex, type: 'exercise' as const }));

    const newItems = [...before, ...ungrouped, ...after];
    setItems(newItems.map((item, i) => ({ ...item, order_index: i })));
    toast.success("Superset ungrouped");
  };

  const addEmptySuperset = () => {
    const superset: SupersetData = {
      type: 'superset',
      id: generateId(),
      name: 'Superset',
      rounds: 1,
      rest_after_round_seconds: 90,
      rest_between_exercises_seconds: 0,
      items: [],
      order_index: items.length,
    };
    setItems(prev => [...prev, superset]);
  };

  const toggleSelection = (key: string, selected: boolean) => {
    setSelectedExercises(prev => {
      const next = new Set(prev);
      if (selected) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Serialize to JSON format
      const exerciseData = items.map((item, i) => {
        if (isSuperset(item)) {
          return {
            type: 'superset',
            id: item.id,
            name: item.name,
            rounds: item.rounds,
            rest_after_round_seconds: item.rest_after_round_seconds,
            rest_between_exercises_seconds: item.rest_between_exercises_seconds,
            items: item.items.map((ex, j) => ({
              type: 'exercise',
              exercise_id: ex.exercise_id,
              name: ex.name,
              sets: ex.sets,
              reps: ex.reps,
              reps_min: ex.reps_min,
              reps_max: ex.reps_max,
              sets_min: ex.sets_min,
              sets_max: ex.sets_max,
              load_guidance: ex.load_guidance,
              rest_seconds: ex.rest_seconds,
              notes: ex.notes,
              order_index: j,
            })),
            order_index: i,
          };
        }
        return {
          type: 'exercise',
          exercise_id: item.exercise_id,
          name: item.name,
          sets: item.sets,
          reps: item.reps,
          reps_min: item.reps_min,
          reps_max: item.reps_max,
          sets_min: item.sets_min,
          sets_max: item.sets_max,
          load_guidance: item.load_guidance,
          rest_seconds: item.rest_seconds,
          notes: item.notes,
          order_index: i,
        };
      });

      const { error } = await supabase
        .from("plan_workouts")
        .update({ exercise_data: exerciseData })
        .eq("id", workoutId);

      if (error) throw error;

      toast.success("Workout exercises saved");
      onSave?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving workout exercises:", error);
      toast.error("Failed to save exercises");
    } finally {
      setSaving(false);
    }
  };

  const formatRestTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins}m`;
  };

  const standaloneCount = items.filter(item => !isSuperset(item)).length;
  const canCreateSuperset = selectedExercises.size >= 2;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Edit Workout Exercises</SheetTitle>
          <SheetDescription>{workoutName}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-220px)] mt-6">
          <div className="space-y-3 pr-4">
            {items.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Dumbbell className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    No exercises added yet
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowExercisePicker(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Exercise
                  </Button>
                </CardContent>
              </Card>
            ) : (
              items.map((item, index) => (
                isSuperset(item) ? (
                  // Superset block
                  <Card key={item.id} className="border-primary/20 bg-primary/5">
                    <CardContent className="p-3">
                      {/* Superset header */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex flex-col gap-1">
                          <button onClick={() => moveItem(index, 'up')} disabled={index === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <button onClick={() => moveItem(index, 'down')} disabled={index === items.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                          <Layers className="h-4 w-4 text-primary" />
                        </div>
                        <Input
                          value={item.name || ''}
                          onChange={(e) => updateSuperset(index, { name: e.target.value })}
                          placeholder="Superset name..."
                          className="h-8 text-sm font-medium flex-1"
                        />
                        <Badge variant="secondary" className="text-xs">{item.items.length}</Badge>
                        
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label className="text-xs">Rounds</Label>
                                <Select value={(item.rounds || 1).toString()} onValueChange={(v) => updateSuperset(index, { rounds: parseInt(v) })}>
                                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={n.toString()}>{n} round{n > 1 ? 's' : ''}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Rest after round</Label>
                                <Select value={(item.rest_after_round_seconds || 90).toString()} onValueChange={(v) => updateSuperset(index, { rest_after_round_seconds: parseInt(v) })}>
                                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {[0, 30, 45, 60, 90, 120, 180].map(s => <SelectItem key={s} value={s.toString()}>{s === 0 ? 'No rest' : formatRestTime(s)}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Rest between exercises</Label>
                                <Select value={(item.rest_between_exercises_seconds || 0).toString()} onValueChange={(v) => updateSuperset(index, { rest_between_exercises_seconds: parseInt(v) })}>
                                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {[0, 15, 30, 45, 60].map(s => <SelectItem key={s} value={s.toString()}>{s === 0 ? 'No rest' : formatRestTime(s)}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>

                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => ungroupSuperset(index)} title="Ungroup">
                          <Unlink className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Superset exercises */}
                      <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                        {item.items.map((ex, exIdx) => (
                          <div key={`${ex.exercise_id}-${exIdx}`} className="flex items-center gap-2 p-2 rounded bg-background/80">
                            <div className="flex flex-col gap-0.5">
                              <button onClick={() => moveInSuperset(index, exIdx, 'up')} disabled={exIdx === 0} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button onClick={() => moveInSuperset(index, exIdx, 'down')} disabled={exIdx === item.items.length - 1} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>
                            <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center text-xs">{String.fromCharCode(65 + exIdx)}</Badge>
                            <span className="text-sm font-medium truncate flex-1">{ex.name}</span>
                            <Input type="number" className="w-12 h-7 text-xs" value={ex.sets} onChange={(e) => updateSupersetExercise(index, exIdx, { sets: parseInt(e.target.value) || 1 })} min={1} />
                            <span className="text-xs text-muted-foreground">×</span>
                            <Input type="number" className="w-12 h-7 text-xs" value={ex.reps} onChange={(e) => updateSupersetExercise(index, exIdx, { reps: parseInt(e.target.value) || 1 })} min={1} />
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFromSuperset(index, exIdx)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" className="w-full mt-1" onClick={() => { setAddingToSupersetId(item.id); setShowExercisePicker(true); }}>
                          <Plus className="h-3 w-3 mr-1" />Add to Superset
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  // Single exercise
                  <Card key={`ex-${index}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col gap-1 pt-1">
                          <button onClick={() => moveItem(index, 'up')} disabled={index === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <button onClick={() => moveItem(index, 'down')} disabled={index === items.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                        
                        {standaloneCount >= 2 && (
                          <Checkbox
                            checked={selectedExercises.has(`ex-${index}`)}
                            onCheckedChange={(checked) => toggleSelection(`ex-${index}`, !!checked)}
                            className="mt-2"
                          />
                        )}
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">{index + 1}</Badge>
                              <p className="font-medium text-sm truncate">{item.name}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setExpandedItem(expandedItem === index ? null : index)} className="p-1.5 text-muted-foreground hover:text-foreground">
                                {expandedItem === index ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                              <button onClick={() => removeItem(index)} className="p-1.5 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label className="text-xs">Sets</Label>
                              <Input type="number" min={1} className="h-8 text-sm mt-1" value={item.sets} onChange={(e) => updateExercise(index, { sets: parseInt(e.target.value) || 1 })} />
                            </div>
                            <div>
                              <Label className="text-xs">Reps</Label>
                              <Input type="number" min={1} className="h-8 text-sm mt-1" value={item.reps} onChange={(e) => updateExercise(index, { reps: parseInt(e.target.value) || 1 })} />
                            </div>
                            <div>
                              <Label className="text-xs">Rest (s)</Label>
                              <Input type="number" min={0} step={15} className="h-8 text-sm mt-1" value={item.rest_seconds || ''} onChange={(e) => updateExercise(index, { rest_seconds: parseInt(e.target.value) || undefined })} />
                            </div>
                          </div>

                          {expandedItem === index && (
                            <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Reps Range</Label>
                                  <div className="flex gap-1 items-center mt-1">
                                    <Input type="number" placeholder="Min" className="h-8 text-sm" value={item.reps_min || ''} onChange={(e) => updateExercise(index, { reps_min: e.target.value ? parseInt(e.target.value) : undefined })} />
                                    <span className="text-muted-foreground">-</span>
                                    <Input type="number" placeholder="Max" className="h-8 text-sm" value={item.reps_max || ''} onChange={(e) => updateExercise(index, { reps_max: e.target.value ? parseInt(e.target.value) : undefined })} />
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs">Sets Range</Label>
                                  <div className="flex gap-1 items-center mt-1">
                                    <Input type="number" placeholder="Min" className="h-8 text-sm" value={item.sets_min || ''} onChange={(e) => updateExercise(index, { sets_min: e.target.value ? parseInt(e.target.value) : undefined })} />
                                    <span className="text-muted-foreground">-</span>
                                    <Input type="number" placeholder="Max" className="h-8 text-sm" value={item.sets_max || ''} onChange={(e) => updateExercise(index, { sets_max: e.target.value ? parseInt(e.target.value) : undefined })} />
                                  </div>
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs">Load Guidance</Label>
                                <Input placeholder="e.g., 70-75% 1RM, RPE 7-8" className="h-8 text-sm mt-1" value={item.load_guidance || ''} onChange={(e) => updateExercise(index, { load_guidance: e.target.value })} />
                              </div>
                              <div>
                                <Label className="text-xs">Notes</Label>
                                <Textarea placeholder="Coaching cues, tempo..." className="text-sm mt-1" rows={2} value={item.notes || ''} onChange={(e) => updateExercise(index, { notes: e.target.value })} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              ))
            )}

            {items.length > 0 && !showExercisePicker && (
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      <Plus className="h-4 w-4 mr-2" />Add
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setShowExercisePicker(true)}>
                      <Dumbbell className="h-4 w-4 mr-2" />Exercise
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={addEmptySuperset}>
                      <Layers className="h-4 w-4 mr-2" />Empty Superset
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {canCreateSuperset && (
                  <Button onClick={createSuperset} className="gap-2">
                    <Layers className="h-4 w-4" />Group as Superset
                  </Button>
                )}
              </div>
            )}

            {/* Exercise Picker */}
            {showExercisePicker && (
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search exercises..."
                      className="h-8 text-sm"
                      value={filters.search || ''}
                      onChange={(e) => updateFilters({ search: e.target.value })}
                      autoFocus
                    />
                    <Button variant="ghost" size="sm" onClick={() => { setShowExercisePicker(false); setAddingToSupersetId(null); updateFilters({ search: '' }); }}>
                      Cancel
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-48">
                    <div className="space-y-1">
                      {loadingLibrary ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
                      ) : libraryExercises.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No exercises found</p>
                      ) : (
                        libraryExercises.slice(0, 20).map(exercise => (
                          <button
                            key={exercise.id}
                            onClick={() => addExercise(exercise, addingToSupersetId || undefined)}
                            className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <p className="text-sm font-medium">{exercise.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {exercise.primary_muscle?.replace('_', ' ')} • {exercise.type}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Exercises'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default CoachWorkoutStructureEditor;
