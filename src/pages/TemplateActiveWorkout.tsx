import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkoutTemplate, useWorkoutTemplates } from "@/hooks/useWorkoutTemplates";
import ActiveWorkout from "./ActiveWorkout";
import type { Workout, Exercise } from "@/data/workouts";
import { useEffect, useRef } from "react";
import { isTemplateSupersetBlock, type WorkoutStructureData } from "@/types/workout-templates";

/**
 * Wrapper component that loads a workout template from the database
 * and converts it to the Workout format expected by ActiveWorkout.
 * Handles both template routes and split workout routes.
 */
export default function TemplateActiveWorkout() {
  const { templateId, splitId, workoutId } = useParams<{ 
    templateId?: string; 
    splitId?: string; 
    workoutId?: string;
  }>();
  const navigate = useNavigate();
  const { incrementUseCount } = useWorkoutTemplates();
  const hasIncrementedRef = useRef(false);

  // For direct template routes
  const { data: template, isLoading: templateLoading, error: templateError } = useWorkoutTemplate(
    !splitId ? templateId : undefined
  );

  // For split workout routes - fetch the split_workout and resolve its data
  const { data: splitWorkoutData, isLoading: splitLoading, error: splitError } = useQuery({
    queryKey: ['split-workout-for-execution', splitId, workoutId],
    queryFn: async () => {
      if (!splitId || !workoutId) return null;

      // Fetch the split workout
      const { data: sw, error } = await supabase
        .from('split_workouts')
        .select('*, split_weeks!inner(split_id, name, week_number)')
        .eq('id', workoutId)
        .single();

      if (error) throw error;
      if (!sw) return null;

      // If it references a workout_template, fetch that
      if (sw.workout_template_id) {
        const { data: tmpl, error: tmplError } = await supabase
          .from('workout_templates')
          .select('*')
          .eq('id', sw.workout_template_id)
          .single();

        if (tmplError) throw tmplError;
        return {
          id: sw.id,
          title: sw.day_label || tmpl?.title || 'Workout',
          exercise_data: Array.isArray(tmpl?.exercise_data) ? tmpl.exercise_data : [],
          splitId,
          workoutId: sw.id,
        };
      }

      // Otherwise use embedded_workout_data
      return {
        id: sw.id,
        title: sw.day_label || `Workout ${(sw.order_index || 0) + 1}`,
        exercise_data: Array.isArray(sw.embedded_workout_data) ? sw.embedded_workout_data : [],
        splitId,
        workoutId: sw.id,
      };
    },
    enabled: !!splitId && !!workoutId,
  });

  const isLoading = templateLoading || splitLoading;
  const error = templateError || splitError;
  const resolvedData = splitId ? splitWorkoutData : template;

  // Increment use count once when starting (only for templates)
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

  if (error || !resolvedData) {
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
  const convertItemToExercises = (item: any, baseIndex: number): Exercise[] => {
    if (item.type === 'superset' && item.items) {
      return item.items.map((ex: any, i: number) => {
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
  const exerciseData = (resolvedData as any).exercise_data || [];
  const exercises: Exercise[] = [];
  let index = 0;
  for (const item of exerciseData) {
    const converted = convertItemToExercises(item, index);
    exercises.push(...converted);
    index += converted.length;
  }

  const workout: Workout & { exercise_data?: any[] } = {
    id: resolvedData.id,
    name: (resolvedData as any).title || 'Workout',
    type: (resolvedData as any).workout_type || 'mixed',
    duration: (resolvedData as any).estimated_duration_minutes || 45,
    description: (resolvedData as any).description || undefined,
    exercises,
    exercise_data: exerciseData,
  };

  return <ActiveWorkout templateWorkout={workout} />;
}
