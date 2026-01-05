import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format } from "date-fns";
import { Dumbbell, Clock, Activity } from "lucide-react";

interface WorkoutSession {
  id: string;
  workout_name: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  total_volume: number | null;
  status: string;
}

interface WorkoutDaySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  workouts: WorkoutSession[];
  onWorkoutClick: (workout: WorkoutSession) => void;
}

export const WorkoutDaySheet = ({
  open,
  onOpenChange,
  selectedDate,
  workouts,
  onWorkoutClick,
}: WorkoutDaySheetProps) => {
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
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
      <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg">
            {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Workouts"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-3 overflow-y-auto max-h-[calc(60vh-100px)]">
          {workouts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No workouts logged for this day
            </p>
          ) : (
            workouts.map((workout) => (
              <button
                key={workout.id}
                onClick={() => onWorkoutClick(workout)}
                className="w-full p-4 bg-muted/50 rounded-xl border border-border/50 text-left transition-all hover:bg-muted active:scale-[0.98]"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-foreground">
                    {workout.workout_name}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(workout.started_at), "h:mm a")}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatDuration(workout.duration_seconds)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Dumbbell className="h-3.5 w-3.5" />
                    <span>{formatVolume(workout.total_volume)}</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
