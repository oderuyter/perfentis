
-- Add event_organiser role if not exists (check enum)
-- Note: event_organiser already exists in app_role enum

-- Update events table with additional fields
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS event_type text DEFAULT 'single_day',
ADD COLUMN IF NOT EXISTS event_mode text DEFAULT 'in_person',
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date,
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS hero_image_url text,
ADD COLUMN IF NOT EXISTS rules text,
ADD COLUMN IF NOT EXISTS contact_email text;

-- Update event_date to start_date where applicable
UPDATE public.events SET start_date = event_date WHERE start_date IS NULL AND event_date IS NOT NULL;

-- Event tickets (pricing per division)
CREATE TABLE IF NOT EXISTS public.event_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  division_id uuid REFERENCES public.event_divisions(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  early_bird_price numeric,
  early_bird_deadline timestamp with time zone,
  capacity integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Event registrations (individual registrations)
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  division_id uuid REFERENCES public.event_divisions(id),
  ticket_id uuid REFERENCES public.event_tickets(id),
  team_id uuid,
  registration_type text NOT NULL DEFAULT 'individual',
  status text NOT NULL DEFAULT 'pending',
  payment_status text DEFAULT 'pending',
  payment_intent_id text,
  amount_paid numeric,
  waiver_accepted boolean DEFAULT false,
  custom_fields jsonb DEFAULT '{}',
  checked_in_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Event teams
CREATE TABLE IF NOT EXISTS public.event_teams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  division_id uuid REFERENCES public.event_divisions(id),
  name text NOT NULL,
  leader_id uuid NOT NULL,
  size_limit integer DEFAULT 2,
  status text NOT NULL DEFAULT 'forming',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add team_id FK to registrations
ALTER TABLE public.event_registrations 
ADD CONSTRAINT event_registrations_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.event_teams(id) ON DELETE SET NULL;

-- Event team members
CREATE TABLE IF NOT EXISTS public.event_team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.event_teams(id) ON DELETE CASCADE,
  user_id uuid,
  email text NOT NULL,
  name text,
  role text DEFAULT 'member',
  status text NOT NULL DEFAULT 'invited',
  invited_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Update event_divisions with more fields
ALTER TABLE public.event_divisions
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS difficulty_level text DEFAULT 'rx',
ADD COLUMN IF NOT EXISTS team_size integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS age_group text,
ADD COLUMN IF NOT EXISTS capacity integer,
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Update event_workouts with more fields
ALTER TABLE public.event_workouts
ADD COLUMN IF NOT EXISTS workout_type text DEFAULT 'amrap',
ADD COLUMN IF NOT EXISTS time_cap_seconds integer,
ADD COLUMN IF NOT EXISTS scoring_type text DEFAULT 'reps',
ADD COLUMN IF NOT EXISTS standards text,
ADD COLUMN IF NOT EXISTS exercise_data jsonb,
ADD COLUMN IF NOT EXISTS stage_day integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS submission_deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false;

-- Event heats
CREATE TABLE IF NOT EXISTS public.event_heats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  workout_id uuid REFERENCES public.event_workouts(id) ON DELETE CASCADE,
  division_id uuid REFERENCES public.event_divisions(id),
  name text,
  start_time timestamp with time zone,
  duration_minutes integer DEFAULT 15,
  lane_count integer DEFAULT 6,
  status text DEFAULT 'scheduled',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Event lane assignments
CREATE TABLE IF NOT EXISTS public.event_lane_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  heat_id uuid NOT NULL REFERENCES public.event_heats(id) ON DELETE CASCADE,
  lane_number integer NOT NULL,
  registration_id uuid REFERENCES public.event_registrations(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.event_teams(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(heat_id, lane_number)
);

-- Event scores
CREATE TABLE IF NOT EXISTS public.event_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  workout_id uuid NOT NULL REFERENCES public.event_workouts(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.event_teams(id) ON DELETE CASCADE,
  heat_id uuid REFERENCES public.event_heats(id),
  score_value numeric,
  score_time_seconds integer,
  score_reps integer,
  score_weight numeric,
  score_distance numeric,
  points integer,
  rank integer,
  status text DEFAULT 'submitted',
  rejection_reason text,
  validated_by uuid,
  validated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Event sponsors
CREATE TABLE IF NOT EXISTS public.event_sponsors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text,
  website_url text,
  tier text DEFAULT 'standard',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Event assets (logos, banners)
CREATE TABLE IF NOT EXISTS public.event_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  url text NOT NULL,
  alt_text text,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Event invites (for team invites and organiser invites)
CREATE TABLE IF NOT EXISTS public.event_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.event_teams(id) ON DELETE CASCADE,
  invite_type text NOT NULL DEFAULT 'team_member',
  email text NOT NULL,
  name text,
  token text NOT NULL DEFAULT gen_random_uuid()::text,
  status text DEFAULT 'pending',
  invited_by uuid NOT NULL,
  expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
  accepted_at timestamp with time zone,
  accepted_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Event staff/volunteers
CREATE TABLE IF NOT EXISTS public.event_staff (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid,
  email text,
  name text,
  role text NOT NULL DEFAULT 'volunteer',
  status text DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_heats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_lane_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_tickets
CREATE POLICY "Tickets viewable for published events" ON public.event_tickets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_tickets.event_id AND (events.status = 'published' OR events.organiser_id = auth.uid()))
  );

CREATE POLICY "Organisers can manage tickets" ON public.event_tickets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_tickets.event_id AND events.organiser_id = auth.uid())
  );

-- RLS Policies for event_registrations
CREATE POLICY "Users can view own registrations" ON public.event_registrations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Organisers can view event registrations" ON public.event_registrations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_registrations.event_id AND events.organiser_id = auth.uid())
  );

CREATE POLICY "Users can register for events" ON public.event_registrations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own registrations" ON public.event_registrations
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Organisers can manage registrations" ON public.event_registrations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_registrations.event_id AND events.organiser_id = auth.uid())
  );

-- RLS Policies for event_teams
CREATE POLICY "Team leaders can manage own teams" ON public.event_teams
  FOR ALL USING (leader_id = auth.uid());

CREATE POLICY "Organisers can manage teams" ON public.event_teams
  FOR ALL USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_teams.event_id AND events.organiser_id = auth.uid())
  );

CREATE POLICY "Team members can view their team" ON public.event_teams
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM event_team_members WHERE event_team_members.team_id = event_teams.id AND event_team_members.user_id = auth.uid())
  );

-- RLS Policies for event_team_members
CREATE POLICY "Team leaders can manage members" ON public.event_team_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM event_teams WHERE event_teams.id = event_team_members.team_id AND event_teams.leader_id = auth.uid())
  );

CREATE POLICY "Members can view own membership" ON public.event_team_members
  FOR SELECT USING (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Organisers can manage team members" ON public.event_team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM event_teams t 
      JOIN events e ON e.id = t.event_id 
      WHERE t.id = event_team_members.team_id AND e.organiser_id = auth.uid()
    )
  );

-- RLS Policies for event_heats
CREATE POLICY "Heats viewable for published events" ON public.event_heats
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_heats.event_id AND (events.status IN ('published', 'live') OR events.organiser_id = auth.uid()))
  );

CREATE POLICY "Organisers can manage heats" ON public.event_heats
  FOR ALL USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_heats.event_id AND events.organiser_id = auth.uid())
  );

-- RLS Policies for event_lane_assignments
CREATE POLICY "Lane assignments viewable with heats" ON public.event_lane_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_heats h 
      JOIN events e ON e.id = h.event_id 
      WHERE h.id = event_lane_assignments.heat_id AND (e.status IN ('published', 'live') OR e.organiser_id = auth.uid())
    )
  );

CREATE POLICY "Organisers can manage lane assignments" ON public.event_lane_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM event_heats h 
      JOIN events e ON e.id = h.event_id 
      WHERE h.id = event_lane_assignments.heat_id AND e.organiser_id = auth.uid()
    )
  );

-- RLS Policies for event_scores
CREATE POLICY "Scores are publicly viewable for live events" ON public.event_scores
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_scores.event_id AND events.status IN ('live', 'finished'))
  );

CREATE POLICY "Users can view own scores" ON public.event_scores
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM event_registrations WHERE event_registrations.id = event_scores.registration_id AND event_registrations.user_id = auth.uid())
  );

CREATE POLICY "Organisers can manage scores" ON public.event_scores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_scores.event_id AND events.organiser_id = auth.uid())
  );

-- RLS Policies for event_sponsors
CREATE POLICY "Sponsors viewable for published events" ON public.event_sponsors
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_sponsors.event_id AND events.status IN ('published', 'live', 'finished'))
  );

CREATE POLICY "Organisers can manage sponsors" ON public.event_sponsors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_sponsors.event_id AND events.organiser_id = auth.uid())
  );

-- RLS Policies for event_assets
CREATE POLICY "Assets viewable for published events" ON public.event_assets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_assets.event_id AND (events.status IN ('published', 'live', 'finished') OR events.organiser_id = auth.uid()))
  );

CREATE POLICY "Organisers can manage assets" ON public.event_assets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_assets.event_id AND events.organiser_id = auth.uid())
  );

-- RLS Policies for event_invites
CREATE POLICY "Anyone can view pending invites by token" ON public.event_invites
  FOR SELECT USING (status = 'pending' AND expires_at > now());

CREATE POLICY "Inviters can manage invites" ON public.event_invites
  FOR ALL USING (invited_by = auth.uid());

CREATE POLICY "Organisers can manage event invites" ON public.event_invites
  FOR ALL USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_invites.event_id AND events.organiser_id = auth.uid())
  );

-- RLS Policies for event_staff
CREATE POLICY "Staff can view own record" ON public.event_staff
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Organisers can manage staff" ON public.event_staff
  FOR ALL USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_staff.event_id AND events.organiser_id = auth.uid())
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON public.event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_teams_event_id ON public.event_teams(event_id);
CREATE INDEX IF NOT EXISTS idx_event_team_members_team_id ON public.event_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_event_heats_event_id ON public.event_heats(event_id);
CREATE INDEX IF NOT EXISTS idx_event_scores_event_id ON public.event_scores(event_id);
CREATE INDEX IF NOT EXISTS idx_event_scores_workout_id ON public.event_scores(workout_id);
CREATE INDEX IF NOT EXISTS idx_event_invites_token ON public.event_invites(token);
CREATE INDEX IF NOT EXISTS idx_event_invites_email ON public.event_invites(email);
