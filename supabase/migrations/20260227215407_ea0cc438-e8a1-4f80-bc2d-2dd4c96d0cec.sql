-- Add QR-related fields to display_sessions
ALTER TABLE public.display_sessions 
  ADD COLUMN IF NOT EXISTS join_qr_payload TEXT,
  ADD COLUMN IF NOT EXISTS join_qr_generated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS join_code_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS allow_participant_join BOOLEAN NOT NULL DEFAULT true;

-- Create unique index on join_code for active sessions only
CREATE UNIQUE INDEX IF NOT EXISTS idx_display_sessions_active_join_code 
  ON public.display_sessions (join_code) 
  WHERE status IN ('idle', 'active') AND join_code IS NOT NULL;

-- Add rate limiting table for join code attempts
CREATE TABLE IF NOT EXISTS public.display_join_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_hint TEXT,
  attempted_code TEXT NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false
);

-- RLS for join attempts (admin only read, insert allowed for edge function)
ALTER TABLE public.display_join_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read join attempts"
  ON public.display_join_attempts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin', 'global'));
