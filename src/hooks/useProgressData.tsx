import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  subWeeks,
  format,
  eachDayOfInterval,
  isSameDay,
  isWithinInterval,
} from "date-fns";

export interface WeeklySummary {
  volume: number;
  distance: number;
  sessions: number;
  prs: number;
  trainingMinutes: number;
  // plan/split progress
  planProgress: string | null; // e.g. "1/5"
  splitProgress: string | null; // e.g. "2/4"
  // trend vs last week
  prevVolume: number;
  prevDistance: number;
  prevSessions: number;
}

export interface DayFlags {
  date: string; // yyyy-MM-dd
  hasWorkout: boolean;
  hasRun: boolean;
  hasHabit: boolean;
  hasFood: boolean;
  hasPhoto: boolean;
}

export function useProgressData() {
  const { user } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthDate, setMonthDate] = useState(new Date());
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [dayFlags, setDayFlags] = useState<DayFlags[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStart = useMemo(
    () => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
    [weekOffset]
  );
  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);

  const prevWeekStart = useMemo(() => subWeeks(weekStart, 1), [weekStart]);
  const prevWeekEnd = useMemo(() => endOfWeek(prevWeekStart, { weekStartsOn: 1 }), [prevWeekStart]);

  // Fetch weekly summary
  const fetchWeeklySummary = useCallback(async () => {
    if (!user) return;

    const ws = weekStart.toISOString();
    const we = weekEnd.toISOString();
    const pws = prevWeekStart.toISOString();
    const pwe = prevWeekEnd.toISOString();

    const [sessionsRes, prevSessionsRes, prsRes, plansRes] = await Promise.all([
      supabase
        .from("workout_sessions")
        .select("id, modality, duration_seconds, total_volume, distance_meters")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("started_at", ws)
        .lte("started_at", we),
      supabase
        .from("workout_sessions")
        .select("id, modality, duration_seconds, total_volume, distance_meters")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("started_at", pws)
        .lte("started_at", pwe),
      supabase
        .from("personal_records")
        .select("id")
        .eq("user_id", user.id)
        .gte("achieved_at", ws)
        .lte("achieved_at", we),
      supabase
        .from("athlete_assigned_plans")
        .select("completed_workouts, total_workouts")
        .eq("user_id", user.id),
    ]);

    const sessions = sessionsRes.data || [];
    const prevSessions = prevSessionsRes.data || [];

    const volume = sessions.reduce((s, w) => s + ((w as any).total_volume || 0), 0);
    const distance = sessions
      .filter((w: any) => w.modality === "run" || w.modality === "walk")
      .reduce((s, w) => s + ((w as any).distance_meters || 0), 0);
    const trainingMinutes = sessions.reduce(
      (s, w) => s + ((w as any).duration_seconds || 0) / 60,
      0
    );

    const prevVolume = prevSessions.reduce((s, w) => s + ((w as any).total_volume || 0), 0);
    const prevDistance = prevSessions
      .filter((w: any) => w.modality === "run" || w.modality === "walk")
      .reduce((s, w) => s + ((w as any).distance_meters || 0), 0);

    // Plan progress
    const plans = plansRes.data || [];
    let planProgress: string | null = null;
    if (plans.length > 0) {
      const completed = plans.reduce((s, p: any) => s + (p.completed_workouts || 0), 0);
      const total = plans.reduce((s, p: any) => s + (p.total_workouts || 0), 0);
      if (total > 0) planProgress = `${completed}/${total}`;
    }

    setWeeklySummary({
      volume,
      distance,
      sessions: sessions.length,
      prs: (prsRes.data || []).length,
      trainingMinutes,
      planProgress,
      splitProgress: null, // could add later
      prevVolume,
      prevDistance,
      prevSessions: prevSessions.length,
    });
  }, [user, weekStart, weekEnd, prevWeekStart, prevWeekEnd]);

  // Fetch monthly day flags for calendar
  const fetchDayFlags = useCallback(async () => {
    if (!user) return;

    const ms = startOfMonth(monthDate);
    const me = endOfMonth(monthDate);
    const startStr = format(ms, "yyyy-MM-dd");
    const endStr = format(me, "yyyy-MM-dd");
    const startISO = ms.toISOString();
    const endISO = me.toISOString();

    const [workoutsRes, habitsRes, nutritionRes, photosRes] = await Promise.all([
      supabase
        .from("workout_sessions")
        .select("started_at, modality")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("started_at", startISO)
        .lte("started_at", endISO),
      supabase
        .from("habit_completions")
        .select("completed_at, habit_id")
        .gte("completed_at", startISO)
        .lte("completed_at", endISO),
      supabase
        .from("nutrition_days")
        .select("date, total_calories")
        .eq("user_id", user.id)
        .gte("date", startStr)
        .lte("date", endStr),
      supabase
        .from("progress_photos")
        .select("created_at")
        .eq("user_id", user.id)
        .gte("created_at", startISO)
        .lte("created_at", endISO),
    ]);

    const days = eachDayOfInterval({ start: ms, end: me });
    const flags: DayFlags[] = days.map((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      const workouts = (workoutsRes.data || []).filter(
        (w: any) => format(new Date(w.started_at), "yyyy-MM-dd") === dateStr
      );
      const hasWorkout = workouts.some(
        (w: any) => w.modality !== "run" && w.modality !== "walk"
      );
      const hasRun = workouts.some(
        (w: any) => w.modality === "run" || w.modality === "walk"
      );
      const hasHabit = (habitsRes.data || []).some(
        (h: any) => format(new Date(h.completed_at), "yyyy-MM-dd") === dateStr
      );
      const hasFood = (nutritionRes.data || []).some(
        (n: any) => n.date === dateStr && (n.total_calories || 0) > 0
      );
      const hasPhoto = (photosRes.data || []).some(
        (p: any) => format(new Date(p.created_at), "yyyy-MM-dd") === dateStr
      );
      return { date: dateStr, hasWorkout, hasRun, hasHabit, hasFood, hasPhoto };
    });

    setDayFlags(flags);
  }, [user, monthDate]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchWeeklySummary(), fetchDayFlags()]).finally(() =>
      setLoading(false)
    );
  }, [fetchWeeklySummary, fetchDayFlags]);

  return {
    weekStart,
    weekEnd,
    weekOffset,
    setWeekOffset,
    monthDate,
    setMonthDate,
    weeklySummary,
    dayFlags,
    loading,
    refetch: () => Promise.all([fetchWeeklySummary(), fetchDayFlags()]),
  };
}
