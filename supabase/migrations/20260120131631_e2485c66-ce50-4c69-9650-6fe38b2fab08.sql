-- =====================================================
-- COACHING EXECUTION & WORKOUT RELIABILITY UPGRADE
-- =====================================================

-- 1) PLAN OVERRIDES TABLE
-- Stores client-specific overrides without mutating original templates
CREATE TABLE public.plan_workout_overrides (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.client_plan_assignments(id) ON DELETE CASCADE,
    plan_workout_id UUID NOT NULL REFERENCES public.plan_workouts(id) ON DELETE CASCADE,
    -- Override data (JSONB to match exercise_data structure but with per-client modifications)
    exercise_overrides JSONB DEFAULT '[]'::jsonb, -- [{exercise_id, substitution_id, sets_min, sets_max, reps_min, reps_max, load_guidance, client_notes}]
    workout_notes TEXT, -- Coach notes specific to this client
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(assignment_id, plan_workout_id)
);

-- Enable RLS
ALTER TABLE public.plan_workout_overrides ENABLE ROW LEVEL SECURITY;

-- RLS: Coaches can manage overrides for their assignments
CREATE POLICY "Coaches can manage plan overrides"
ON public.plan_workout_overrides
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.client_plan_assignments cpa
        JOIN public.coach_clients cc ON cc.id = cpa.client_id
        JOIN public.coaches c ON c.id = cc.coach_id
        WHERE cpa.id = plan_workout_overrides.assignment_id
          AND c.user_id = auth.uid()
    )
);

-- RLS: Athletes can view their own overrides
CREATE POLICY "Athletes can view their overrides"
ON public.plan_workout_overrides
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.client_plan_assignments cpa
        JOIN public.coach_clients cc ON cc.id = cpa.client_id
        WHERE cpa.id = plan_workout_overrides.assignment_id
          AND cc.client_user_id = auth.uid()
    )
);

-- 2) EXTEND workout_sessions TO REFERENCE PLAN ASSIGNMENTS
ALTER TABLE public.workout_sessions 
ADD COLUMN IF NOT EXISTS plan_assignment_id UUID REFERENCES public.client_plan_assignments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS plan_week_number INTEGER,
ADD COLUMN IF NOT EXISTS plan_workout_id UUID REFERENCES public.plan_workouts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS operation_id TEXT, -- For idempotent sync
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ; -- Track cloud sync timestamp

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_workout_sessions_plan_assignment ON public.workout_sessions(plan_assignment_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_operation_id ON public.workout_sessions(operation_id);

-- 3) EXTEND set_logs FOR COACH PRESCRIBED TARGETS
ALTER TABLE public.set_logs
ADD COLUMN IF NOT EXISTS target_reps_min INTEGER, -- For rep ranges
ADD COLUMN IF NOT EXISTS target_reps_max INTEGER,
ADD COLUMN IF NOT EXISTS load_guidance TEXT; -- e.g. "70% 1RM", "RPE 7-8"

-- 4) EXTEND exercise_logs FOR SHARED NOTES
ALTER TABLE public.exercise_logs
ADD COLUMN IF NOT EXISTS athlete_notes TEXT, -- Notes athlete leaves (visible to coach)
ADD COLUMN IF NOT EXISTS coach_prescribed_notes TEXT; -- Notes from coach shown to athlete

-- 5) EXTEND client_plan_assignments FOR BETTER TRACKING
ALTER TABLE public.client_plan_assignments
ADD COLUMN IF NOT EXISTS current_week INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_workout_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_workouts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_workouts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS coach_name TEXT; -- Denormalized for athlete display

-- 6) WORKOUT SYNC QUEUE TABLE (for offline support)
CREATE TABLE IF NOT EXISTS public.workout_sync_queue (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    operation_id TEXT NOT NULL UNIQUE, -- Idempotency key
    operation_type TEXT NOT NULL, -- 'create_session', 'update_set', etc.
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'synced', 'failed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    synced_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT
);

-- Enable RLS
ALTER TABLE public.workout_sync_queue ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only manage their own sync queue
CREATE POLICY "Users can manage their sync queue"
ON public.workout_sync_queue
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Index for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_workout_sync_queue_status ON public.workout_sync_queue(user_id, status);

-- 7) ATHLETE PLAN VIEW
-- This view provides athletes with their assigned plans in a friendly format
CREATE OR REPLACE VIEW public.athlete_assigned_plans AS
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

-- 8) ADD AUDIT LOG CATEGORIES FOR COACHING & WORKOUTS
-- (Using existing audit_logs table)

-- 9) UPDATE TIMESTAMPS TRIGGER FOR NEW TABLES
CREATE TRIGGER update_plan_workout_overrides_updated_at
BEFORE UPDATE ON public.plan_workout_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 10) FUNCTION TO GET CURRENT WEEK WORKOUT
CREATE OR REPLACE FUNCTION public.get_athlete_current_workout(p_user_id UUID)
RETURNS TABLE (
    assignment_id UUID,
    plan_name TEXT,
    coach_name TEXT,
    current_week INTEGER,
    workout_id UUID,
    workout_name TEXT,
    workout_description TEXT,
    day_of_week INTEGER,
    exercise_data JSONB,
    coach_notes TEXT,
    override_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cpa.id AS assignment_id,
        tp.name AS plan_name,
        c.display_name AS coach_name,
        cpa.current_week,
        pw.id AS workout_id,
        pw.name AS workout_name,
        pw.description AS workout_description,
        pw.day_of_week,
        pw.exercise_data,
        pw.coach_notes,
        pwo.exercise_overrides AS override_data
    FROM public.client_plan_assignments cpa
    JOIN public.coach_clients cc ON cc.id = cpa.client_id
    JOIN public.coaches c ON c.id = cc.coach_id
    JOIN public.training_plans tp ON tp.id = cpa.plan_id
    JOIN public.plan_weeks pwk ON pwk.plan_id = tp.id AND pwk.week_number = cpa.current_week
    JOIN public.plan_workouts pw ON pw.week_id = pwk.id
    LEFT JOIN public.plan_workout_overrides pwo 
        ON pwo.assignment_id = cpa.id AND pwo.plan_workout_id = pw.id
    WHERE cc.client_user_id = p_user_id
      AND cpa.status = 'active'
    ORDER BY pw.day_of_week NULLS LAST, pw.order_index;
END;
$$;

-- 11) FUNCTION TO UPDATE ASSIGNMENT PROGRESS
CREATE OR REPLACE FUNCTION public.update_assignment_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_assignment_id UUID;
    v_completed_count INTEGER;
    v_total_count INTEGER;
    v_duration_weeks INTEGER;
    v_current_week INTEGER;
BEGIN
    -- Get the assignment ID from the session
    v_assignment_id := NEW.plan_assignment_id;
    
    IF v_assignment_id IS NOT NULL AND NEW.status = 'completed' THEN
        -- Count completed workouts for this assignment
        SELECT COUNT(*) INTO v_completed_count
        FROM public.workout_sessions
        WHERE plan_assignment_id = v_assignment_id
          AND status = 'completed';
        
        -- Get total workouts in the plan
        SELECT tp.duration_weeks, COUNT(pw.id)
        INTO v_duration_weeks, v_total_count
        FROM public.client_plan_assignments cpa
        JOIN public.training_plans tp ON tp.id = cpa.plan_id
        JOIN public.plan_weeks pwk ON pwk.plan_id = tp.id
        JOIN public.plan_workouts pw ON pw.week_id = pwk.id
        WHERE cpa.id = v_assignment_id
        GROUP BY tp.duration_weeks;
        
        -- Calculate current week based on completed workouts
        v_current_week := LEAST(
            v_duration_weeks,
            GREATEST(1, CEIL(v_completed_count::DECIMAL / NULLIF((v_total_count / v_duration_weeks), 0)))
        );
        
        -- Update the assignment
        UPDATE public.client_plan_assignments
        SET 
            completed_workouts = v_completed_count,
            total_workouts = COALESCE(v_total_count, 0),
            progress_percentage = CASE 
                WHEN COALESCE(v_total_count, 0) > 0 
                THEN ROUND((v_completed_count::DECIMAL / v_total_count) * 100)
                ELSE 0 
            END,
            current_week = COALESCE(v_current_week, 1),
            last_workout_at = NEW.ended_at
        WHERE id = v_assignment_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger to update progress when workout completes
DROP TRIGGER IF EXISTS trg_update_assignment_progress ON public.workout_sessions;
CREATE TRIGGER trg_update_assignment_progress
AFTER INSERT OR UPDATE OF status ON public.workout_sessions
FOR EACH ROW
WHEN (NEW.plan_assignment_id IS NOT NULL)
EXECUTE FUNCTION public.update_assignment_progress();

-- 12) NOTIFICATION TRIGGERS FOR COACHING EVENTS
CREATE OR REPLACE FUNCTION public.notify_plan_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_plan_name TEXT;
    v_coach_name TEXT;
BEGIN
    -- Get the client user ID and plan details
    SELECT cc.client_user_id, tp.name, c.display_name
    INTO v_user_id, v_plan_name, v_coach_name
    FROM public.coach_clients cc
    JOIN public.coaches c ON c.id = cc.coach_id
    JOIN public.training_plans tp ON tp.id = NEW.plan_id
    WHERE cc.id = NEW.client_id;
    
    -- Create notification
    IF v_user_id IS NOT NULL THEN
        PERFORM public.create_notification(
            v_user_id,
            'Training Plan Assigned',
            v_coach_name || ' assigned "' || v_plan_name || '" to you',
            'coach',
            'training_plan',
            NEW.plan_id,
            '/train'
        );
        
        -- Also update coach_name in assignment for display
        UPDATE public.client_plan_assignments
        SET coach_name = v_coach_name
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_plan_assigned ON public.client_plan_assignments;
CREATE TRIGGER trg_notify_plan_assigned
AFTER INSERT ON public.client_plan_assignments
FOR EACH ROW
EXECUTE FUNCTION public.notify_plan_assigned();