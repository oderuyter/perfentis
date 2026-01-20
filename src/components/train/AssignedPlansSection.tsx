import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Calendar, 
  ChevronRight, 
  User, 
  Play, 
  Check,
  Clock
} from "lucide-react";
import { useAssignedPlans, useTodaysCoachWorkout } from "@/hooks/useAssignedPlans";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export function AssignedPlansSection() {
  const { assignedPlans, isLoading } = useAssignedPlans();
  const { data: todaysWorkout } = useTodaysCoachWorkout();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!assignedPlans.length) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <User className="h-4 w-4" />
        Assigned by Coach
      </h2>

      {/* Today's Workout CTA */}
      {todaysWorkout && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Link to={`/workout/assigned/${todaysWorkout.assignment.assignment_id}/${todaysWorkout.workout.id}`}>
            <div className="card-glass border-primary/30 p-4 relative overflow-hidden group active:scale-[0.98] transition-transform">
              {/* Accent gradient */}
              <div className="absolute inset-0 gradient-card-accent opacity-20 group-hover:opacity-30 transition-opacity" />
              
              <div className="relative flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default" className="text-xs bg-primary/90">
                      Today's Workout
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-lg text-foreground">
                    {todaysWorkout.workout.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    from {todaysWorkout.assignment.plan_name}
                  </p>
                </div>
                <Button size="icon" className="h-12 w-12 rounded-full">
                  <Play className="h-5 w-5 ml-0.5" />
                </Button>
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      {/* Assigned Plans List */}
      <div className="space-y-3">
        {assignedPlans.map((plan, index) => (
          <motion.div
            key={plan.assignment_id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
          >
            <Link to={`/plan/${plan.assignment_id}`}>
              <div className="card-glass p-4 active:scale-[0.98] transition-transform">
                <div className="flex items-start gap-3">
                  {/* Coach Avatar */}
                  <Avatar className="h-10 w-10 border-2 border-background">
                    <AvatarImage src={plan.coach_avatar || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {plan.coach_name?.charAt(0) || "C"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-base text-foreground truncate">
                          {plan.plan_name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          by {plan.coach_name}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>

                    {/* Progress */}
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Week {plan.current_week} of {plan.duration_weeks}
                        </span>
                        <span className="font-medium">
                          {plan.progress_percentage || 0}%
                        </span>
                      </div>
                      <Progress 
                        value={plan.progress_percentage || 0} 
                        className="h-1.5" 
                      />
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{plan.completed_workouts}/{plan.total_workouts} workouts</span>
                      </div>
                      {plan.last_workout_at && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            Last: {new Date(plan.last_workout_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
