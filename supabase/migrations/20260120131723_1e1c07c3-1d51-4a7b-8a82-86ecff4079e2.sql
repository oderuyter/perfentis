-- Fix security definer view issue by dropping and recreating as SECURITY INVOKER
DROP VIEW IF EXISTS public.athlete_assigned_plans;

CREATE VIEW public.athlete_assigned_plans 
WITH (security_invoker = true)
AS
SELECT 
    cpa.id AS assignment_id,
    cpa.plan_id,
    cpa.client_id,
    cc.client_user_id AS user_id,
    tp.name AS plan_name,
    tp.description AS plan_description,
    tp.plan_type,
    tp.duration_weeks,
    c.display_name AS coach_name,
    c.avatar_url AS coach_avatar,
    cpa.start_date,
    cpa.end_date,
    cpa.status,
    cpa.current_week,
    cpa.progress_percentage,
    cpa.completed_workouts,
    cpa.total_workouts,
    cpa.last_workout_at,
    cpa.assigned_at
FROM public.client_plan_assignments cpa
JOIN public.coach_clients cc ON cc.id = cpa.client_id
JOIN public.training_plans tp ON tp.id = cpa.plan_id
JOIN public.coaches c ON c.id = cc.coach_id
WHERE cpa.status = 'active';