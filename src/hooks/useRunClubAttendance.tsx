import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { differenceInCalendarDays, startOfDay, subDays, isSameDay } from "date-fns";

export interface AttendanceRecord {
  id: string;
  run_instance_id: string | null;
  run_id: string;
  run_club_id: string;
  user_id: string;
  attended: boolean;
  recorded_at: string;
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
  run?: {
    title: string;
    day_of_week: number | null;
    start_time: string | null;
    meeting_point: string | null;
  };
  instance?: {
    scheduled_date: string;
    scheduled_time: string | null;
    status: string;
  };
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface RunInstance {
  id: string;
  run_id: string;
  run_club_id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  cancellation_reason: string | null;
  notes: string | null;
  weather_conditions: string | null;
  created_at: string;
  run?: {
    title: string;
    meeting_point: string | null;
    distances: string[];
  };
  attendance_count?: number;
}

export interface MemberAttendanceStats {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_attended: number;
  current_streak: number;
  longest_streak: number;
  last_attended_at: string | null;
  attendance_rate: number;
}

export interface ClubAttendanceStats {
  total_instances: number;
  total_check_ins: number;
  average_attendance: number;
  most_popular_run: { title: string; count: number } | null;
  top_attendees: MemberAttendanceStats[];
}

// Hook for managing run instances and recording attendance
export function useRunClubAttendance(clubId: string | null, runId?: string | null) {
  const { user } = useAuth();
  const [instances, setInstances] = useState<RunInstance[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInstances = useCallback(async () => {
    if (!clubId) return;

    try {
      let query = supabase
        .from("run_club_run_instances")
        .select(`
          *,
          run:run_club_runs(title, meeting_point, distances)
        `)
        .eq("run_club_id", clubId)
        .order("scheduled_date", { ascending: false });

      if (runId) {
        query = query.eq("run_id", runId);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;

      // Get attendance counts for each instance
      const instancesWithCounts = await Promise.all(
        (data || []).map(async (instance) => {
          const { count } = await supabase
            .from("run_club_attendance")
            .select("*", { count: "exact", head: true })
            .eq("run_instance_id", instance.id)
            .eq("attended", true);

          return {
            ...instance,
            attendance_count: count || 0
          } as RunInstance;
        })
      );

      setInstances(instancesWithCounts);
    } catch (error) {
      console.error("Error fetching run instances:", error);
    }
  }, [clubId, runId]);

  const fetchAttendance = useCallback(async (instanceId?: string) => {
    if (!clubId) return;

    try {
      let query = supabase
        .from("run_club_attendance")
        .select(`
          *,
          run:run_club_runs(title, day_of_week, start_time, meeting_point)
        `)
        .eq("run_club_id", clubId)
        .order("recorded_at", { ascending: false });

      if (instanceId) {
        query = query.eq("run_instance_id", instanceId);
      } else if (runId) {
        query = query.eq("run_id", runId);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;

      // Fetch profiles separately for each unique user
      const userIds = [...new Set((data || []).map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {} as Record<string, { display_name: string | null; avatar_url: string | null }>);

      const attendanceWithProfiles = (data || []).map(record => ({
        ...record,
        profile: profileMap[record.user_id] || null
      }));

      setAttendance(attendanceWithProfiles as unknown as AttendanceRecord[]);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  }, [clubId, runId]);

  const createInstance = async (runId: string, date: string, time?: string) => {
    if (!clubId || !user) throw new Error("Missing required data");

    const { data, error } = await supabase
      .from("run_club_run_instances")
      .insert({
        run_id: runId,
        run_club_id: clubId,
        scheduled_date: date,
        scheduled_time: time,
        status: "scheduled"
      })
      .select()
      .single();

    if (error) throw error;
    await fetchInstances();
    return data;
  };

  const completeInstance = async (instanceId: string, notes?: string, weather?: string) => {
    const { error } = await supabase
      .from("run_club_run_instances")
      .update({
        status: "completed",
        notes,
        weather_conditions: weather,
        updated_at: new Date().toISOString()
      })
      .eq("id", instanceId);

    if (error) throw error;
    await fetchInstances();
  };

  const cancelInstance = async (instanceId: string, reason?: string) => {
    const { error } = await supabase
      .from("run_club_run_instances")
      .update({
        status: "cancelled",
        cancellation_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq("id", instanceId);

    if (error) throw error;
    await fetchInstances();
  };

  const recordAttendance = async (
    instanceId: string,
    runId: string,
    userId: string,
    attended: boolean,
    notes?: string
  ) => {
    if (!clubId || !user) throw new Error("Missing required data");

    // Upsert attendance record
    const { error } = await supabase
      .from("run_club_attendance")
      .upsert({
        run_instance_id: instanceId,
        run_id: runId,
        run_club_id: clubId,
        user_id: userId,
        attended,
        recorded_by: user.id,
        notes,
        recorded_at: new Date().toISOString()
      }, {
        onConflict: "run_instance_id,user_id"
      });

    if (error) throw error;
    await fetchAttendance(instanceId);
  };

  const bulkRecordAttendance = async (
    instanceId: string,
    runId: string,
    records: Array<{ userId: string; attended: boolean; notes?: string }>
  ) => {
    if (!clubId || !user) throw new Error("Missing required data");

    const attendanceRecords = records.map(r => ({
      run_instance_id: instanceId,
      run_id: runId,
      run_club_id: clubId,
      user_id: r.userId,
      attended: r.attended,
      recorded_by: user.id,
      notes: r.notes,
      recorded_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from("run_club_attendance")
      .upsert(attendanceRecords, {
        onConflict: "run_instance_id,user_id"
      });

    if (error) throw error;
    await fetchAttendance(instanceId);
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchInstances(), fetchAttendance()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchInstances, fetchAttendance]);

  return {
    instances,
    attendance,
    isLoading,
    createInstance,
    completeInstance,
    cancelInstance,
    recordAttendance,
    bulkRecordAttendance,
    refetchInstances: fetchInstances,
    refetchAttendance: fetchAttendance
  };
}

// Hook for member-specific attendance stats and history
export function useMemberAttendanceStats(clubId: string | null, userId?: string) {
  const { user: currentUser } = useAuth();
  const targetUserId = userId || currentUser?.id;
  const [stats, setStats] = useState<MemberAttendanceStats | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const calculateStreak = (dates: Date[]): { current: number; longest: number } => {
    if (dates.length === 0) return { current: 0, longest: 0 };

    // Sort dates descending
    const sortedDates = [...dates].sort((a, b) => b.getTime() - a.getTime());
    
    // Get unique days
    const uniqueDays: Date[] = [];
    for (const date of sortedDates) {
      const dayStart = startOfDay(date);
      if (!uniqueDays.some(d => isSameDay(d, dayStart))) {
        uniqueDays.push(dayStart);
      }
    }

    if (uniqueDays.length === 0) return { current: 0, longest: 0 };

    // Calculate current streak (consecutive weeks, since runs are typically weekly)
    let currentStreak = 0;
    const today = startOfDay(new Date());
    const mostRecent = uniqueDays[0];
    const daysSinceLast = differenceInCalendarDays(today, mostRecent);

    // Consider within 7 days as active streak (weekly runs)
    if (daysSinceLast <= 7) {
      currentStreak = 1;
      let checkDate = subDays(mostRecent, 7);
      
      for (let i = 1; i < uniqueDays.length; i++) {
        const diff = differenceInCalendarDays(uniqueDays[i - 1], uniqueDays[i]);
        // Allow up to 10 days gap for weekly runs with some flexibility
        if (diff <= 10) {
          currentStreak++;
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
      if (diff <= 10) { // Weekly flexibility
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    return { current: currentStreak, longest: longestStreak };
  };

  const fetchStats = useCallback(async () => {
    if (!clubId || !targetUserId) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch attendance history
      const { data: attendanceData, error } = await supabase
        .from("run_club_attendance")
        .select(`
          *,
          run:run_club_runs(title, day_of_week, start_time, meeting_point),
          instance:run_club_run_instances(scheduled_date, scheduled_time, status)
        `)
        .eq("run_club_id", clubId)
        .eq("user_id", targetUserId)
        .eq("attended", true)
        .order("recorded_at", { ascending: false });

      if (error) throw error;

      const attendedRecords = (attendanceData || []) as AttendanceRecord[];
      setHistory(attendedRecords);

      // Get profile info
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", targetUserId)
        .single();

      // Get total instances for rate calculation
      const { count: totalInstances } = await supabase
        .from("run_club_run_instances")
        .select("*", { count: "exact", head: true })
        .eq("run_club_id", clubId)
        .eq("status", "completed");

      // Calculate streaks
      const attendedDates = attendedRecords.map(r => 
        new Date(r.instance?.scheduled_date || r.recorded_at)
      );
      const { current, longest } = calculateStreak(attendedDates);

      setStats({
        user_id: targetUserId,
        display_name: profile?.display_name || null,
        avatar_url: profile?.avatar_url || null,
        total_attended: attendedRecords.length,
        current_streak: current,
        longest_streak: longest,
        last_attended_at: attendedRecords[0]?.recorded_at || null,
        attendance_rate: totalInstances && totalInstances > 0
          ? Math.round((attendedRecords.length / totalInstances) * 100)
          : 0
      });
    } catch (error) {
      console.error("Error fetching member stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, [clubId, targetUserId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, history, isLoading, refetch: fetchStats };
}

// Hook for club-wide attendance statistics
export function useClubAttendanceStats(clubId: string | null) {
  const [stats, setStats] = useState<ClubAttendanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!clubId) {
      setIsLoading(false);
      return;
    }

    try {
      // Get total completed instances
      const { count: totalInstances } = await supabase
        .from("run_club_run_instances")
        .select("*", { count: "exact", head: true })
        .eq("run_club_id", clubId)
        .eq("status", "completed");

      // Get total check-ins
      const { count: totalCheckIns } = await supabase
        .from("run_club_attendance")
        .select("*", { count: "exact", head: true })
        .eq("run_club_id", clubId)
        .eq("attended", true);

      // Get check-ins grouped by run for most popular
      const { data: runStats } = await supabase
        .from("run_club_attendance")
        .select(`
          run_id,
          run:run_club_runs(title)
        `)
        .eq("run_club_id", clubId)
        .eq("attended", true);

      // Count by run
      const runCounts = (runStats || []).reduce((acc, record) => {
        const runId = record.run_id;
        const title = (record.run as any)?.title || "Unknown";
        if (!acc[runId]) {
          acc[runId] = { title, count: 0 };
        }
        acc[runId].count++;
        return acc;
      }, {} as Record<string, { title: string; count: number }>);

      const mostPopular = Object.values(runCounts).sort((a, b) => b.count - a.count)[0] || null;

      // Get top attendees - fetch attendance and profiles separately
      const { data: attendeeData } = await supabase
        .from("run_club_attendance")
        .select("user_id")
        .eq("run_club_id", clubId)
        .eq("attended", true);

      // Count by user first
      const userCountsRaw = (attendeeData || []).reduce((acc, record) => {
        const userId = record.user_id;
        if (!acc[userId]) {
          acc[userId] = 0;
        }
        acc[userId]++;
        return acc;
      }, {} as Record<string, number>);

      // Get top 5 user IDs
      const topUserIds = Object.entries(userCountsRaw)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id]) => id);

      // Fetch profiles for top users
      const { data: topProfiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", topUserIds);

      const profileMap = (topProfiles || []).reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {} as Record<string, { display_name: string | null; avatar_url: string | null }>);

      // Build userCounts with profiles
      const userCounts = topUserIds.reduce((acc, userId) => {
        acc[userId] = {
          user_id: userId,
          display_name: profileMap[userId]?.display_name || null,
          avatar_url: profileMap[userId]?.avatar_url || null,
          count: userCountsRaw[userId]
        };
        return acc;
      }, {} as Record<string, { user_id: string; display_name: string | null; avatar_url: string | null; count: number }>);

      const topAttendees: MemberAttendanceStats[] = Object.values(userCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(u => ({
          user_id: u.user_id,
          display_name: u.display_name,
          avatar_url: u.avatar_url,
          total_attended: u.count,
          current_streak: 0, // Would need individual calculation
          longest_streak: 0,
          last_attended_at: null,
          attendance_rate: totalInstances && totalInstances > 0
            ? Math.round((u.count / totalInstances) * 100)
            : 0
        }));

      setStats({
        total_instances: totalInstances || 0,
        total_check_ins: totalCheckIns || 0,
        average_attendance: totalInstances && totalInstances > 0 && totalCheckIns
          ? Math.round(totalCheckIns / totalInstances)
          : 0,
        most_popular_run: mostPopular,
        top_attendees: topAttendees
      });
    } catch (error) {
      console.error("Error fetching club stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, refetch: fetchStats };
}
