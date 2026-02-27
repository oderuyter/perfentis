
-- =============================================
-- API Console: Registry, References, Call Logs
-- =============================================

-- 1) api_registry — master list of all external APIs
CREATE TABLE public.api_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  provider TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'unknown',
  auth_type TEXT NOT NULL DEFAULT 'other',
  base_urls JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  pii_level TEXT NOT NULL DEFAULT 'none',
  rate_limit_notes TEXT,
  docs_url TEXT,
  required_env_vars JSONB DEFAULT '[]'::jsonb,
  env_var_presence JSONB DEFAULT '{}'::jsonb,
  owner_maintainer TEXT,
  environment TEXT DEFAULT 'prod',
  reference_count INTEGER NOT NULL DEFAULT 0,
  health_status TEXT NOT NULL DEFAULT 'unknown',
  last_scanned_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT api_registry_status_check CHECK (status IN ('active','planned','deprecated','unknown')),
  CONSTRAINT api_registry_auth_type_check CHECK (auth_type IN ('api_key','oauth','jwt','none','other')),
  CONSTRAINT api_registry_pii_level_check CHECK (pii_level IN ('none','low','high','health','payments')),
  CONSTRAINT api_registry_category_check CHECK (category IN ('email','payments','weather','maps','health','fitness_devices','messaging','storage','ai','analytics','auth','other')),
  CONSTRAINT api_registry_health_check CHECK (health_status IN ('ok','warning','down','unknown'))
);

ALTER TABLE public.api_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api_registry"
  ON public.api_registry FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin', 'global'))
  WITH CHECK (public.has_role(auth.uid(), 'admin', 'global'));

CREATE TRIGGER update_api_registry_updated_at
  BEFORE UPDATE ON public.api_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) api_registry_references — discovered code references
CREATE TABLE public.api_registry_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_registry_id UUID REFERENCES public.api_registry(id) ON DELETE SET NULL,
  discovery_status TEXT NOT NULL DEFAULT 'unreviewed',
  discovered_name TEXT NOT NULL,
  reference_type TEXT NOT NULL DEFAULT 'code',
  reference_key TEXT NOT NULL,
  reference_snippet TEXT,
  confidence_score REAL NOT NULL DEFAULT 0.5,
  scan_session_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ref_discovery_status_check CHECK (discovery_status IN ('unreviewed','linked','ignored')),
  CONSTRAINT ref_reference_type_check CHECK (reference_type IN ('code','env','sdk','endpoint','config'))
);

ALTER TABLE public.api_registry_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api_registry_references"
  ON public.api_registry_references FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin', 'global'))
  WITH CHECK (public.has_role(auth.uid(), 'admin', 'global'));

-- 3) api_call_logs — usage and error tracking
CREATE TABLE public.api_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_registry_id UUID REFERENCES public.api_registry(id) ON DELETE SET NULL,
  environment TEXT NOT NULL DEFAULT 'prod',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_method TEXT,
  request_host TEXT,
  request_path TEXT,
  status_code INTEGER,
  latency_ms INTEGER,
  error_type TEXT,
  correlation_id TEXT,
  user_id UUID,
  raw_meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api_call_logs"
  ON public.api_call_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin', 'global'))
  WITH CHECK (public.has_role(auth.uid(), 'admin', 'global'));

-- Index for log queries
CREATE INDEX idx_api_call_logs_registry_id ON public.api_call_logs(api_registry_id);
CREATE INDEX idx_api_call_logs_timestamp ON public.api_call_logs(timestamp DESC);
CREATE INDEX idx_api_call_logs_status ON public.api_call_logs(status_code);

-- 4) api_registry_changelog — tracks admin edits
CREATE TABLE public.api_registry_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_registry_id UUID REFERENCES public.api_registry(id) ON DELETE CASCADE,
  actor_user_id UUID,
  action_type TEXT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_registry_changelog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api_registry_changelog"
  ON public.api_registry_changelog FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin', 'global'))
  WITH CHECK (public.has_role(auth.uid(), 'admin', 'global'));

-- 5) api_governance_settings — admin toggle for prod blocking
CREATE TABLE public.api_governance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_unregistered_in_prod BOOLEAN NOT NULL DEFAULT false,
  auto_discover_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.api_governance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api_governance_settings"
  ON public.api_governance_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin', 'global'))
  WITH CHECK (public.has_role(auth.uid(), 'admin', 'global'));

-- Seed default governance settings
INSERT INTO public.api_governance_settings (block_unregistered_in_prod) VALUES (false);
