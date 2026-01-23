
-- =============================================
-- RUN CLUB PLATFORM - COMPLETE SCHEMA
-- =============================================

-- 1. Add new roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'run_club_organiser';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'run_club_member';

-- 2. Create run_clubs table
CREATE TABLE IF NOT EXISTS public.run_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'suspended')),
  
  -- Location
  primary_city TEXT,
  primary_postcode TEXT,
  primary_country TEXT DEFAULT 'GB',
  meeting_locations JSONB DEFAULT '[]'::jsonb,
  
  -- Club details
  club_style TEXT CHECK (club_style IN ('social', 'competitive', 'mixed')),
  distances_offered TEXT[] DEFAULT '{}',
  days_of_week INTEGER[] DEFAULT '{}',
  pace_groups JSONB DEFAULT '[]'::jsonb,
  
  -- Membership
  membership_type TEXT DEFAULT 'free' CHECK (membership_type IN ('free', 'paid')),
  membership_fee NUMERIC(10,2),
  membership_fee_cadence TEXT CHECK (membership_fee_cadence IN ('monthly', 'quarterly', 'annually', 'one-time')),
  membership_benefits TEXT,
  membership_expectations TEXT,
  
  -- Contact & social
  contact_email TEXT,
  contact_phone TEXT,
  website_url TEXT,
  instagram_handle TEXT,
  facebook_url TEXT,
  strava_club_url TEXT,
  
  -- Settings
  applications_enabled BOOLEAN DEFAULT true,
  auto_approve_applications BOOLEAN DEFAULT false,
  
  -- Calendar sync fields
  calendar_sync_enabled BOOLEAN DEFAULT false,
  ical_uid TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  sync_version INTEGER DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create run_club_organisers table
CREATE TABLE IF NOT EXISTS public.run_club_organisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_club_id UUID NOT NULL REFERENCES public.run_clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(run_club_id, user_id)
);

-- 4. Create run_club_members table
CREATE TABLE IF NOT EXISTS public.run_club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_club_id UUID NOT NULL REFERENCES public.run_clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(run_club_id, user_id)
);

-- 5. Create run_club_applications table
CREATE TABLE IF NOT EXISTS public.run_club_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_club_id UUID NOT NULL REFERENCES public.run_clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  
  -- Snapshot of user details at application time
  applicant_name TEXT,
  applicant_email TEXT,
  applicant_phone TEXT,
  
  -- CRM & messaging links
  crm_lead_id UUID,
  conversation_id UUID,
  
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(run_club_id, user_id)
);

-- 6. Create run_club_runs table (recurring runs)
CREATE TABLE IF NOT EXISTS public.run_club_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_club_id UUID NOT NULL REFERENCES public.run_clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Schedule
  is_recurring BOOLEAN DEFAULT true,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME,
  end_time TIME,
  recurrence_rule TEXT, -- iCal RRULE format for future
  one_off_date DATE, -- For non-recurring runs
  timezone TEXT DEFAULT 'Europe/London',
  
  -- Location
  meeting_point TEXT,
  meeting_point_coords JSONB,
  route_description TEXT,
  
  -- Run details
  distances TEXT[] DEFAULT '{}',
  pace_groups JSONB DEFAULT '[]'::jsonb,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'all-levels')),
  
  -- Tracking & linking
  attendance_tracking_enabled BOOLEAN DEFAULT true,
  can_link_to_workout BOOLEAN DEFAULT true,
  workout_linkable BOOLEAN DEFAULT true,
  
  -- Calendar sync
  ical_uid TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  sync_version INTEGER DEFAULT 1,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Create run_club_run_instances table (for tracking specific occurrences)
CREATE TABLE IF NOT EXISTS public.run_club_run_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.run_club_runs(id) ON DELETE CASCADE,
  run_club_id UUID NOT NULL REFERENCES public.run_clubs(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  cancellation_reason TEXT,
  notes TEXT,
  weather_conditions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(run_id, scheduled_date)
);

-- 8. Create run_club_attendance table
CREATE TABLE IF NOT EXISTS public.run_club_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_instance_id UUID REFERENCES public.run_club_run_instances(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES public.run_club_runs(id) ON DELETE CASCADE,
  run_club_id UUID NOT NULL REFERENCES public.run_clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attended BOOLEAN DEFAULT false,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(run_instance_id, user_id)
);

-- 9. Create run_club_events table (races, socials, etc.)
CREATE TABLE IF NOT EXISTS public.run_club_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_club_id UUID NOT NULL REFERENCES public.run_clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'race' CHECK (event_type IN ('race', 'time_trial', 'social', 'training', 'other')),
  
  -- DateTime
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  timezone TEXT DEFAULT 'Europe/London',
  
  -- Location
  location TEXT,
  location_coords JSONB,
  
  -- Details
  distances TEXT[] DEFAULT '{}',
  capacity INTEGER,
  registration_required BOOLEAN DEFAULT false,
  registration_deadline TIMESTAMPTZ,
  external_registration_url TEXT,
  
  -- Status
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('draft', 'upcoming', 'ongoing', 'completed', 'cancelled')),
  
  -- Calendar sync
  ical_uid TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  sync_version INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Create run_club_event_registrations table
CREATE TABLE IF NOT EXISTS public.run_club_event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.run_club_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'waitlist', 'cancelled')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- 11. Create run_club_announcements table
CREATE TABLE IF NOT EXISTS public.run_club_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_club_id UUID NOT NULL REFERENCES public.run_clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_user_id UUID NOT NULL REFERENCES auth.users(id),
  is_pinned BOOLEAN DEFAULT false,
  send_notification BOOLEAN DEFAULT true,
  send_email BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_run_clubs_status ON public.run_clubs(status);
CREATE INDEX IF NOT EXISTS idx_run_clubs_owner ON public.run_clubs(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_run_clubs_city ON public.run_clubs(primary_city);
CREATE INDEX IF NOT EXISTS idx_run_club_organisers_user ON public.run_club_organisers(user_id);
CREATE INDEX IF NOT EXISTS idx_run_club_organisers_club ON public.run_club_organisers(run_club_id);
CREATE INDEX IF NOT EXISTS idx_run_club_members_user ON public.run_club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_run_club_members_club ON public.run_club_members(run_club_id);
CREATE INDEX IF NOT EXISTS idx_run_club_members_status ON public.run_club_members(status);
CREATE INDEX IF NOT EXISTS idx_run_club_applications_status ON public.run_club_applications(status);
CREATE INDEX IF NOT EXISTS idx_run_club_runs_club ON public.run_club_runs(run_club_id);
CREATE INDEX IF NOT EXISTS idx_run_club_attendance_user ON public.run_club_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_run_club_attendance_run ON public.run_club_attendance(run_id);
CREATE INDEX IF NOT EXISTS idx_run_club_events_club ON public.run_club_events(run_club_id);
CREATE INDEX IF NOT EXISTS idx_run_club_events_date ON public.run_club_events(event_date);

-- 13. Enable RLS on all tables
ALTER TABLE public.run_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_club_organisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_club_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_club_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_club_run_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_club_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_club_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_club_event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_club_announcements ENABLE ROW LEVEL SECURITY;

-- 14. Helper function to check run club organiser access
CREATE OR REPLACE FUNCTION public.is_run_club_organiser(_user_id UUID, _run_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.run_club_organisers
    WHERE run_club_id = _run_club_id
    AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.run_clubs
    WHERE id = _run_club_id
    AND owner_user_id = _user_id
  ) OR public.has_role(_user_id, 'admin', 'global')
$$;

-- 15. Helper function to check run club member access
CREATE OR REPLACE FUNCTION public.is_run_club_member(_user_id UUID, _run_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.run_club_members
    WHERE run_club_id = _run_club_id
    AND user_id = _user_id
    AND status = 'active'
  )
$$;

-- 16. RLS Policies for run_clubs
CREATE POLICY "Anyone can view published run clubs"
  ON public.run_clubs FOR SELECT
  USING (status = 'published' OR owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin', 'global'));

CREATE POLICY "Owners can insert their own clubs"
  ON public.run_clubs FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Organisers can update their clubs"
  ON public.run_clubs FOR UPDATE
  USING (public.is_run_club_organiser(auth.uid(), id));

CREATE POLICY "Owners can delete their clubs"
  ON public.run_clubs FOR DELETE
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin', 'global'));

-- 17. RLS Policies for run_club_organisers
CREATE POLICY "Organisers can view their club's organisers"
  ON public.run_club_organisers FOR SELECT
  USING (
    public.is_run_club_organiser(auth.uid(), run_club_id) 
    OR public.has_role(auth.uid(), 'admin', 'global')
    OR user_id = auth.uid()
  );

CREATE POLICY "Club owners can manage organisers"
  ON public.run_club_organisers FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.run_clubs WHERE id = run_club_id AND owner_user_id = auth.uid())
    OR public.is_run_club_organiser(auth.uid(), run_club_id)
  );

CREATE POLICY "Club owners can update organisers"
  ON public.run_club_organisers FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.run_clubs WHERE id = run_club_id AND owner_user_id = auth.uid())
  );

CREATE POLICY "Club owners can remove organisers"
  ON public.run_club_organisers FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.run_clubs WHERE id = run_club_id AND owner_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin', 'global')
  );

-- 18. RLS Policies for run_club_members
CREATE POLICY "Organisers can view their club's members"
  ON public.run_club_members FOR SELECT
  USING (
    public.is_run_club_organiser(auth.uid(), run_club_id)
    OR user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin', 'global')
  );

CREATE POLICY "System can insert members"
  ON public.run_club_members FOR INSERT
  WITH CHECK (
    public.is_run_club_organiser(auth.uid(), run_club_id)
    OR public.has_role(auth.uid(), 'admin', 'global')
  );

CREATE POLICY "Organisers can update members"
  ON public.run_club_members FOR UPDATE
  USING (public.is_run_club_organiser(auth.uid(), run_club_id));

CREATE POLICY "Organisers can remove members"
  ON public.run_club_members FOR DELETE
  USING (public.is_run_club_organiser(auth.uid(), run_club_id) OR public.has_role(auth.uid(), 'admin', 'global'));

-- 19. RLS Policies for run_club_applications
CREATE POLICY "Users can view their own applications"
  ON public.run_club_applications FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_run_club_organiser(auth.uid(), run_club_id)
    OR public.has_role(auth.uid(), 'admin', 'global')
  );

CREATE POLICY "Users can apply to clubs"
  ON public.run_club_applications FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Organisers can update applications"
  ON public.run_club_applications FOR UPDATE
  USING (public.is_run_club_organiser(auth.uid(), run_club_id));

-- 20. RLS Policies for run_club_runs
CREATE POLICY "Anyone can view runs of published clubs"
  ON public.run_club_runs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.run_clubs WHERE id = run_club_id AND status = 'published')
    OR public.is_run_club_organiser(auth.uid(), run_club_id)
    OR public.has_role(auth.uid(), 'admin', 'global')
  );

CREATE POLICY "Organisers can manage runs"
  ON public.run_club_runs FOR INSERT
  WITH CHECK (public.is_run_club_organiser(auth.uid(), run_club_id));

CREATE POLICY "Organisers can update runs"
  ON public.run_club_runs FOR UPDATE
  USING (public.is_run_club_organiser(auth.uid(), run_club_id));

CREATE POLICY "Organisers can delete runs"
  ON public.run_club_runs FOR DELETE
  USING (public.is_run_club_organiser(auth.uid(), run_club_id));

-- 21. RLS Policies for run_club_run_instances
CREATE POLICY "Anyone can view run instances of published clubs"
  ON public.run_club_run_instances FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.run_clubs WHERE id = run_club_id AND status = 'published')
    OR public.is_run_club_organiser(auth.uid(), run_club_id)
  );

CREATE POLICY "Organisers can manage run instances"
  ON public.run_club_run_instances FOR ALL
  USING (public.is_run_club_organiser(auth.uid(), run_club_id));

-- 22. RLS Policies for run_club_attendance
CREATE POLICY "Users can view their own attendance"
  ON public.run_club_attendance FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_run_club_organiser(auth.uid(), run_club_id)
    OR public.has_role(auth.uid(), 'admin', 'global')
  );

CREATE POLICY "Organisers can manage attendance"
  ON public.run_club_attendance FOR ALL
  USING (public.is_run_club_organiser(auth.uid(), run_club_id));

-- 23. RLS Policies for run_club_events
CREATE POLICY "Anyone can view events of published clubs"
  ON public.run_club_events FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.run_clubs WHERE id = run_club_id AND status = 'published')
    OR public.is_run_club_organiser(auth.uid(), run_club_id)
    OR public.has_role(auth.uid(), 'admin', 'global')
  );

CREATE POLICY "Organisers can manage events"
  ON public.run_club_events FOR INSERT
  WITH CHECK (public.is_run_club_organiser(auth.uid(), run_club_id));

CREATE POLICY "Organisers can update events"
  ON public.run_club_events FOR UPDATE
  USING (public.is_run_club_organiser(auth.uid(), run_club_id));

CREATE POLICY "Organisers can delete events"
  ON public.run_club_events FOR DELETE
  USING (public.is_run_club_organiser(auth.uid(), run_club_id));

-- 24. RLS Policies for run_club_event_registrations
CREATE POLICY "Users can view their own event registrations"
  ON public.run_club_event_registrations FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.run_club_events e
      WHERE e.id = event_id AND public.is_run_club_organiser(auth.uid(), e.run_club_id)
    )
  );

CREATE POLICY "Users can register for events"
  ON public.run_club_event_registrations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their registrations"
  ON public.run_club_event_registrations FOR UPDATE
  USING (user_id = auth.uid());

-- 25. RLS Policies for run_club_announcements
CREATE POLICY "Members can view announcements"
  ON public.run_club_announcements FOR SELECT
  USING (
    public.is_run_club_member(auth.uid(), run_club_id)
    OR public.is_run_club_organiser(auth.uid(), run_club_id)
    OR public.has_role(auth.uid(), 'admin', 'global')
  );

CREATE POLICY "Organisers can create announcements"
  ON public.run_club_announcements FOR INSERT
  WITH CHECK (public.is_run_club_organiser(auth.uid(), run_club_id));

CREATE POLICY "Organisers can update announcements"
  ON public.run_club_announcements FOR UPDATE
  USING (public.is_run_club_organiser(auth.uid(), run_club_id));

CREATE POLICY "Organisers can delete announcements"
  ON public.run_club_announcements FOR DELETE
  USING (public.is_run_club_organiser(auth.uid(), run_club_id));

-- 26. Trigger to update timestamps
CREATE TRIGGER update_run_clubs_updated_at
  BEFORE UPDATE ON public.run_clubs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_run_club_members_updated_at
  BEFORE UPDATE ON public.run_club_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_run_club_applications_updated_at
  BEFORE UPDATE ON public.run_club_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_run_club_runs_updated_at
  BEFORE UPDATE ON public.run_club_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_run_club_run_instances_updated_at
  BEFORE UPDATE ON public.run_club_run_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_run_club_events_updated_at
  BEFORE UPDATE ON public.run_club_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 27. Function to auto-assign organiser role when club is created
CREATE OR REPLACE FUNCTION public.ensure_run_club_organiser_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add owner as organiser
  INSERT INTO public.run_club_organisers (run_club_id, user_id, role)
  VALUES (NEW.id, NEW.owner_user_id, 'owner')
  ON CONFLICT DO NOTHING;
  
  -- Add user role
  INSERT INTO public.user_roles (user_id, role, scope_type, scope_id)
  VALUES (NEW.owner_user_id, 'run_club_organiser', 'run_club', NEW.id)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_run_club_organiser_role_trigger
  AFTER INSERT ON public.run_clubs
  FOR EACH ROW EXECUTE FUNCTION public.ensure_run_club_organiser_role();

-- 28. Function to handle application approval
CREATE OR REPLACE FUNCTION public.approve_run_club_application(p_application_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app RECORD;
  v_member_id UUID;
BEGIN
  -- Get application
  SELECT * INTO v_app FROM public.run_club_applications WHERE id = p_application_id;
  
  IF v_app IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;
  
  IF v_app.status != 'pending' THEN
    RAISE EXCEPTION 'Application is not pending';
  END IF;
  
  -- Check caller is organiser
  IF NOT public.is_run_club_organiser(auth.uid(), v_app.run_club_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  -- Update application status
  UPDATE public.run_club_applications
  SET status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = p_application_id;
  
  -- Create member record
  INSERT INTO public.run_club_members (run_club_id, user_id, status, joined_at)
  VALUES (v_app.run_club_id, v_app.user_id, 'active', now())
  ON CONFLICT (run_club_id, user_id) DO UPDATE SET status = 'active', suspended_at = NULL
  RETURNING id INTO v_member_id;
  
  -- Add member role
  INSERT INTO public.user_roles (user_id, role, scope_type, scope_id)
  VALUES (v_app.user_id, 'run_club_member', 'run_club', v_app.run_club_id)
  ON CONFLICT DO NOTHING;
  
  -- Create notification for user
  PERFORM public.create_notification(
    v_app.user_id,
    'Application Approved!',
    'Your application to join the run club has been approved. Welcome!',
    'run_club',
    'run_club',
    v_app.run_club_id::text,
    '/run-clubs/' || v_app.run_club_id
  );
  
  RETURN v_member_id;
END;
$$;

-- 29. Function to reject application
CREATE OR REPLACE FUNCTION public.reject_run_club_application(p_application_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app RECORD;
BEGIN
  SELECT * INTO v_app FROM public.run_club_applications WHERE id = p_application_id;
  
  IF v_app IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;
  
  IF NOT public.is_run_club_organiser(auth.uid(), v_app.run_club_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  UPDATE public.run_club_applications
  SET status = 'rejected',
      rejection_reason = p_reason,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = p_application_id;
  
  -- Notify user
  PERFORM public.create_notification(
    v_app.user_id,
    'Application Update',
    CASE WHEN p_reason IS NOT NULL 
      THEN 'Your application was not approved: ' || p_reason
      ELSE 'Your application was not approved at this time.'
    END,
    'run_club',
    'run_club',
    v_app.run_club_id::text,
    '/run-clubs'
  );
END;
$$;

-- 30. Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.run_club_applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.run_club_announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.run_club_members;

-- 31. Add CRM context type for run clubs (extend existing types if needed)
-- First check if we need to add run_club to conversation context types
DO $$
BEGIN
  -- Add run_club as a valid context for conversations if not exists
  -- This is handled by the existing text field, no enum change needed
END $$;

-- 32. Create storage bucket for run club images
INSERT INTO storage.buckets (id, name, public)
VALUES ('run-club-images', 'run-club-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for run club images
CREATE POLICY "Run club images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'run-club-images');

CREATE POLICY "Organisers can upload run club images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'run-club-images' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Organisers can update run club images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'run-club-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Organisers can delete run club images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'run-club-images' AND auth.uid() IS NOT NULL);
