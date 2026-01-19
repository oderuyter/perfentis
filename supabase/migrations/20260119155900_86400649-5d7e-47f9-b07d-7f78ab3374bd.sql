-- Add enable_checkin column to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS enable_checkin boolean DEFAULT false;

-- Create event_registration_passes table for secure QR passes
CREATE TABLE public.event_registration_passes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES public.event_team_members(id) ON DELETE CASCADE,
  pass_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'used')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT pass_target_check CHECK (
    (registration_id IS NOT NULL AND team_member_id IS NULL) OR
    (registration_id IS NULL AND team_member_id IS NOT NULL)
  )
);

-- Create event_checkins table for tracking check-in actions
CREATE TABLE public.event_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES public.event_team_members(id) ON DELETE CASCADE,
  checked_in_by_user_id UUID NOT NULL,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  method TEXT NOT NULL CHECK (method IN ('qr', 'manual')),
  source TEXT NOT NULL CHECK (source IN ('portal', 'station')),
  device_id TEXT,
  operation_id TEXT NOT NULL UNIQUE,
  undone_at TIMESTAMP WITH TIME ZONE,
  undone_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT checkin_target_check CHECK (
    (registration_id IS NOT NULL AND team_member_id IS NULL) OR
    (registration_id IS NULL AND team_member_id IS NOT NULL)
  )
);

-- Add active_for_event column to event_registrations for scoring eligibility
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS active_for_event boolean DEFAULT false;

-- Create indexes for performance
CREATE INDEX idx_event_passes_event_id ON public.event_registration_passes(event_id);
CREATE INDEX idx_event_passes_registration_id ON public.event_registration_passes(registration_id);
CREATE INDEX idx_event_passes_team_member_id ON public.event_registration_passes(team_member_id);
CREATE INDEX idx_event_passes_token ON public.event_registration_passes(pass_token);
CREATE INDEX idx_event_checkins_event_id ON public.event_checkins(event_id);
CREATE INDEX idx_event_checkins_registration_id ON public.event_checkins(registration_id);
CREATE INDEX idx_event_checkins_operation_id ON public.event_checkins(operation_id);

-- Enable RLS
ALTER TABLE public.event_registration_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_registration_passes
-- Users can view their own passes
CREATE POLICY "Users can view their own passes"
ON public.event_registration_passes
FOR SELECT
USING (
  registration_id IN (
    SELECT id FROM public.event_registrations WHERE user_id = auth.uid()
  )
  OR
  team_member_id IN (
    SELECT id FROM public.event_team_members WHERE user_id = auth.uid()
  )
);

-- Event organisers can manage passes for their events
CREATE POLICY "Event organisers can manage passes"
ON public.event_registration_passes
FOR ALL
USING (
  event_id IN (
    SELECT id FROM public.events WHERE organiser_id = auth.uid()
  )
);

-- RLS Policies for event_checkins
-- Event organisers can manage check-ins
CREATE POLICY "Event organisers can manage checkins"
ON public.event_checkins
FOR ALL
USING (
  event_id IN (
    SELECT id FROM public.events WHERE organiser_id = auth.uid()
  )
);

-- Users can view their own check-in status
CREATE POLICY "Users can view their own checkins"
ON public.event_checkins
FOR SELECT
USING (
  registration_id IN (
    SELECT id FROM public.event_registrations WHERE user_id = auth.uid()
  )
  OR
  team_member_id IN (
    SELECT id FROM public.event_team_members WHERE user_id = auth.uid()
  )
);

-- Function to generate secure pass token
CREATE OR REPLACE FUNCTION public.generate_pass_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to create pass for registration (auto-generate token)
CREATE OR REPLACE FUNCTION public.create_event_pass(
  p_event_id UUID,
  p_registration_id UUID DEFAULT NULL,
  p_team_member_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_pass_id UUID;
BEGIN
  INSERT INTO public.event_registration_passes (event_id, registration_id, team_member_id, pass_token)
  VALUES (p_event_id, p_registration_id, p_team_member_id, public.generate_pass_token())
  RETURNING id INTO v_pass_id;
  
  RETURN v_pass_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-generate passes when registration is confirmed
CREATE OR REPLACE FUNCTION public.auto_generate_event_pass()
RETURNS TRIGGER AS $$
DECLARE
  v_enable_checkin BOOLEAN;
BEGIN
  -- Check if event has check-in enabled
  SELECT enable_checkin INTO v_enable_checkin
  FROM public.events
  WHERE id = NEW.event_id;
  
  -- Only create pass if check-in is enabled and registration is confirmed
  IF v_enable_checkin = true AND NEW.status = 'confirmed' THEN
    -- Check if pass already exists
    IF NOT EXISTS (
      SELECT 1 FROM public.event_registration_passes 
      WHERE registration_id = NEW.id AND status = 'active'
    ) THEN
      PERFORM public.create_event_pass(NEW.event_id, NEW.id, NULL);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_auto_generate_event_pass
AFTER INSERT OR UPDATE ON public.event_registrations
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_event_pass();