import { useState, useEffect } from "react";
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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dumbbell,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useExerciseLibrary } from "@/hooks/useExerciseLibrary";
import type { Exercise } from "@/types/exercise";

interface WorkoutExerciseEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: string;
  workoutName: string;
  initialExerciseData?: ExerciseData[];
  onSave?: () => void;
}

interface ExerciseData {
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

export function WorkoutExerciseEditor({
  open,
  onOpenChange,
  workoutId,
  workoutName,
  initialExerciseData = [],
  onSave,
}: WorkoutExerciseEditorProps) {
  const [saving, setSaving] = useState(false);
  const [exercises, setExercises] = useState<ExerciseData[]>(initialExerciseData);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);
  
  const { exercises: libraryExercises, filters, updateFilters, isLoading: loadingLibrary } = useExerciseLibrary();

  // Reset when opened with new data
  useEffect(() => {
    if (open) {
      setExercises(initialExerciseData.length > 0 ? initialExerciseData : []);
    }
  }, [open, initialExerciseData]);

  const addExercise = (exercise: Exercise) => {
    const newExercise: ExerciseData = {
      exercise_id: exercise.exercise_id,
      name: exercise.name,
      sets: 3,
      reps: 10,
      rest_seconds: 90,
      order_index: exercises.length,
    };
    setExercises([...exercises, newExercise]);
    setShowExercisePicker(false);
    updateFilters({ search: '' });
  };

  const updateExercise = (index: number, updates: Partial<ExerciseData>) => {
    setExercises(prev => prev.map((ex, i) => 
      i === index ? { ...ex, ...updates } : ex
    ));
  };

  const removeExercise = (index: number) => {
    setExercises(prev => {
      const newList = prev.filter((_, i) => i !== index);
      return newList.map((ex, i) => ({ ...ex, order_index: i }));
    });
  };

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= exercises.length) return;
    
    setExercises(prev => {
      const newList = [...prev];
      [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
      return newList.map((ex, i) => ({ ...ex, order_index: i }));
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("plan_workouts")
        .update({ 
          exercise_data: exercises.map(ex => ({
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
            order_index: ex.order_index,
          }))
        })
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Edit Workout Exercises</SheetTitle>
          <SheetDescription>{workoutName}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-220px)] mt-6">
          <div className="space-y-3 pr-4">
            {exercises.length === 0 ? (
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
              exercises.map((exercise, index) => (
                <Card key={`${exercise.exercise_id}-${index}`} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col gap-1 pt-1">
                        <button
                          onClick={() => moveExercise(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <button
                          onClick={() => moveExercise(index, 'down')}
                          disabled={index === exercises.length - 1}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {index + 1}
                            </Badge>
                            <p className="font-medium text-sm truncate">
                              {exercise.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setExpandedExercise(
                                expandedExercise === index ? null : index
                              )}
                              className="p-1.5 text-muted-foreground hover:text-foreground"
                            >
                              {expandedExercise === index ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => removeExercise(index)}
                              className="p-1.5 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Basic inputs - always visible */}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">Sets</Label>
                            <Input
                              type="number"
                              min={1}
                              className="h-8 text-sm mt-1"
                              value={exercise.sets}
                              onChange={(e) => updateExercise(index, { 
                                sets: parseInt(e.target.value) || 1 
                              })}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Reps</Label>
                            <Input
                              type="number"
                              min={1}
                              className="h-8 text-sm mt-1"
                              value={exercise.reps}
                              onChange={(e) => updateExercise(index, { 
                                reps: parseInt(e.target.value) || 1 
                              })}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Rest (s)</Label>
                            <Input
                              type="number"
                              min={0}
                              step={15}
                              className="h-8 text-sm mt-1"
                              value={exercise.rest_seconds || ''}
                              onChange={(e) => updateExercise(index, { 
                                rest_seconds: parseInt(e.target.value) || undefined 
                              })}
                            />
                          </div>
                        </div>

                        {/* Expanded options */}
                        {expandedExercise === index && (
                          <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Reps Range (min-max)</Label>
                                <div className="flex gap-1 items-center mt-1">
                                  <Input
                                    type="number"
                                    placeholder="Min"
                                    className="h-8 text-sm"
                                    value={exercise.reps_min || ''}
                                    onChange={(e) => updateExercise(index, { 
                                      reps_min: e.target.value ? parseInt(e.target.value) : undefined 
                                    })}
                                  />
                                  <span className="text-muted-foreground">-</span>
                                  <Input
                                    type="number"
                                    placeholder="Max"
                                    className="h-8 text-sm"
                                    value={exercise.reps_max || ''}
                                    onChange={(e) => updateExercise(index, { 
                                      reps_max: e.target.value ? parseInt(e.target.value) : undefined 
                                    })}
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs">Sets Range (min-max)</Label>
                                <div className="flex gap-1 items-center mt-1">
                                  <Input
                                    type="number"
                                    placeholder="Min"
                                    className="h-8 text-sm"
                                    value={exercise.sets_min || ''}
                                    onChange={(e) => updateExercise(index, { 
                                      sets_min: e.target.value ? parseInt(e.target.value) : undefined 
                                    })}
                                  />
                                  <span className="text-muted-foreground">-</span>
                                  <Input
                                    type="number"
                                    placeholder="Max"
                                    className="h-8 text-sm"
                                    value={exercise.sets_max || ''}
                                    onChange={(e) => updateExercise(index, { 
                                      sets_max: e.target.value ? parseInt(e.target.value) : undefined 
                                    })}
                                  />
                                </div>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Load Guidance</Label>
                              <Input
                                placeholder="e.g., 70-75% 1RM, RPE 7-8, moderate"
                                className="h-8 text-sm mt-1"
                                value={exercise.load_guidance || ''}
                                onChange={(e) => updateExercise(index, { 
                                  load_guidance: e.target.value 
                                })}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Notes</Label>
                              <Textarea
                                placeholder="Coaching cues, tempo, modifications..."
                                className="text-sm mt-1"
                                rows={2}
                                value={exercise.notes || ''}
                                onChange={(e) => updateExercise(index, { 
                                  notes: e.target.value 
                                })}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            {exercises.length > 0 && !showExercisePicker && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowExercisePicker(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Exercise
              </Button>
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
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setShowExercisePicker(false);
                        updateFilters({ search: '' });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-48">
                    <div className="space-y-1">
                      {loadingLibrary ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          Loading exercises...
                        </p>
                      ) : libraryExercises.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No exercises found
                        </p>
                      ) : (
                        libraryExercises.slice(0, 20).map(exercise => (
                          <button
                            key={exercise.id}
                            onClick={() => addExercise(exercise)}
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
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="flex-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Exercises'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
