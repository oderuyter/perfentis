
-- Email Templates
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'system',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email Template Versions
CREATE TABLE public.email_template_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  subject TEXT NOT NULL DEFAULT '',
  preheader TEXT DEFAULT '',
  html_content TEXT NOT NULL DEFAULT '',
  editor_mode TEXT NOT NULL DEFAULT 'html' CHECK (editor_mode IN ('wysiwyg', 'html')),
  design_json JSONB DEFAULT '[]'::jsonb,
  variables_used TEXT[] DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(template_id, version_number)
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_versions ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage email templates"
  ON public.email_templates FOR ALL
  USING (public.has_role(auth.uid(), 'admin', 'global'));

CREATE POLICY "Admins can manage email template versions"
  ON public.email_template_versions FOR ALL
  USING (public.has_role(auth.uid(), 'admin', 'global'));

-- Updated_at trigger
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed existing hardcoded templates
INSERT INTO public.email_templates (template_key, name, category, is_critical) VALUES
  ('gym_invite', 'Gym Invitation', 'invites', false),
  ('coach_invite', 'Coach Invitation', 'invites', false),
  ('event_invite', 'Event Invitation', 'invites', false),
  ('notification_coach', 'Coach Notification', 'notifications', false),
  ('notification_event', 'Event Notification', 'notifications', false),
  ('notification_gym', 'Gym Notification', 'notifications', false),
  ('notification_workout', 'Workout Notification', 'notifications', false),
  ('notification_system', 'System Notification', 'notifications', false),
  ('notification_message', 'Message Notification', 'notifications', false),
  ('test_email', 'Test Email', 'system', false),
  ('admin_invite', 'Admin User Invitation', 'system', false),
  ('password_reset', 'Password Reset', 'system', true);
