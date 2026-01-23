import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useWorkoutTemplate, useWorkoutTemplates } from "@/hooks/useWorkoutTemplates";
import ActiveWorkout from "./ActiveWorkout";
import type { Workout, Exercise } from "@/data/workouts";
import { useEffect, useRef } from "react";

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

  // Convert template data to Workout format
  const workout: Workout = {
    id: template.id,
    name: template.title,
    type: template.workout_type,
    duration: template.estimated_duration_minutes || 45,
    description: template.description || undefined,
    exercises: (template.exercise_data || []).map((ex, index) => {
      const reps = ex.reps_min && ex.reps_max && ex.reps_min !== ex.reps_max
        ? `${ex.reps_min}-${ex.reps_max}`
        : String(ex.reps || ex.reps_min || 10);
      
      const exercise: Exercise = {
        id: ex.exercise_id || `ex-${index}`,
        name: ex.name,
        sets: ex.sets,
        reps,
        notes: ex.notes,
        exerciseType: ex.exercise_type || 'strength',
      };

      // Add rest duration if specified
      if (ex.rest_seconds) {
        (exercise as any).restDuration = ex.rest_seconds;
      }

      return exercise;
    }),
  };

  // Pass the converted workout to ActiveWorkout via a special prop
  return <ActiveWorkout templateWorkout={workout} />;
}
