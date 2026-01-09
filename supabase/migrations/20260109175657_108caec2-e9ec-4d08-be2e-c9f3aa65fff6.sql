-- Create audit_logs table for tracking all admin actions and system events
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warn', 'error')),
  category TEXT NOT NULL CHECK (category IN ('admin', 'system', 'security', 'notification', 'billing', 'event', 'import', 'moderation')),
  action TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  entity_type TEXT,
  entity_id TEXT,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT
);

-- Create index for efficient queries
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_category ON public.audit_logs(category);
CREATE INDEX idx_audit_logs_severity ON public.audit_logs(severity);
CREATE INDEX idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin', 'global'));

-- System (via service role) and admins can insert logs
CREATE POLICY "Admins can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin', 'global'));

-- Create admin_notifications table for admin-sent notifications
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'in_app' CHECK (notification_type IN ('in_app', 'email', 'push')),
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'role', 'gym', 'event', 'coach_clients')),
  target_filter JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  recipients_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can manage notifications
CREATE POLICY "Admins can manage notifications"
  ON public.admin_notifications
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin', 'global'));

-- Create user_notifications table for delivering notifications to users
CREATE TABLE public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  notification_id UUID REFERENCES public.admin_notifications(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

-- Create index for user notifications
CREATE INDEX idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX idx_user_notifications_is_read ON public.user_notifications(user_id, is_read);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.user_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.user_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can insert notifications for any user
CREATE POLICY "Admins can insert notifications"
  ON public.user_notifications
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin', 'global'));

-- Create import_batches table for tracking CSV imports
CREATE TABLE public.import_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('users', 'gyms', 'events', 'coaches', 'coach_clients')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  imported_by UUID NOT NULL REFERENCES auth.users(id),
  total_rows INTEGER DEFAULT 0,
  created_count INTEGER DEFAULT 0,
  updated_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  file_name TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

-- Only admins can manage import batches
CREATE POLICY "Admins can manage import batches"
  ON public.import_batches
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin', 'global'));

-- Create social_posts table for social moderation
CREATE TABLE public.social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  flagged_at TIMESTAMP WITH TIME ZONE,
  flagged_reason TEXT,
  is_removed BOOLEAN NOT NULL DEFAULT false,
  removed_at TIMESTAMP WITH TIME ZONE,
  removed_by UUID REFERENCES auth.users(id),
  removal_reason TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0
);

-- Create indexes for social posts
CREATE INDEX idx_social_posts_user_id ON public.social_posts(user_id);
CREATE INDEX idx_social_posts_is_flagged ON public.social_posts(is_flagged) WHERE is_flagged = true;
CREATE INDEX idx_social_posts_created_at ON public.social_posts(created_at DESC);

-- Enable RLS
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Users can view non-removed posts
CREATE POLICY "Users can view public posts"
  ON public.social_posts
  FOR SELECT
  USING (NOT is_removed OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin', 'global'));

-- Users can create their own posts
CREATE POLICY "Users can create own posts"
  ON public.social_posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts, admins can update any
CREATE POLICY "Users can update own posts"
  ON public.social_posts
  FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin', 'global'));

-- Create groups table for UAC
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Only admins can manage groups
CREATE POLICY "Admins can manage groups"
  ON public.groups
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin', 'global'));

-- Create group_members table
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Only admins can manage group members
CREATE POLICY "Admins can manage group members"
  ON public.group_members
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin', 'global'));

-- Create group_roles table to assign roles to groups
CREATE TABLE public.group_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  scope_type role_scope NOT NULL DEFAULT 'global',
  scope_id UUID,
  UNIQUE(group_id, role, scope_type, scope_id)
);

-- Enable RLS
ALTER TABLE public.group_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can manage group roles
CREATE POLICY "Admins can manage group roles"
  ON public.group_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin', 'global'));

-- Add admin_notes column to profiles table if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_postcode TEXT;

-- Create function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action TEXT,
  _message TEXT,
  _category TEXT DEFAULT 'admin',
  _severity TEXT DEFAULT 'info',
  _entity_type TEXT DEFAULT NULL,
  _entity_id TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (action, message, category, severity, entity_type, entity_id, metadata, actor_id)
  VALUES (_action, _message, _category, _severity, _entity_type, _entity_id, _metadata, auth.uid())
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;