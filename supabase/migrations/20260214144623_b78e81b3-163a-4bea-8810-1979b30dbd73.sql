
-- SMTP configuration table (admin-managed)
CREATE TABLE public.smtp_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host TEXT NOT NULL DEFAULT '',
  port INTEGER NOT NULL DEFAULT 587,
  secure BOOLEAN NOT NULL DEFAULT false,
  username TEXT NOT NULL DEFAULT '',
  encrypted_password TEXT NOT NULL DEFAULT '',
  password_iv TEXT NOT NULL DEFAULT '',
  from_name TEXT NOT NULL DEFAULT 'Flow Fitness',
  from_email TEXT NOT NULL DEFAULT '',
  reply_to TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Only allow a single row (singleton pattern)
CREATE UNIQUE INDEX smtp_config_singleton ON public.smtp_config ((true));

-- Enable RLS
ALTER TABLE public.smtp_config ENABLE ROW LEVEL SECURITY;

-- Only admins can read
CREATE POLICY "Admins can read SMTP config"
ON public.smtp_config FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin', 'global'));

-- Only admins can insert
CREATE POLICY "Admins can insert SMTP config"
ON public.smtp_config FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin', 'global'));

-- Only admins can update
CREATE POLICY "Admins can update SMTP config"
ON public.smtp_config FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin', 'global'));

-- Trigger for updated_at
CREATE TRIGGER update_smtp_config_updated_at
BEFORE UPDATE ON public.smtp_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
