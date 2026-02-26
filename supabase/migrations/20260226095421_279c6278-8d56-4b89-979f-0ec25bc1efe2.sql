
ALTER TABLE public.user_workout_preferences
  ADD COLUMN IF NOT EXISTS rest_timer_sound boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rest_timer_haptics boolean NOT NULL DEFAULT true;
