
-- Add height_cm to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS height_cm numeric;

-- Create bodyweight log table for tracking over time
CREATE TABLE public.bodyweight_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  weight_kg numeric NOT NULL,
  logged_at timestamp with time zone NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bodyweight_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own bodyweight logs"
  ON public.bodyweight_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bodyweight logs"
  ON public.bodyweight_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bodyweight logs"
  ON public.bodyweight_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bodyweight logs"
  ON public.bodyweight_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_bodyweight_logs_user_date ON public.bodyweight_logs (user_id, logged_at DESC);

-- Trigger: when a bodyweight log is inserted, update profiles.bodyweight_kg to latest
CREATE OR REPLACE FUNCTION public.sync_bodyweight_to_profile()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET bodyweight_kg = NEW.weight_kg
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_bodyweight_to_profile
  AFTER INSERT ON public.bodyweight_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_bodyweight_to_profile();
