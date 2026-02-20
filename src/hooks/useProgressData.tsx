import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
} from "date-fns";

export interface WeeklySummary {
  volume: number;
  distance: number;
  sessions: number;
  prs: number;
  trainingMinutes: number;
  planProgress: string | null;
  splitProgress: string | null;
  prevVolume: number;
  prevDistance: number;
  prevSessions: number;
}

export interface DayFlags {
  date: string;
  hasWorkout: boolean;
  hasRun: boolean;
  hasHabit: boolean;
  hasFood: boolean;
  hasPhoto: boolean;
}

export function useProgressData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthDate, setMonthDate] = useState(new Date());

  const weekStart = useMemo(
    () => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
    [weekOffset]
  );
  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);
  const prevWeekStart = useMemo(() => subWeeks(weekStart, 1), [weekStart]);
  const prevWeekEnd = useMemo(() => endOfWeek(prevWeekStart, { weekStartsOn: 1 }), [prevWeekStart]);

  // Weekly summary query
  const { data: weeklySummary = null, isLoading: summaryLoading } = useQuery<WeeklySummary | null>({
    queryKey: ["weekly-summary", user?.id, weekStart.toISOString()],
    queryFn: async () => {
      if (!user) return null;

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

      const plans = plansRes.data || [];
      let planProgress: string | null = null;
      if (plans.length > 0) {
        const completed = plans.reduce((s, p: any) => s + (p.completed_workouts || 0), 0);
        const total = plans.reduce((s, p: any) => s + (p.total_workouts || 0), 0);
        if (total > 0) planProgress = `${completed}/${total}`;
      }

      return {
        volume,
        distance,
        sessions: sessions.length,
        prs: (prsRes.data || []).length,
        trainingMinutes,
        planProgress,
        splitProgress: null,
        prevVolume,
        prevDistance,
        prevSessions: prevSessions.length,
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Monthly day flags query
  const { data: dayFlags = [], isLoading: flagsLoading } = useQuery<DayFlags[]>({
    queryKey: ["day-flags", user?.id, format(monthDate, "yyyy-MM")],
    queryFn: async () => {
      if (!user) return [];

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
      return days.map((d) => {
        const dateStr = format(d, "yyyy-MM-dd");
        const workouts = (workoutsRes.data || []).filter(
          (w: any) => format(new Date(w.started_at), "yyyy-MM-dd") === dateStr
        );
        return {
          date: dateStr,
          hasWorkout: workouts.some((w: any) => w.modality !== "run" && w.modality !== "walk"),
          hasRun: workouts.some((w: any) => w.modality === "run" || w.modality === "walk"),
          hasHabit: (habitsRes.data || []).some(
            (h: any) => format(new Date(h.completed_at), "yyyy-MM-dd") === dateStr
          ),
          hasFood: (nutritionRes.data || []).some(
            (n: any) => n.date === dateStr && (n.total_calories || 0) > 0
          ),
          hasPhoto: (photosRes.data || []).some(
            (p: any) => format(new Date(p.created_at), "yyyy-MM-dd") === dateStr
          ),
        };
      });
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const loading = summaryLoading || flagsLoading;

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["weekly-summary", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["day-flags", user?.id] });
  }, [queryClient, user?.id]);

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
    refetch,
  };
}
