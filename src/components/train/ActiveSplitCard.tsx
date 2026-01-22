import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, ChevronRight, Calendar, Target, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveSplit } from "@/hooks/useTrainingSplits";
import { Skeleton } from "@/components/ui/skeleton";

export function ActiveSplitCard() {
  const navigate = useNavigate();
  const { activeSplit, isLoading, nextWorkout, progress, clearActiveSplit } = useActiveSplit();

  if (isLoading) {
    return (
      <div className="card-glass p-4 space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-2 w-full" />
      </div>
    );
  }

  // No active split - show prompt
  if (!activeSplit) {
    return (
      <div className="rounded-xl p-4 border border-dashed border-border/50 bg-surface-card/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">No active split</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              Set an active split to organize your training
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/train?tab=splits')}
          >
            Browse Splits
          </Button>
        </div>
      </div>
    );
  }

  const split = activeSplit.training_split;
  if (!split) return null;

  const handleStartNext = () => {
    if (nextWorkout) {
      // Navigate to workout with split context
      navigate(`/workout/split/${activeSplit.split_id}/${nextWorkout.workout.id}/active`);
    }
  };

  const weekLabel = split.weeks_count 
    ? `Week ${activeSplit.current_week} / ${split.weeks_count}`
    : `Week ${activeSplit.current_week}`;

  return (
    <div className="card-glass p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Active Split
            </Badge>
            <span className="text-xs text-muted-foreground">{weekLabel}</span>
          </div>
          <h3 className="font-semibold text-lg mt-1">{split.title}</h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/train/split/${activeSplit.split_id}`}>
                View Split Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => clearActiveSplit.mutate()}
            >
              Change Active Split
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Progress</span>
          <span>{progress.completedWorkouts} / {progress.totalWorkouts} workouts</span>
        </div>
        <Progress value={progress.percentage} className="h-2" />
      </div>

      {/* Next workout */}
      {nextWorkout ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/12 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Next: {nextWorkout.workout.day_label || `Workout ${nextWorkout.workout.order_index + 1}`}</p>
              <p className="text-xs text-muted-foreground">{nextWorkout.week.name || `Week ${nextWorkout.weekNumber}`}</p>
            </div>
          </div>
          <Button onClick={handleStartNext} size="sm" className="gap-2">
            <Play className="h-4 w-4" />
            Start
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">
          🎉 All workouts completed!
        </p>
      )}
    </div>
  );
}
