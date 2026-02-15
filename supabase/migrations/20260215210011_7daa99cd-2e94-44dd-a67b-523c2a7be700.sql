
-- Health integration connections (one row per user per provider)
CREATE TABLE public.integration_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('healthkit', 'healthconnect')),
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'limited')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  scopes_granted JSONB DEFAULT '[]'::jsonb,
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  sync_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own integration connections"
  ON public.integration_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Per-provider metric toggles
CREATE TABLE public.integration_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('healthkit', 'healthconnect')),
  enabled_metrics JSONB NOT NULL DEFAULT '{
    "steps": {"read": true},
    "calories": {"read": true, "write": false},
    "workouts": {"read": true, "write": true},
    "heart_rate": {"read": true},
    "sleep": {"read": true},
    "hrv_stress": {"read": true},
    "weight": {"read": true},
    "nutrition": {"read": false, "write": false}
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.integration_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own integration preferences"
  ON public.integration_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Priority order per metric category
CREATE TABLE public.integration_priority (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  metric_key TEXT NOT NULL CHECK (metric_key IN ('steps', 'calories', 'workouts', 'heart_rate', 'sleep', 'hrv_stress', 'weight', 'nutrition')),
  ordered_providers TEXT[] NOT NULL DEFAULT ARRAY['healthkit', 'healthconnect', 'manual'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, metric_key)
);

ALTER TABLE public.integration_priority ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own integration priority"
  ON public.integration_priority FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- External data records - normalized source event table for de-dupe
CREATE TABLE public.external_data_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('healthkit', 'healthconnect', 'manual')),
  data_type TEXT NOT NULL CHECK (data_type IN ('steps', 'sleep', 'hr_sample', 'workout', 'calories', 'nutrition', 'weight', 'hrv_stress')),
  source_id TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  fingerprint_hash TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  linked_session_id UUID REFERENCES public.workout_sessions(id) ON DELETE SET NULL,
  writeback_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.external_data_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own external data records"
  ON public.external_data_records FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all for analytics (aggregate only in UI)
CREATE POLICY "Admins read all external data records"
  ON public.external_data_records FOR SELECT
  USING (public.has_role(auth.uid(), 'admin', 'global'));

CREATE POLICY "Admins read all integration connections"
  ON public.integration_connections FOR SELECT
  USING (public.has_role(auth.uid(), 'admin', 'global'));

-- Indexes for performance
CREATE INDEX idx_external_data_user_type ON public.external_data_records(user_id, data_type, start_time);
CREATE INDEX idx_external_data_fingerprint ON public.external_data_records(user_id, fingerprint_hash) WHERE fingerprint_hash IS NOT NULL;
CREATE INDEX idx_external_data_source ON public.external_data_records(user_id, provider, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX idx_integration_connections_user ON public.integration_connections(user_id);

-- Triggers for updated_at
CREATE TRIGGER update_integration_connections_updated_at
  BEFORE UPDATE ON public.integration_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integration_preferences_updated_at
  BEFORE UPDATE ON public.integration_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integration_priority_updated_at
  BEFORE UPDATE ON public.integration_priority
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
