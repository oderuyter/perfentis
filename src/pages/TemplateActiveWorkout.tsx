import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useWorkoutTemplate, useWorkoutTemplates } from "@/hooks/useWorkoutTemplates";
import ActiveWorkout from "./ActiveWorkout";
import type { Workout, Exercise } from "@/data/workouts";
import { useEffect, useRef } from "react";
import { isTemplateSupersetBlock, type WorkoutStructureData } from "@/types/workout-templates";

/**
 * Wrapper component that loads a workout template from the database
 * and converts it to the Workout format expected by ActiveWorkout
 */
export default function TemplateActiveWorkout() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { data: template, isLoading, error } = useWorkoutTemplate(templateId);
  const { incrementUseCount } = useWorkoutTemplates();
  const hasIncrementedRef = useRef(false);

  // Increment use count once when starting
  useEffect(() => {
    if (templateId && template && !hasIncrementedRef.current) {
      incrementUseCount(templateId);
      hasIncrementedRef.current = true;
    }
  }, [templateId, template, incrementUseCount]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">Workout template not found</p>
        <button 
          onClick={() => navigate("/train")}
          className="text-primary underline"
        >
          Back to Train
        </button>
      </div>
    );
  }

  // Convert template data to Workout format, flattening supersets
  const convertItemToExercises = (item: WorkoutStructureData, baseIndex: number): Exercise[] => {
    if (isTemplateSupersetBlock(item)) {
      // Flatten superset items into individual exercises
      // For now we treat them as sequential exercises
      // TODO: Add superset execution logic to ActiveWorkout
      return item.items.map((ex, i) => {
        const reps = ex.reps_min && ex.reps_max && ex.reps_min !== ex.reps_max
          ? `${ex.reps_min}-${ex.reps_max}`
          : String(ex.reps || ex.reps_min || 10);

        return {
          id: ex.exercise_id || `ex-${baseIndex}-${i}`,
          name: `${item.name || 'Superset'}: ${ex.name}`,
          sets: ex.sets,
          reps,
          notes: ex.notes,
          exerciseType: ex.exercise_type || 'strength',
          // Use between-exercise rest for superset items
          restDuration: item.rest_between_exercises_seconds || 0,
        } as Exercise;
      });
    }

    // Regular exercise
    const reps = item.reps_min && item.reps_max && item.reps_min !== item.reps_max
      ? `${item.reps_min}-${item.reps_max}`
      : String(item.reps || item.reps_min || 10);

    const exercise: Exercise = {
      id: item.exercise_id || `ex-${baseIndex}`,
      name: item.name,
      sets: item.sets,
      reps,
      notes: item.notes,
      exerciseType: item.exercise_type || 'strength',
    };

    if (item.rest_seconds) {
      (exercise as any).restDuration = item.rest_seconds;
    }

    return [exercise];
  };

  // Flatten all items into exercises
  const exercises: Exercise[] = [];
  let index = 0;
  for (const item of template.exercise_data || []) {
    const converted = convertItemToExercises(item, index);
    exercises.push(...converted);
    index += converted.length;
  }

  const workout: Workout = {
    id: template.id,
    name: template.title,
    type: template.workout_type,
    duration: template.estimated_duration_minutes || 45,
    description: template.description || undefined,
    exercises,
  };

  // Pass the converted workout to ActiveWorkout via a special prop
  return <ActiveWorkout templateWorkout={workout} />;
}
