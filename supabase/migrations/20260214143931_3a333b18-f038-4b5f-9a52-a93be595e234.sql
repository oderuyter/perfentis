
-- Rate limiting table for edge functions
CREATE TABLE IF NOT EXISTS public.edge_function_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  actor_key TEXT NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE (function_name, actor_key, window_start)
);

-- Index for fast lookups
CREATE INDEX idx_rate_limits_lookup 
  ON public.edge_function_rate_limits (function_name, actor_key, window_start);

-- Auto-cleanup old entries (older than 2 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.edge_function_rate_limits
  WHERE window_start < now() - INTERVAL '2 days';
$$;

-- RLS: only service role can access this table
ALTER TABLE public.edge_function_rate_limits ENABLE ROW LEVEL SECURITY;

-- No user-facing policies; only service_role key bypasses RLS
