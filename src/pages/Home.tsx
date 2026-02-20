import { motion } from "framer-motion";
import { Clock, ChevronRight, Play, Target, TrendingUp, Trophy, Flame, TrendingDown, Minus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { todayWorkout } from "@/data/workouts";
import { Button } from "@/components/ui/button";
import { NextEventCard } from "@/components/events/NextEventCard";
import { useActiveSplit } from "@/hooks/useTrainingSplits";
import { loadSavedWorkout } from "@/hooks/useWorkoutState";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { WorkoutRecoveryPrompt } from "@/components/train/WorkoutRecoveryPrompt";
import { RunRecoveryPrompt } from "@/components/run/RunRecoveryPrompt";
import { useProgressData } from "@/hooks/useProgressData";
import { usePersonalRecords } from "@/hooks/usePersonalRecords";

export default function Home() {
  const greeting = getGreeting();
  const navigate = useNavigate();
  const { activeSplit, nextWorkout, progress, isLoading: splitLoading } = useActiveSplit();
  const savedWorkout = loadSavedWorkout();
  const hasActiveSession = savedWorkout && savedWorkout.status === 'active';
  const { weeklySummary, loading: progressLoading } = useProgressData();
  const { recentPRs } = usePersonalRecords();

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

  // Compute real stats
  const sessionsThisWeek = weeklySummary?.sessions ?? 0;
  const volumeThisWeek = weeklySummary?.volume ?? 0;
  const prevVolume = weeklySummary?.prevVolume ?? 0;
  const volumeChange = prevVolume > 0
    ? Math.round(((volumeThisWeek - prevVolume) / prevVolume) * 100)
    : null;
  const mostRecentPR = recentPRs?.[0] ?? null;
  
  return (
    <div className="min-h-screen gradient-page px-5 overflow-x-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 gradient-glow pointer-events-none" />
      
      {/* Header */}
      <header className="relative pt-6 pb-5">
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

      {/* Content */}
      <div className="relative space-y-4">
        {/* Recovery Prompts — sticky-style banners at the very top */}
        <WorkoutRecoveryPrompt />
        <RunRecoveryPrompt />

        {/* ===== HERO: Active Session Resume ===== */}
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

        {/* ===== HERO: Next Program Workout ===== */}
        {!hasActiveSession && activeSplit && nextWorkout && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <div className="card-glass-accent p-5 active:scale-[0.99] transition-transform duration-150">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">{activeSplit.training_split?.title}</Badge>
                    <span className="text-xs text-muted-foreground">{nextWorkout.week.name || `Week ${nextWorkout.weekNumber}`}</span>
                  </div>
                  <h2 className="text-xl font-semibold mt-1.5 tracking-tight">
                    {nextWorkout.workout.day_label || `Workout ${nextWorkout.workout.order_index + 1}`}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Next in your program</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums mt-1">
                    {progress.completedWorkouts}/{progress.totalWorkouts}
                  </span>
                </div>
              </div>

              {/* Compact progress */}
              <Progress value={progress.percentage} className="h-1.5 mb-4" />
              
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

        {/* ===== HERO: Fallback Static Workout ===== */}
        {!hasActiveSession && !activeSplit && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <Link to={`/workout/${todayWorkout.id}`} className="block">
              <div className="card-glass-accent p-5 active:scale-[0.99] transition-transform duration-150">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="section-label text-primary">Today's Workout</p>
                    <h2 className="text-xl font-semibold mt-1.5 tracking-tight">
                      {todayWorkout.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-sm">{todayWorkout.duration} min</span>
                      <span className="text-muted-foreground/30">•</span>
                      <span className="text-sm capitalize">{todayWorkout.type}</span>
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
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

        {/* ===== NEXT EVENT ===== */}
        <NextEventCard />

        {/* ===== AT-A-GLANCE STATS — 3 column grid ===== */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="grid grid-cols-3 gap-3"
        >
          {/* Sessions */}
          <div className="card-glass p-4 flex flex-col items-center text-center">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Flame className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold tracking-tight tabular-nums leading-none">
              {progressLoading ? "–" : sessionsThisWeek}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Sessions</p>
          </div>

          {/* Volume */}
          <Link to="/progress" className="block">
            <div className="card-glass p-4 flex flex-col items-center text-center h-full active:scale-[0.98] transition-transform">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold tracking-tight tabular-nums leading-none">
                {progressLoading ? "–" : volumeThisWeek >= 1000 ? `${(volumeThisWeek / 1000).toFixed(0)}k` : volumeThisWeek.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Volume (kg)</p>
              {volumeChange !== null && (
                <p className={`text-[10px] font-medium mt-0.5 flex items-center gap-0.5 ${volumeChange >= 0 ? "text-status-success" : "text-destructive"}`}>
                  {volumeChange >= 0
                    ? <TrendingUp className="h-2.5 w-2.5" />
                    : <TrendingDown className="h-2.5 w-2.5" />}
                  {volumeChange >= 0 ? "+" : ""}{volumeChange}%
                </p>
              )}
              {volumeChange === null && !progressLoading && (
                <p className="text-[10px] text-muted-foreground/50 mt-0.5 flex items-center gap-0.5">
                  <Minus className="h-2.5 w-2.5" /> –
                </p>
              )}
            </div>
          </Link>

          {/* PR */}
          <div className="card-glass p-4 flex flex-col items-center text-center">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            {mostRecentPR ? (
              <>
                <p className="text-sm font-bold tracking-tight leading-tight">
                  {mostRecentPR.weight != null && mostRecentPR.reps != null
                    ? `${mostRecentPR.weight}kg`
                    : `${mostRecentPR.value.toFixed(0)}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1 truncate w-full">{mostRecentPR.exercise_name}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold tracking-tight leading-tight text-muted-foreground">–</p>
                <p className="text-xs text-muted-foreground mt-1">No PRs yet</p>
              </>
            )}
          </div>
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
