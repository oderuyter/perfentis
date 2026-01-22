import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Play, 
  Calendar, 
  Clock, 
  Target,
  MoreHorizontal,
  Edit,
  Share,
  Trash2,
  ChevronDown,
  Dumbbell,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrainingSplit, useActiveSplit } from "@/hooks/useTrainingSplits";
import { useAuth } from "@/hooks/useAuth";
import { DIFFICULTY_LABELS, WORKOUT_TYPE_LABELS } from "@/types/workout-templates";

export default function SplitDetail() {
  const { splitId } = useParams<{ splitId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: split, isLoading, error } = useTrainingSplit(splitId);
  const { activeSplit, setActiveSplit, completions } = useActiveSplit();

  const isOwner = split?.owner_user_id === user?.id;
  const isActive = activeSplit?.split_id === splitId;
  const completedIds = new Set(completions.map(c => c.split_workout_id));

  const handleSetActive = () => {
    if (splitId) {
      setActiveSplit.mutate(splitId);
    }
  };

  const handleStartWorkout = (workoutId: string) => {
    navigate(`/workout/split/${splitId}/${workoutId}/active`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-page pt-safe px-4 pb-28">
        <div className="fixed inset-0 gradient-glow pointer-events-none" />
        <header className="relative pt-14 pb-4">
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </header>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !split) {
    return (
      <div className="min-h-screen gradient-page pt-safe px-4 pb-28 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">Split not found</h1>
          <Button variant="outline" onClick={() => navigate('/train')}>
            Back to Train
          </Button>
        </div>
      </div>
    );
  }

  const totalWorkouts = split.split_weeks?.reduce(
    (sum, w) => sum + (w.split_workouts?.length || 0),
    0
  ) || 0;

  const completedCount = split.split_weeks?.reduce(
    (sum, w) => sum + (w.split_workouts?.filter(sw => completedIds.has(sw.id)).length || 0),
    0
  ) || 0;

  return (
    <div className="min-h-screen gradient-page pt-safe px-4 pb-28">
      <div className="fixed inset-0 gradient-glow pointer-events-none" />
      
      {/* Header */}
      <header className="relative pt-14 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/train')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/train/split/${splitId}/edit`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Split
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share className="h-4 w-4 mr-2" />
                  Share to Community
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-2">
            {isActive && (
              <Badge variant="secondary">Active</Badge>
            )}
            {split.is_curated && (
              <Badge variant="outline">Curated</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{split.title}</h1>
          {split.description && (
            <p className="text-muted-foreground mt-1">{split.description}</p>
          )}
        </motion.div>

        {/* Meta */}
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          {split.weeks_count && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {split.weeks_count} weeks
            </div>
          )}
          {split.days_per_week && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {split.days_per_week} days/week
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Dumbbell className="h-4 w-4" />
            {totalWorkouts} workouts
          </div>
          {split.difficulty_level && (
            <Badge variant="outline" className="capitalize">
              {DIFFICULTY_LABELS[split.difficulty_level]}
            </Badge>
          )}
        </div>

        {/* Progress (if active) */}
        {isActive && totalWorkouts > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{completedCount} / {totalWorkouts}</span>
            </div>
            <Progress value={(completedCount / totalWorkouts) * 100} className="h-2" />
          </div>
        )}

        {/* Set Active Button */}
        {!isActive && (
          <Button 
            onClick={handleSetActive} 
            className="w-full mt-4"
            disabled={setActiveSplit.isPending}
          >
            <Target className="h-4 w-4 mr-2" />
            Set as Active Split
          </Button>
        )}
      </header>

      {/* Weeks Accordion */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-4"
      >
        <Accordion type="multiple" defaultValue={[split.split_weeks?.[0]?.id || '']}>
          {split.split_weeks?.map((week) => {
            const weekCompleted = week.split_workouts?.filter(sw => completedIds.has(sw.id)).length || 0;
            const weekTotal = week.split_workouts?.length || 0;

            return (
              <AccordionItem key={week.id} value={week.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center text-sm font-medium">
                      W{week.week_number}
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{week.name || `Week ${week.week_number}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {weekCompleted} / {weekTotal} completed
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pl-12">
                    {week.split_workouts?.map((workout) => {
                      const isCompleted = completedIds.has(workout.id);
                      const workoutTitle = workout.day_label || 
                        workout.workout_template?.title || 
                        `Workout ${workout.order_index + 1}`;

                      return (
                        <div 
                          key={workout.id}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            isCompleted ? 'bg-muted/30' : 'bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {isCompleted ? (
                              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <Check className="h-4 w-4 text-primary" />
                              </div>
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                {workout.order_index + 1}
                              </div>
                            )}
                            <div>
                              <p className={`text-sm font-medium ${isCompleted ? 'text-muted-foreground' : ''}`}>
                                {workoutTitle}
                              </p>
                              {workout.notes && (
                                <p className="text-xs text-muted-foreground">{workout.notes}</p>
                              )}
                            </div>
                          </div>
                          {!isCompleted && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleStartWorkout(workout.id)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </motion.div>
    </div>
  );
}
