import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Award, Timer, Dumbbell, Calendar } from "lucide-react";
import { useWorkoutHistory, WorkoutSession } from "@/hooks/useWorkoutHistory";
import { usePersonalRecords } from "@/hooks/usePersonalRecords";
import { useWorkoutStreak } from "@/hooks/useWorkoutStreak";
import { format, subWeeks, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { WorkoutCalendar } from "@/components/progress/WorkoutCalendar";
import { WorkoutDaySheet } from "@/components/progress/WorkoutDaySheet";
import { WorkoutDetailSheet } from "@/components/progress/WorkoutDetailSheet";
import { StreakCard } from "@/components/progress/StreakCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface WeeklyData {
  week: string;
  volume: number;
  sessions: number;
}

export default function Progress() {
  const { user } = useAuth();
  const { getRecentWorkouts } = useWorkoutHistory();
  const { getRecentPRs } = usePersonalRecords();
  const { currentStreak, longestStreak, workoutDates, milestones, loading: streakLoading } = useWorkoutStreak();
  
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [recentPRs, setRecentPRs] = useState<Array<{
    exercise_name: string;
    achieved_at: string;
    value: number;
    weight: number | null;
    reps: number | null;
  }>>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);

  // Sheet states for calendar drill-down
  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayWorkouts, setSelectedDayWorkouts] = useState<WorkoutSession[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutSession | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [workoutsData, prsData] = await Promise.all([
        getRecentWorkouts(50),
        getRecentPRs(5)
      ]);
      
      setWorkouts(workoutsData);
      setRecentPRs(prsData);
      
      // Calculate weekly data for last 4 weeks
      const weeks: WeeklyData[] = [];
      for (let i = 3; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
        
        const weekWorkouts = workoutsData.filter(w => 
          isWithinInterval(new Date(w.started_at), { start: weekStart, end: weekEnd })
        );
        
        const totalVolume = weekWorkouts.reduce((sum, w) => sum + (w.total_volume || 0), 0);
        
        weeks.push({
          week: format(weekStart, "MMM d"),
          volume: totalVolume,
          sessions: weekWorkouts.length
        });
      }
      
      setWeeklyData(weeks);
      setLoading(false);
    }
    
    fetchData();
  }, [getRecentWorkouts, getRecentPRs]);

  // Handle calendar day click
  const handleDayClick = async (date: Date) => {
    if (!user) return;
    
    setSelectedDate(date);
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("started_at", startOfDay.toISOString())
        .lte("started_at", endOfDay.toISOString())
        .order("started_at", { ascending: false });

      if (error) throw error;
      setSelectedDayWorkouts(data || []);
      setDaySheetOpen(true);
    } catch (error) {
      console.error("Error fetching day workouts:", error);
    }
  };

  const handleWorkoutClick = (workout: WorkoutSession) => {
    setSelectedWorkout(workout);
    setDaySheetOpen(false);
    setDetailSheetOpen(true);
  };

  const handleBackFromDetail = () => {
    setDetailSheetOpen(false);
    setDaySheetOpen(true);
  };

  // Calculate stats
  const currentWeekVolume = weeklyData[3]?.volume || 0;
  const lastWeekVolume = weeklyData[2]?.volume || 0;
  const volumeChange = lastWeekVolume > 0 
    ? Math.round(((currentWeekVolume - lastWeekVolume) / lastWeekVolume) * 100) 
    : 0;
  
  const currentWeekSessions = weeklyData[3]?.sessions || 0;
  
  // Calculate total workout time this month
  const totalMinutes = workouts.reduce((sum, w) => sum + ((w.duration_seconds || 0) / 60), 0);

  if (loading || streakLoading) {
    return (
      <div className="min-h-screen gradient-page pt-safe px-4 pb-4 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-page pt-safe px-4 pb-28">
      {/* Ambient glow */}
      <div className="fixed inset-0 gradient-glow pointer-events-none" />
      
      {/* Header */}
      <header className="relative pt-14 pb-4">
        <motion.h1 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold tracking-tight"
        >
          Progress
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-muted-foreground mt-1"
        >
          Track your journey
        </motion.p>
      </header>

      {/* Overview Cards */}
      <div className="relative space-y-4 mt-4">
        {/* Streak Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <StreakCard
            currentStreak={currentStreak}
            longestStreak={longestStreak}
            milestones={milestones}
          />
        </motion.div>

        {/* Volume Trend Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-glass p-5"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Weekly Volume
              </p>
              <p className="text-2xl font-bold mt-1 text-foreground">
                {currentWeekVolume > 0 
                  ? `${(currentWeekVolume / 1000).toFixed(1)}k kg`
                  : "No data"
                }
              </p>
              {lastWeekVolume > 0 && (
                <p className={`text-sm mt-0.5 flex items-center gap-1 font-medium ${volumeChange >= 0 ? 'text-status-success' : 'text-muted-foreground'}`}>
                  {volumeChange >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {volumeChange >= 0 ? '+' : ''}{volumeChange}% vs last week
                </p>
              )}
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/12 flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
          </div>
          
          {/* Bar chart */}
          <div className="flex items-end gap-2 h-16 mt-4">
            {weeklyData.length > 0 ? weeklyData.map((week, i) => {
              const maxVolume = Math.max(...weeklyData.map(w => w.volume), 1);
              const height = maxVolume > 0 ? (week.volume / maxVolume) * 100 : 0;
              const isLatest = i === weeklyData.length - 1;
              
              return (
                <div key={week.week} className="flex-1 flex flex-col items-center gap-1.5">
                  <div 
                    className={`w-full rounded-md transition-all ${isLatest ? 'bg-primary' : 'bg-primary/20'}`}
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-xs text-muted-foreground">{week.week}</span>
                </div>
              );
            }) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Complete workouts to see trends
              </div>
            )}
          </div>
        </motion.div>

        {/* Secondary Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Sessions This Week */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card-glass p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                This Week
              </p>
            </div>
            <p className="text-xl font-bold text-foreground">
              {currentWeekSessions}
              <span className="text-muted-foreground text-base font-normal">
                {" "}session{currentWeekSessions !== 1 ? 's' : ''}
              </span>
            </p>
          </motion.div>

          {/* PRs This Month */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-glass p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                PRs
              </p>
            </div>
            <p className="text-xl font-bold text-foreground">
              {recentPRs.length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Recent records
            </p>
          </motion.div>
        </div>

        {/* Workout Time */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="card-glass p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Training Time
            </p>
          </div>
          <p className="text-xl font-bold text-foreground">
            {Math.round(totalMinutes)}
            <span className="text-muted-foreground text-base font-normal"> minutes</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            From {workouts.length} workout{workouts.length !== 1 ? 's' : ''}
          </p>
        </motion.div>

        {/* Workout Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Workout History
          </p>
          <WorkoutCalendar
            workoutDates={workoutDates}
            onDayClick={handleDayClick}
          />
        </motion.div>

        {/* Recent PRs List */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
          className="card-glass p-4"
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Recent Personal Records
          </p>
          {recentPRs.length > 0 ? (
            <div className="space-y-3">
              {recentPRs.map((pr, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-sm text-foreground">{pr.exercise_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(pr.achieved_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-primary">
                    {pr.weight}kg × {pr.reps}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No PRs yet. Keep training!
            </p>
          )}
        </motion.div>
      </div>

      {/* Sheets for calendar drill-down */}
      <WorkoutDaySheet
        open={daySheetOpen}
        onOpenChange={setDaySheetOpen}
        selectedDate={selectedDate}
        workouts={selectedDayWorkouts}
        onWorkoutClick={handleWorkoutClick}
      />

      <WorkoutDetailSheet
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        workout={selectedWorkout}
        onBack={handleBackFromDetail}
      />
    </div>
  );
}
