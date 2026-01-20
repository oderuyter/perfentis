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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dumbbell, Save, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PlanOverrideSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string;
  clientName: string;
  planName: string;
  onSave?: () => void;
}

interface ExerciseOverride {
  exerciseIndex: number;
  exerciseName: string;
  sets_min?: number;
  sets_max?: number;
  reps_min?: number;
  reps_max?: number;
  rest_seconds?: number;
  load_guidance?: string;
  coach_notes?: string;
  substituted_exercise_id?: string;
  substituted_exercise_name?: string;
}

interface WorkoutOverride {
  workoutId: string;
  workoutName: string;
  coach_notes?: string;
  exercise_overrides: ExerciseOverride[];
}

export function PlanOverrideSheet({
  open,
  onOpenChange,
  assignmentId,
  clientName,
  planName,
  onSave,
}: PlanOverrideSheetProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planData, setPlanData] = useState<any>(null);
  const [overrides, setOverrides] = useState<Record<string, WorkoutOverride>>({});

  // Fetch plan structure and existing overrides
  useEffect(() => {
    if (!open || !assignmentId) return;

    async function fetchData() {
      setLoading(true);
      try {
        // Get assignment with plan structure
        const { data: assignment, error: assignmentError } = await supabase
          .from("client_plan_assignments")
          .select(`
            *,
            training_plans(
              *,
              plan_weeks(
                *,
                plan_workouts(*)
              )
            )
          `)
          .eq("id", assignmentId)
          .single();

        if (assignmentError) throw assignmentError;
        setPlanData(assignment);

        // Get existing overrides
        const { data: existingOverrides, error: overridesError } = await supabase
          .from("plan_workout_overrides")
          .select("*")
          .eq("assignment_id", assignmentId);

        if (overridesError) throw overridesError;

        // Build overrides map
        const overridesMap: Record<string, WorkoutOverride> = {};
        (existingOverrides || []).forEach((override: any) => {
          overridesMap[override.plan_workout_id] = {
            workoutId: override.plan_workout_id,
            workoutName: '',
            coach_notes: override.workout_notes,
            exercise_overrides: override.exercise_overrides || [],
          };
        });
        setOverrides(overridesMap);
      } catch (error) {
        console.error("Error fetching plan data:", error);
        toast.error("Failed to load plan data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [open, assignmentId]);

  const updateWorkoutNotes = (workoutId: string, workoutName: string, notes: string) => {
    setOverrides(prev => ({
      ...prev,
      [workoutId]: {
        ...prev[workoutId],
        workoutId,
        workoutName,
        coach_notes: notes,
        exercise_overrides: prev[workoutId]?.exercise_overrides || [],
      },
    }));
  };

  const updateExerciseOverride = (
    workoutId: string,
    workoutName: string,
    exerciseIndex: number,
    exerciseName: string,
    field: keyof ExerciseOverride,
    value: any
  ) => {
    setOverrides(prev => {
      const workoutOverride = prev[workoutId] || {
        workoutId,
        workoutName,
        exercise_overrides: [],
      };

      const exerciseOverrides = [...workoutOverride.exercise_overrides];
      const existingIndex = exerciseOverrides.findIndex(
        e => e.exerciseIndex === exerciseIndex
      );

      if (existingIndex >= 0) {
        exerciseOverrides[existingIndex] = {
          ...exerciseOverrides[existingIndex],
          [field]: value,
        };
      } else {
        exerciseOverrides.push({
          exerciseIndex,
          exerciseName,
          [field]: value,
        });
      }

      return {
        ...prev,
        [workoutId]: {
          ...workoutOverride,
          exercise_overrides: exerciseOverrides,
        },
      };
    });
  };

  const getExerciseOverride = (workoutId: string, exerciseIndex: number): ExerciseOverride | undefined => {
    return overrides[workoutId]?.exercise_overrides.find(
      e => e.exerciseIndex === exerciseIndex
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete existing overrides
      await supabase
        .from("plan_workout_overrides")
        .delete()
        .eq("assignment_id", assignmentId);

      // Insert new overrides
      const overridesToInsert = Object.values(overrides)
        .filter(o => o.coach_notes || o.exercise_overrides.length > 0)
        .map(o => ({
          assignment_id: assignmentId,
          plan_workout_id: o.workoutId,
          workout_notes: o.coach_notes || null,
          exercise_overrides: o.exercise_overrides.length > 0 
            ? JSON.parse(JSON.stringify(o.exercise_overrides)) 
            : null,
        }));

      if (overridesToInsert.length > 0) {
        const { error } = await supabase
          .from("plan_workout_overrides")
          .insert(overridesToInsert);

        if (error) throw error;
      }

      toast.success("Plan customizations saved");
      onSave?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving overrides:", error);
      toast.error("Failed to save customizations");
    } finally {
      setSaving(false);
    }
  };

  const resetOverrides = () => {
    setOverrides({});
  };

  if (loading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl">
          <div className="flex items-center justify-center h-full">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const weeks = planData?.training_plans?.plan_weeks?.sort(
    (a: any, b: any) => a.week_number - b.week_number
  ) || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Customize Plan for {clientName}</SheetTitle>
          <SheetDescription>
            Adjust sets, reps, and add notes for {planName}. Changes only affect this client.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)] mt-6">
          <div className="space-y-4 pr-4">
            {weeks.map((week: any) => (
              <Accordion key={week.id} type="single" collapsible>
                <AccordionItem value={week.id} className="border rounded-lg">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {week.name || `Week ${week.week_number}`}
                      </span>
                      <Badge variant="secondary">
                        {week.plan_workouts?.length || 0} workouts
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4">
                      {(week.plan_workouts || [])
                        .sort((a: any, b: any) => a.order_index - b.order_index)
                        .map((workout: any) => {
                          const exercises = workout.exercise_data || [];
                          return (
                            <Card key={workout.id}>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Dumbbell className="h-4 w-4" />
                                  {workout.name}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {/* Workout-level notes */}
                                <div>
                                  <Label className="text-xs">Coach Notes for Workout</Label>
                                  <Textarea
                                    placeholder="Add notes visible to client..."
                                    value={overrides[workout.id]?.coach_notes || ''}
                                    onChange={(e) => updateWorkoutNotes(workout.id, workout.name, e.target.value)}
                                    className="mt-1 text-sm"
                                    rows={2}
                                  />
                                </div>

                                <Separator />

                                {/* Exercise overrides */}
                                {exercises.map((exercise: any, idx: number) => {
                                  const override = getExerciseOverride(workout.id, idx);
                                  return (
                                    <div key={idx} className="space-y-2 p-3 bg-muted/50 rounded-lg">
                                      <p className="font-medium text-sm">
                                        {idx + 1}. {exercise.name || `Exercise ${idx + 1}`}
                                      </p>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <Label className="text-xs">Sets Range</Label>
                                          <div className="flex gap-1 items-center mt-1">
                                            <Input
                                              type="number"
                                              placeholder="Min"
                                              className="h-8 text-sm"
                                              value={override?.sets_min || ''}
                                              onChange={(e) => updateExerciseOverride(
                                                workout.id, workout.name, idx, exercise.name,
                                                'sets_min', e.target.value ? parseInt(e.target.value) : undefined
                                              )}
                                            />
                                            <span className="text-muted-foreground">-</span>
                                            <Input
                                              type="number"
                                              placeholder="Max"
                                              className="h-8 text-sm"
                                              value={override?.sets_max || ''}
                                              onChange={(e) => updateExerciseOverride(
                                                workout.id, workout.name, idx, exercise.name,
                                                'sets_max', e.target.value ? parseInt(e.target.value) : undefined
                                              )}
                                            />
                                          </div>
                                        </div>
                                        <div>
                                          <Label className="text-xs">Reps Range</Label>
                                          <div className="flex gap-1 items-center mt-1">
                                            <Input
                                              type="number"
                                              placeholder="Min"
                                              className="h-8 text-sm"
                                              value={override?.reps_min || ''}
                                              onChange={(e) => updateExerciseOverride(
                                                workout.id, workout.name, idx, exercise.name,
                                                'reps_min', e.target.value ? parseInt(e.target.value) : undefined
                                              )}
                                            />
                                            <span className="text-muted-foreground">-</span>
                                            <Input
                                              type="number"
                                              placeholder="Max"
                                              className="h-8 text-sm"
                                              value={override?.reps_max || ''}
                                              onChange={(e) => updateExerciseOverride(
                                                workout.id, workout.name, idx, exercise.name,
                                                'reps_max', e.target.value ? parseInt(e.target.value) : undefined
                                              )}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <Label className="text-xs">Rest Time (sec)</Label>
                                          <Input
                                            type="number"
                                            placeholder={exercise.rest_seconds?.toString() || "90"}
                                            min={0}
                                            step={15}
                                            className="h-8 text-sm mt-1"
                                            value={override?.rest_seconds || ''}
                                            onChange={(e) => updateExerciseOverride(
                                              workout.id, workout.name, idx, exercise.name,
                                              'rest_seconds', e.target.value ? parseInt(e.target.value) : undefined
                                            )}
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-xs">Load Guidance</Label>
                                          <Input
                                            placeholder="e.g., 70-75% 1RM"
                                            className="h-8 text-sm mt-1"
                                            value={override?.load_guidance || ''}
                                            onChange={(e) => updateExerciseOverride(
                                              workout.id, workout.name, idx, exercise.name,
                                              'load_guidance', e.target.value
                                            )}
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <Label className="text-xs">Exercise Notes</Label>
                                        <Textarea
                                          placeholder="Specific cues or modifications..."
                                          className="text-sm mt-1"
                                          rows={2}
                                          value={override?.coach_notes || ''}
                                          onChange={(e) => updateExerciseOverride(
                                            workout.id, workout.name, idx, exercise.name,
                                            'coach_notes', e.target.value
                                          )}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}

                                {exercises.length === 0 && (
                                  <p className="text-sm text-muted-foreground">
                                    No exercises defined for this workout
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ))}
          </div>
        </ScrollArea>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={resetOverrides} className="flex-1">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
