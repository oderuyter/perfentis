import { motion } from "framer-motion";
import { Clock, ChevronRight, Play, Target, Timer } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { todayWorkout, weeklyStats } from "@/data/workouts";
import { Button } from "@/components/ui/button";
import { NextEventCard } from "@/components/events/NextEventCard";
import { useActiveSplit } from "@/hooks/useTrainingSplits";
import { loadSavedWorkout } from "@/hooks/useWorkoutState";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function Home() {
  const greeting = getGreeting();
  const navigate = useNavigate();
  const { activeSplit, nextWorkout, progress, isLoading: splitLoading } = useActiveSplit();
  const savedWorkout = loadSavedWorkout();
  const hasActiveSession = savedWorkout && savedWorkout.status === 'active';

  const handleStartNext = () => {
    if (nextWorkout) {
      navigate(`/workout/split/${activeSplit!.split_id}/${nextWorkout.workout.id}/active`);
    }
  };

  const handleResumeSession = () => {
    if (savedWorkout) {
      navigate(`/workout/${savedWorkout.workoutId}/active`);
    }
  };
  
  return (
    <div className="min-h-screen gradient-page px-5 overflow-x-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 gradient-glow pointer-events-none" />
      
      {/* Header */}
      <header className="relative pt-6 pb-8">
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-muted-foreground text-sm font-medium"
        >
          {greeting}
        </motion.p>
        <motion.h1 
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="text-2xl font-semibold tracking-tight mt-1"
        >
          Ready to train?
        </motion.h1>
      </header>

      {/* Cards */}
      <div className="relative space-y-5">
        {/* Active Session Resume Card */}
        {hasActiveSession && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
          >
            <button onClick={handleResumeSession} className="block w-full text-left">
              <div className="card-glass-accent p-5 active:scale-[0.99] transition-transform duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center">
                      <Play className="h-5 w-5 text-accent-foreground ml-0.5" />
                    </div>
                    <div>
                      <p className="section-label text-accent-foreground">Active Workout</p>
                      <h2 className="text-lg font-semibold mt-0.5">{savedWorkout.workoutName}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {Math.floor(savedWorkout.elapsedTime / 60)}m elapsed • {savedWorkout.exercises.filter((e: any) => e.sets.some((s: any) => s.completed)).length}/{savedWorkout.exercises.length} exercises
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </button>
          </motion.div>
        )}

        {/* Active Split - Next Workout Card */}
        {!hasActiveSession && activeSplit && nextWorkout && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <div className="card-glass-accent p-6 active:scale-[0.99] transition-transform duration-150">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">{activeSplit.training_split?.title}</Badge>
                    <span className="text-xs text-muted-foreground">{nextWorkout.week.name || `Week ${nextWorkout.weekNumber}`}</span>
                  </div>
                  <h2 className="text-xl font-semibold mt-2 tracking-tight">
                    {nextWorkout.workout.day_label || `Workout ${nextWorkout.workout.order_index + 1}`}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Next in your program</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-primary" />
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span>{progress.completedWorkouts}/{progress.totalWorkouts}</span>
                </div>
                <Progress value={progress.percentage} className="h-1.5" />
              </div>
              
              <Button 
                variant="glow"
                className="w-full h-12 rounded-xl font-semibold"
                onClick={handleStartNext}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Workout
              </Button>
            </div>
          </motion.div>
        )}

        {/* Fallback: Static Today's Workout (when no active split) */}
        {!hasActiveSession && !activeSplit && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <Link to={`/workout/${todayWorkout.id}`} className="block">
              <div className="card-glass-accent p-6 active:scale-[0.99] transition-transform duration-150">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="section-label text-primary">
                      Today's Workout
                    </p>
                    <h2 className="text-xl font-semibold mt-2 tracking-tight">
                      {todayWorkout.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-2.5 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{todayWorkout.duration} min</span>
                      <span className="text-muted-foreground/30">•</span>
                      <span className="text-sm capitalize">{todayWorkout.type}</span>
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Play className="h-5 w-5 text-primary ml-0.5" />
                  </div>
                </div>
                
                <Button 
                  variant="glow"
                  className="w-full h-12 rounded-xl font-semibold"
                  onClick={(e) => e.stopPropagation()}
                  asChild
                >
                  <Link to={`/workout/${todayWorkout.id}/active`}>
                    Start Workout
                  </Link>
                </Button>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Next Event Card */}
        <NextEventCard />

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Weekly Sessions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <div className="card-glass p-5">
              <p className="section-label">
                This Week
              </p>
              <p className="text-3xl font-bold mt-3.5 tracking-tight tabular-nums">
                {weeklyStats.sessionsCompleted}
                <span className="text-muted-foreground text-lg font-normal">
                  /{weeklyStats.sessionsGoal}
                </span>
              </p>
              <p className="text-sm text-muted-foreground mt-1.5">
                Sessions
              </p>
            </div>
          </motion.div>

          {/* Recent PR */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <div className="card-glass p-5">
              <p className="section-label">
                Recent PR
              </p>
              <p className="text-xl font-bold mt-3.5 leading-tight tracking-tight">
                {weeklyStats.recentPR.value}
              </p>
              <p className="text-sm text-muted-foreground mt-1.5">
                {weeklyStats.recentPR.exercise}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Volume Trend Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link to="/progress" className="block">
            <div className="card-glass p-5 flex items-center justify-between active:scale-[0.99] transition-transform duration-150">
              <div>
                <p className="section-label">
                  Weekly Volume
                </p>
                <p className="text-2xl font-bold mt-2.5 tracking-tight tabular-nums">
                  {(weeklyStats.volumeThisWeek / 1000).toFixed(1)}k kg
                </p>
                <p className="text-sm text-status-success mt-1.5 font-medium">
                  +{Math.round(((weeklyStats.volumeThisWeek - weeklyStats.volumeLastWeek) / weeklyStats.volumeLastWeek) * 100)}% vs last week
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
            </div>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
