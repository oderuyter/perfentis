
-- =============================================
-- RUN TRACKER: Extend workout_sessions + create route tables
-- =============================================

-- 1. Add run-specific columns to workout_sessions
ALTER TABLE public.workout_sessions 
  ADD COLUMN IF NOT EXISTS modality TEXT NOT NULL DEFAULT 'strength',
  ADD COLUMN IF NOT EXISTS moving_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS distance_meters NUMERIC,
  ADD COLUMN IF NOT EXISTS avg_pace_sec_per_km NUMERIC,
  ADD COLUMN IF NOT EXISTS elevation_gain_m NUMERIC,
  ADD COLUMN IF NOT EXISTS elevation_loss_m NUMERIC,
  ADD COLUMN IF NOT EXISTS route_summary JSONB,
  ADD COLUMN IF NOT EXISTS privacy_level TEXT NOT NULL DEFAULT 'private';

-- 2. Activity Routes table
CREATE TABLE public.activity_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  polyline_simplified TEXT,
  bbox JSONB,
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own routes"
  ON public.activity_routes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));

CREATE POLICY "Users can insert own routes"
  ON public.activity_routes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));

CREATE POLICY "Users can update own routes"
  ON public.activity_routes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));

CREATE POLICY "Users can delete own routes"
  ON public.activity_routes FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));

-- 3. Activity Route Points table (telemetry)
CREATE TABLE public.activity_route_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  accuracy_m REAL,
  altitude_m REAL,
  speed_mps REAL,
  source TEXT DEFAULT 'gps',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_route_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own route points"
  ON public.activity_route_points FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));

CREATE POLICY "Users can insert own route points"
  ON public.activity_route_points FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));

CREATE POLICY "Users can delete own route points"
  ON public.activity_route_points FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));

-- Index for fast point retrieval
CREATE INDEX idx_route_points_session ON public.activity_route_points(session_id, idx);

-- 4. Activity Pauses table
CREATE TABLE public.activity_pauses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  paused_at TIMESTAMP WITH TIME ZONE NOT NULL,
  resumed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_pauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pauses"
  ON public.activity_pauses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));

CREATE POLICY "Users can insert own pauses"
  ON public.activity_pauses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));

CREATE POLICY "Users can update own pauses"
  ON public.activity_pauses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));

-- 5. Activity Laps table
CREATE TABLE public.activity_laps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  lap_number INTEGER NOT NULL,
  marked_at TIMESTAMP WITH TIME ZONE NOT NULL,
  distance_meters_at_mark NUMERIC,
  elapsed_seconds_at_mark INTEGER,
  moving_seconds_at_mark INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_laps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own laps"
  ON public.activity_laps FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));

CREATE POLICY "Users can insert own laps"
  ON public.activity_laps FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));

-- Index for session-level queries
CREATE INDEX idx_activity_routes_session ON public.activity_routes(session_id);
CREATE INDEX idx_activity_pauses_session ON public.activity_pauses(session_id);
CREATE INDEX idx_activity_laps_session ON public.activity_laps(session_id);
CREATE INDEX idx_workout_sessions_modality ON public.workout_sessions(modality);
