
-- Add min_hr to workout_sessions if missing
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS min_hr integer;
