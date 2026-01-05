import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Clock, Dumbbell, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface WorkoutSession {
  id: string;
  workout_name: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  total_volume: number | null;
  status: string;
}

interface SetLog {
  id: string;
  set_number: number;
  target_weight: number | null;
  target_reps: number | null;
  completed_weight: number | null;
  completed_reps: number | null;
  is_completed: boolean | null;
  rpe: number | null;
}

interface ExerciseLog {
  id: string;
  exercise_name: string;
  exercise_order: number;
  notes: string | null;
  sets: SetLog[];
}

interface WorkoutDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout: WorkoutSession | null;
  onBack: () => void;
}

export const WorkoutDetailSheet = ({
  open,
  onOpenChange,
  workout,
  onBack,
}: WorkoutDetailSheetProps) => {
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (workout && open) {
      fetchExerciseDetails();
    }
  }, [workout, open]);

  const fetchExerciseDetails = async () => {
    if (!workout) return;

    setLoading(true);
    try {
      // Fetch exercise logs
      const { data: exerciseLogs, error: exerciseError } = await supabase
        .from("exercise_logs")
        .select("*")
        .eq("session_id", workout.id)
        .order("exercise_order", { ascending: true });

      if (exerciseError) throw exerciseError;

      // Fetch set logs for each exercise
      const exercisesWithSets: ExerciseLog[] = await Promise.all(
        (exerciseLogs || []).map(async (exercise) => {
          const { data: setLogs, error: setError } = await supabase
            .from("set_logs")
            .select("*")
            .eq("exercise_log_id", exercise.id)
            .order("set_number", { ascending: true });

          if (setError) throw setError;

          return {
            ...exercise,
            sets: setLogs || [],
          };
        })
      );

      setExercises(exercisesWithSets);
    } catch (error) {
      console.error("Error fetching exercise details:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}h ${remainMins}m`;
  };

  const formatVolume = (volume: number | null) => {
    if (!volume) return "—";
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}k kg`;
    return `${volume.toFixed(0)} kg`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-8 w-8 -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <SheetTitle className="text-lg flex-1">
              {workout?.workout_name || "Workout Details"}
            </SheetTitle>
          </div>
        </SheetHeader>

        {workout && (
          <>
            {/* Workout Summary */}
            <div className="flex items-center gap-4 py-3 mb-4 border-b border-border/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatDuration(workout.duration_seconds)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Dumbbell className="h-4 w-4" />
                <span>{formatVolume(workout.total_volume)}</span>
              </div>
              <span className="text-sm text-muted-foreground ml-auto">
                {format(new Date(workout.started_at), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>

            {/* Exercise List */}
            <ScrollArea className="h-[calc(85vh-180px)]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : exercises.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No exercises logged
                </p>
              ) : (
                <div className="space-y-4 pr-4">
                  {exercises.map((exercise, index) => (
                    <div
                      key={exercise.id}
                      className="bg-muted/30 rounded-xl p-4 border border-border/30"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {index + 1}
                        </span>
                        <h4 className="font-semibold text-foreground">
                          {exercise.exercise_name}
                        </h4>
                      </div>

                      {exercise.notes && (
                        <p className="text-sm text-muted-foreground mb-3 italic">
                          {exercise.notes}
                        </p>
                      )}

                      {/* Sets Table */}
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground font-medium px-2">
                          <span>Set</span>
                          <span className="text-center">Weight</span>
                          <span className="text-center">Reps</span>
                          <span className="text-center">RPE</span>
                        </div>
                        {exercise.sets.map((set) => (
                          <div
                            key={set.id}
                            className={`grid grid-cols-4 gap-2 text-sm py-2 px-2 rounded-lg ${
                              set.is_completed
                                ? "bg-primary/5"
                                : "bg-muted/50 opacity-60"
                            }`}
                          >
                            <span className="font-medium text-foreground">
                              {set.set_number}
                            </span>
                            <span className="text-center text-foreground">
                              {set.completed_weight ?? set.target_weight ?? "—"} kg
                            </span>
                            <span className="text-center text-foreground">
                              {set.completed_reps ?? set.target_reps ?? "—"}
                            </span>
                            <span className="text-center text-muted-foreground">
                              {set.rpe ? `@${set.rpe}` : "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
