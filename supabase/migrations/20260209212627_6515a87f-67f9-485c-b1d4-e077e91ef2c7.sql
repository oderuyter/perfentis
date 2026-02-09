
-- Create hr_devices table for paired heart rate monitors
CREATE TABLE public.hr_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  manufacturer TEXT,
  transport TEXT NOT NULL DEFAULT 'ble' CHECK (transport IN ('ble', 'ant')),
  device_identifier TEXT,
  last_connected_at TIMESTAMP WITH TIME ZONE,
  is_preferred BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create hr_samples table for full HR stream per workout
CREATE TABLE public.hr_samples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  bpm INTEGER NOT NULL CHECK (bpm > 0 AND bpm < 300),
  source_device_id UUID REFERENCES public.hr_devices(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add time_in_zones and hr_device_id to workout_sessions
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS time_in_zones JSONB,
  ADD COLUMN IF NOT EXISTS hr_device_id UUID REFERENCES public.hr_devices(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_hr_devices_user_id ON public.hr_devices(user_id);
CREATE INDEX idx_hr_samples_session_id ON public.hr_samples(session_id);
CREATE INDEX idx_hr_samples_timestamp ON public.hr_samples(session_id, timestamp);

-- Enable RLS
ALTER TABLE public.hr_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_samples ENABLE ROW LEVEL SECURITY;

-- RLS policies for hr_devices
CREATE POLICY "Users can view their own devices"
  ON public.hr_devices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own devices"
  ON public.hr_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices"
  ON public.hr_devices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices"
  ON public.hr_devices FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all devices (read-only for analytics)
CREATE POLICY "Admins can view all devices"
  ON public.hr_devices FOR SELECT
  USING (public.has_role(auth.uid(), 'admin', 'global'));

-- RLS policies for hr_samples
CREATE POLICY "Users can view their own HR samples"
  ON public.hr_samples FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workout_sessions ws
    WHERE ws.id = session_id AND ws.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert HR samples for their sessions"
  ON public.hr_samples FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workout_sessions ws
    WHERE ws.id = session_id AND ws.user_id = auth.uid()
  ));

-- Admins can view all samples (for analytics)
CREATE POLICY "Admins can view all HR samples"
  ON public.hr_samples FOR SELECT
  USING (public.has_role(auth.uid(), 'admin', 'global'));

-- Function to ensure only one preferred device per user
CREATE OR REPLACE FUNCTION public.ensure_single_preferred_hr_device()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_preferred = true THEN
    UPDATE public.hr_devices
    SET is_preferred = false
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_preferred = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ensure_single_preferred_hr_device
  BEFORE INSERT OR UPDATE ON public.hr_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_preferred_hr_device();
