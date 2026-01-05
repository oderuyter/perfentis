import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { startOfDay, subDays, isSameDay, differenceInCalendarDays } from "date-fns";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  workoutDates: Date[];
  milestones: { type: string; value: number; achieved: boolean }[];
}

export const useWorkoutStreak = () => {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    totalWorkouts: 0,
    workoutDates: [],
    milestones: [],
  });
  const [loading, setLoading] = useState(true);

  const calculateStreak = (dates: Date[]): { current: number; longest: number } => {
    if (dates.length === 0) return { current: 0, longest: 0 };

    // Sort dates in descending order (most recent first)
    const sortedDates = [...dates].sort((a, b) => b.getTime() - a.getTime());
    
    // Get unique days only
    const uniqueDays: Date[] = [];
    for (const date of sortedDates) {
      const dayStart = startOfDay(date);
      if (!uniqueDays.some(d => isSameDay(d, dayStart))) {
        uniqueDays.push(dayStart);
      }
    }

    // Calculate current streak
    let currentStreak = 0;
    const today = startOfDay(new Date());
    
    // Check if worked out today or yesterday to start counting
    const mostRecent = uniqueDays[0];
    const daysSinceLast = differenceInCalendarDays(today, mostRecent);
    
    if (daysSinceLast <= 1) {
      currentStreak = 1;
      let checkDate = subDays(mostRecent, 1);
      
      for (let i = 1; i < uniqueDays.length; i++) {
        if (isSameDay(uniqueDays[i], checkDate)) {
          currentStreak++;
          checkDate = subDays(checkDate, 1);
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = currentStreak;
    let tempStreak = 1;
    
    for (let i = 1; i < uniqueDays.length; i++) {
      const diff = differenceInCalendarDays(uniqueDays[i - 1], uniqueDays[i]);
      if (diff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    return { current: currentStreak, longest: longestStreak };
  };

  const getMilestones = (currentStreak: number, totalWorkouts: number) => {
    const streakMilestones = [7, 14, 30, 60, 100];
    const workoutMilestones = [10, 25, 50, 100, 200];

    const milestones = [
      ...streakMilestones.map(value => ({
        type: "streak",
        value,
        achieved: currentStreak >= value,
      })),
      ...workoutMilestones.map(value => ({
        type: "workouts",
        value,
        achieved: totalWorkouts >= value,
      })),
    ];

    return milestones;
  };

  const fetchStreakData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("started_at")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("started_at", { ascending: false });

      if (error) throw error;

      const workoutDates = (data || []).map(w => new Date(w.started_at));
      const { current, longest } = calculateStreak(workoutDates);
      const milestones = getMilestones(current, workoutDates.length);

      setStreakData({
        currentStreak: current,
        longestStreak: longest,
        totalWorkouts: workoutDates.length,
        workoutDates,
        milestones,
      });
    } catch (error) {
      console.error("Error fetching streak data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreakData();
  }, [user]);

  return { ...streakData, loading, refetch: fetchStreakData };
};
