
-- Create user_workout_preferences table
CREATE TABLE public.user_workout_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  default_rest_seconds INTEGER NOT NULL DEFAULT 45,
  default_sets INTEGER NOT NULL DEFAULT 4,
  default_reps INTEGER NOT NULL DEFAULT 8,
  weight_prefill_mode TEXT NOT NULL DEFAULT 'hybrid',
  weight_rounding_increment DECIMAL NOT NULL DEFAULT 0.25,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_workout_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own workout preferences"
  ON public.user_workout_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout preferences"
  ON public.user_workout_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout preferences"
  ON public.user_workout_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_user_workout_preferences_updated_at
  BEFORE UPDATE ON public.user_workout_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
