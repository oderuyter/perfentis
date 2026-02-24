
-- ================================================================
-- Display Mode: Tables for TV/Tablet displays in gyms & coach studios
-- ================================================================

-- 1) displays: physical screen configurations
CREATE TABLE public.displays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('gym', 'coach')),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Display 1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_token TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_displays_owner ON public.displays (owner_type, owner_id);
CREATE INDEX idx_displays_token ON public.displays (display_token);

-- 2) display_sessions: active broadcast sessions
CREATE TABLE public.display_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  display_id UUID NOT NULL REFERENCES public.displays(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'active', 'ended')),
  title TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  current_workout_session_id UUID REFERENCES public.workout_sessions(id) ON DELETE SET NULL,
  controlling_user_id UUID,
  settings_json JSONB NOT NULL DEFAULT '{
    "privacy_mode": "structure_only",
    "show_user_names": false,
    "max_participant_tiles": 1
  }'::jsonb,
  join_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_display_sessions_display ON public.display_sessions (display_id);
CREATE INDEX idx_display_sessions_status ON public.display_sessions (status);

-- 3) display_participants: users connected to a display session
CREATE TABLE public.display_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  display_session_id UUID NOT NULL REFERENCES public.display_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  workout_session_id UUID REFERENCES public.workout_sessions(id) ON DELETE SET NULL,
  role_in_session TEXT NOT NULL DEFAULT 'participant' CHECK (role_in_session IN ('broadcaster', 'participant')),
  share_level TEXT NOT NULL DEFAULT 'structure_only' CHECK (share_level IN ('structure_only', 'completion_only', 'full_stats')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected')),
  UNIQUE (display_session_id, user_id)
);

CREATE INDEX idx_display_participants_session ON public.display_participants (display_session_id);

-- Triggers for updated_at
CREATE TRIGGER update_displays_updated_at
  BEFORE UPDATE ON public.displays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_display_sessions_updated_at
  BEFORE UPDATE ON public.display_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.displays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.display_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.display_participants ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- RLS Policies for displays
-- ================================================================

-- Gym owners/staff and coaches can manage their own displays
CREATE POLICY "Display owners can manage displays"
  ON public.displays FOR ALL
  USING (
    (owner_type = 'gym' AND (
      EXISTS (SELECT 1 FROM public.gyms WHERE id = owner_id AND owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.gym_staff WHERE gym_id = displays.owner_id AND user_id = auth.uid())
      OR public.has_role(auth.uid(), 'gym_manager', 'gym', displays.owner_id)
    ))
    OR
    (owner_type = 'coach' AND EXISTS (SELECT 1 FROM public.coaches WHERE id = owner_id AND user_id = auth.uid()))
    OR
    public.has_role(auth.uid(), 'admin', 'global')
  );

-- Anyone can read a display by token (for unauthenticated display page)
-- We handle this via edge function / service role, not direct RLS

-- ================================================================
-- RLS Policies for display_sessions
-- ================================================================

-- Display owners can manage sessions
CREATE POLICY "Display owners can manage sessions"
  ON public.display_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.displays d
      WHERE d.id = display_id AND (
        (d.owner_type = 'gym' AND (
          EXISTS (SELECT 1 FROM public.gyms WHERE id = d.owner_id AND owner_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.gym_staff WHERE gym_id = d.owner_id AND user_id = auth.uid())
        ))
        OR (d.owner_type = 'coach' AND EXISTS (SELECT 1 FROM public.coaches WHERE id = d.owner_id AND user_id = auth.uid()))
        OR public.has_role(auth.uid(), 'admin', 'global')
      )
    )
  );

-- Controllers can manage their sessions
CREATE POLICY "Controllers can manage their sessions"
  ON public.display_sessions FOR ALL
  USING (controlling_user_id = auth.uid());

-- Participants can view sessions they're in
CREATE POLICY "Participants can view sessions"
  ON public.display_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.display_participants dp
      WHERE dp.display_session_id = id AND dp.user_id = auth.uid()
    )
  );

-- ================================================================
-- RLS Policies for display_participants
-- ================================================================

-- Users can manage their own participation
CREATE POLICY "Users manage own participation"
  ON public.display_participants FOR ALL
  USING (user_id = auth.uid());

-- Session controllers can view all participants
CREATE POLICY "Controllers can view participants"
  ON public.display_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.display_sessions ds
      WHERE ds.id = display_session_id AND (
        ds.controlling_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.displays d
          WHERE d.id = ds.display_id AND (
            (d.owner_type = 'gym' AND (
              EXISTS (SELECT 1 FROM public.gyms WHERE id = d.owner_id AND owner_id = auth.uid())
              OR EXISTS (SELECT 1 FROM public.gym_staff WHERE gym_id = d.owner_id AND user_id = auth.uid())
            ))
            OR (d.owner_type = 'coach' AND EXISTS (SELECT 1 FROM public.coaches WHERE id = d.owner_id AND user_id = auth.uid()))
          )
        )
      )
    )
  );

-- Enable realtime for display sessions and participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.display_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.display_participants;

-- Function to generate short join codes
CREATE OR REPLACE FUNCTION public.generate_display_join_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code TEXT;
  v_attempts INTEGER := 0;
BEGIN
  LOOP
    v_code := UPPER(SUBSTRING(encode(extensions.gen_random_bytes(4), 'hex') FROM 1 FOR 6));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.display_sessions 
      WHERE join_code = v_code AND status = 'active'
    );
    v_attempts := v_attempts + 1;
    IF v_attempts > 50 THEN
      RAISE EXCEPTION 'Could not generate unique join code';
    END IF;
  END LOOP;
  RETURN v_code;
END;
$$;
