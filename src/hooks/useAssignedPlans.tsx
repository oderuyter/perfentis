import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AssignedPlan {
  assignment_id: string;
  plan_id: string;
  client_id: string;
  user_id: string;
  plan_name: string;
  plan_description: string | null;
  plan_type: string;
  duration_weeks: number;
  coach_name: string;
  coach_avatar: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  current_week: number;
  progress_percentage: number;
  completed_workouts: number;
  total_workouts: number;
  last_workout_at: string | null;
  assigned_at: string;
}

export interface PlanWorkout {
  id: string;
  name: string;
  description: string | null;
  day_of_week: number | null;
  order_index: number;
  exercise_data: any;
  coach_notes: string | null;
  week_id: string;
}

export interface PlanWeek {
  id: string;
  week_number: number;
  name: string | null;
  notes: string | null;
  plan_workouts: PlanWorkout[];
}

export interface WorkoutOverride {
  exercise_id: string;
  substitution_id?: string;
  sets_min?: number;
  sets_max?: number;
  reps_min?: number;
  reps_max?: number;
  load_guidance?: string;
  client_notes?: string;
}

export function useAssignedPlans() {
  const { user } = useAuth();

  const { data: assignedPlans = [], isLoading, refetch } = useQuery({
    queryKey: ["assigned-plans", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get assigned plans via the view
      const { data, error } = await supabase
        .from("athlete_assigned_plans")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching assigned plans:", error);
        return [];
      }

      return (data || []) as AssignedPlan[];
    },
    enabled: !!user?.id,
  });

  return { assignedPlans, isLoading, refetch };
}

export function useAssignedPlanDetail(assignmentId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["assigned-plan-detail", assignmentId],
    queryFn: async () => {
      if (!assignmentId || !user?.id) return null;

      // Get the assignment with plan details
      const { data: assignment, error: assignmentError } = await supabase
        .from("client_plan_assignments")
        .select(`
          *,
          training_plans (
            id,
            name,
            description,
            plan_type,
            duration_weeks,
            plan_weeks (
              id,
              week_number,
              name,
              notes,
              plan_workouts (
                id,
                name,
                description,
                day_of_week,
                order_index,
                exercise_data,
                coach_notes
              )
            )
          ),
          coach_clients!inner (
            client_user_id,
            coaches (
              display_name,
              avatar_url
            )
          )
        `)
        .eq("id", assignmentId)
        .single();

      if (assignmentError) throw assignmentError;

      // Verify ownership
      const clientUserId = (assignment as any)?.coach_clients?.client_user_id;
      if (clientUserId !== user.id) {
        throw new Error("Unauthorized");
      }

      // Get overrides for this assignment
      const { data: overrides } = await supabase
        .from("plan_workout_overrides")
        .select("*")
        .eq("assignment_id", assignmentId);

      return {
        assignment,
        overrides: overrides || [],
      };
    },
    enabled: !!assignmentId && !!user?.id,
  });
}

export function useCurrentWeekWorkouts(assignmentId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["current-week-workouts", assignmentId],
    queryFn: async () => {
      if (!assignmentId || !user?.id) return [];

      // Get assignment with current week
      const { data: assignment, error: assignmentError } = await supabase
        .from("client_plan_assignments")
        .select("current_week, plan_id")
        .eq("id", assignmentId)
        .single();

      if (assignmentError) throw assignmentError;

      // Get current week's workouts
      const { data: week, error: weekError } = await supabase
        .from("plan_weeks")
        .select(`
          id,
          week_number,
          name,
          plan_workouts (
            id,
            name,
            description,
            day_of_week,
            order_index,
            exercise_data,
            coach_notes
          )
        `)
        .eq("plan_id", assignment.plan_id)
        .eq("week_number", assignment.current_week || 1)
        .single();

      if (weekError) throw weekError;

      // Get overrides
      const { data: overrides } = await supabase
        .from("plan_workout_overrides")
        .select("*")
        .eq("assignment_id", assignmentId);

      // Get completed workout IDs for this assignment
      const { data: completedSessions } = await supabase
        .from("workout_sessions")
        .select("plan_workout_id")
        .eq("plan_assignment_id", assignmentId)
        .eq("status", "completed");

      const completedWorkoutIds = new Set(
        (completedSessions || []).map((s: any) => s.plan_workout_id)
      );

      // Merge overrides with workouts
      const workouts = (week?.plan_workouts || []).map((workout: any) => {
        const override = (overrides || []).find(
          (o: any) => o.plan_workout_id === workout.id
        );
        return {
          ...workout,
          override: override || null,
          isCompleted: completedWorkoutIds.has(workout.id),
        };
      });

      return {
        weekNumber: week?.week_number,
        weekName: week?.name,
        workouts: workouts.sort((a: any, b: any) => {
          if (a.day_of_week === null) return 1;
          if (b.day_of_week === null) return -1;
          return a.day_of_week - b.day_of_week;
        }),
      };
    },
    enabled: !!assignmentId && !!user?.id,
  });
}

export function useTodaysCoachWorkout() {
  const { user } = useAuth();
  const today = new Date().getDay(); // 0 = Sunday

  return useQuery({
    queryKey: ["todays-coach-workout", user?.id, today],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get active assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from("athlete_assigned_plans")
        .select("*")
        .eq("user_id", user.id);

      if (assignmentsError || !assignments?.length) return null;

      // For each assignment, check if there's a workout for today
      for (const assignment of assignments) {
        // Get current week's workout for today
        const { data: week } = await supabase
          .from("plan_weeks")
          .select(`
            plan_workouts (
              id,
              name,
              description,
              day_of_week,
              exercise_data,
              coach_notes
            )
          `)
          .eq("plan_id", assignment.plan_id)
          .eq("week_number", assignment.current_week || 1)
          .single();

        const todaysWorkout = week?.plan_workouts?.find(
          (w: any) => w.day_of_week === today
        );

        if (todaysWorkout) {
          // Check if already completed today
          const { data: completedToday } = await supabase
            .from("workout_sessions")
            .select("id")
            .eq("plan_assignment_id", assignment.assignment_id)
            .eq("plan_workout_id", todaysWorkout.id)
            .eq("status", "completed")
            .gte("started_at", new Date().toISOString().split("T")[0]);

          if (!completedToday?.length) {
            // Get overrides
            const { data: override } = await supabase
              .from("plan_workout_overrides")
              .select("*")
              .eq("assignment_id", assignment.assignment_id)
              .eq("plan_workout_id", todaysWorkout.id)
              .maybeSingle();

            return {
              assignment,
              workout: todaysWorkout,
              override,
            };
          }
        }
      }

      return null;
    },
    enabled: !!user?.id,
  });
}
