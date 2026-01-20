-- Create email_logs table for tracking all email sends
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  to_email TEXT NOT NULL,
  template_key TEXT NOT NULL,
  subject TEXT NOT NULL,
  context_type TEXT,
  context_id UUID,
  resend_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_code TEXT,
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  last_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  actor_user_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email_delivery_events for webhook data
CREATE TABLE public.email_delivery_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_log_id UUID NOT NULL REFERENCES public.email_logs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload_json JSONB,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add per-category email preferences columns to notification_preferences
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS email_workout BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_coach BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_event BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_gym BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_system BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_messages BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS message_email_throttle_minutes INTEGER DEFAULT 15;

-- Create indexes for email_logs
CREATE INDEX idx_email_logs_to_email ON public.email_logs(to_email);
CREATE INDEX idx_email_logs_template_key ON public.email_logs(template_key);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);
CREATE INDEX idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX idx_email_logs_resend_message_id ON public.email_logs(resend_message_id);
CREATE INDEX idx_email_logs_context ON public.email_logs(context_type, context_id);

-- Add email_status to gym_invitations for tracking
ALTER TABLE public.gym_invitations
ADD COLUMN IF NOT EXISTS email_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS email_error TEXT,
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS email_log_id UUID REFERENCES public.email_logs(id);

-- Add email_status to coach_invitations
ALTER TABLE public.coach_invitations
ADD COLUMN IF NOT EXISTS email_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS email_error TEXT,
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS email_log_id UUID REFERENCES public.email_logs(id);

-- Add email_status to event_invites
ALTER TABLE public.event_invites
ADD COLUMN IF NOT EXISTS email_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS email_error TEXT,
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS email_log_id UUID REFERENCES public.email_logs(id);

-- Create message_email_throttle table to track last email sent per conversation
CREATE TABLE public.message_email_throttle (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  last_email_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);

-- Enable RLS on email_logs (admin only)
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all email logs"
ON public.email_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin', 'global'));

CREATE POLICY "Admin can insert email logs"
ON public.email_logs
FOR INSERT
WITH CHECK (true);

-- Enable RLS on email_delivery_events
ALTER TABLE public.email_delivery_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all delivery events"
ON public.email_delivery_events
FOR SELECT
USING (public.has_role(auth.uid(), 'admin', 'global'));

CREATE POLICY "System can insert delivery events"
ON public.email_delivery_events
FOR INSERT
WITH CHECK (true);

-- Enable RLS on message_email_throttle
ALTER TABLE public.message_email_throttle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own throttle"
ON public.message_email_throttle
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can manage throttle"
ON public.message_email_throttle
FOR ALL
USING (true);

-- Create function to check if email should be sent based on user preferences
CREATE OR REPLACE FUNCTION public.should_send_notification_email(
  p_user_id UUID,
  p_notification_type TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs RECORD;
  v_should_send BOOLEAN := false;
BEGIN
  -- Get user preferences
  SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = p_user_id;
  
  -- If no preferences, return false (email disabled by default for most)
  IF v_prefs.id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check master email toggle first
  IF NOT COALESCE(v_prefs.email_enabled, false) THEN
    RETURN false;
  END IF;
  
  -- Check per-category preference
  CASE p_notification_type
    WHEN 'workout' THEN v_should_send := COALESCE(v_prefs.email_workout, false);
    WHEN 'coach' THEN v_should_send := COALESCE(v_prefs.email_coach, true);
    WHEN 'event' THEN v_should_send := COALESCE(v_prefs.email_event, true);
    WHEN 'gym' THEN v_should_send := COALESCE(v_prefs.email_gym, true);
    WHEN 'system' THEN v_should_send := COALESCE(v_prefs.email_system, true);
    WHEN 'messages' THEN v_should_send := COALESCE(v_prefs.email_messages, true);
    ELSE v_should_send := false;
  END CASE;
  
  RETURN v_should_send;
END;
$$;

-- Create function to check message throttle
CREATE OR REPLACE FUNCTION public.can_send_message_email(
  p_user_id UUID,
  p_conversation_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_email TIMESTAMP WITH TIME ZONE;
  v_throttle_minutes INTEGER;
BEGIN
  -- Get throttle setting (default 15 minutes)
  SELECT COALESCE(message_email_throttle_minutes, 15) INTO v_throttle_minutes
  FROM notification_preferences WHERE user_id = p_user_id;
  
  IF v_throttle_minutes IS NULL THEN
    v_throttle_minutes := 15;
  END IF;
  
  -- Check last email time
  SELECT last_email_at INTO v_last_email
  FROM message_email_throttle
  WHERE user_id = p_user_id AND conversation_id = p_conversation_id;
  
  IF v_last_email IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN v_last_email < (now() - (v_throttle_minutes || ' minutes')::interval);
END;
$$;