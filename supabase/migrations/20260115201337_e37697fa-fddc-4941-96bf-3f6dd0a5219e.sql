-- ==========================================================
-- CRM SYSTEM DATABASE SCHEMA
-- Shared engine for Gym, Coach, and Event portals
-- ==========================================================

-- 1) CRM Pipeline Stages (configurable per context)
CREATE TABLE public.crm_pipeline_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  context_type TEXT NOT NULL CHECK (context_type IN ('gym', 'coach', 'event')),
  context_id UUID NOT NULL,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_won BOOLEAN DEFAULT false,
  is_lost BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (context_type, context_id, stage_name)
);

-- 2) CRM Leads
CREATE TABLE public.crm_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  context_type TEXT NOT NULL CHECK (context_type IN ('gym', 'coach', 'event')),
  context_id UUID NOT NULL,
  
  -- Core lead info
  lead_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- Linked user (nullable for non-registered leads)
  user_id UUID,
  is_registered_user BOOLEAN DEFAULT false,
  
  -- Status and stage
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost', 'archived')),
  stage_id UUID REFERENCES public.crm_pipeline_stages(id) ON DELETE SET NULL,
  
  -- Source tracking
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('messaging', 'form', 'manual', 'referral', 'import')),
  
  -- Assignment
  assigned_to_user_id UUID,
  
  -- Tags
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Contact snapshot from user profile
  contact_telephone TEXT,
  contact_instagram TEXT,
  contact_tiktok TEXT,
  contact_youtube TEXT,
  contact_twitter TEXT,
  contact_website TEXT,
  home_address_line1 TEXT,
  home_address_line2 TEXT,
  home_address_city TEXT,
  home_address_postcode TEXT,
  home_address_country TEXT,
  work_company TEXT,
  work_address_line1 TEXT,
  work_address_line2 TEXT,
  work_address_city TEXT,
  work_address_postcode TEXT,
  work_address_country TEXT,
  
  -- Conversation link
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  
  -- Tracking
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  is_incomplete BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for deduplication checks
CREATE INDEX idx_crm_leads_context_email ON public.crm_leads(context_type, context_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_crm_leads_context_phone ON public.crm_leads(context_type, context_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_crm_leads_context ON public.crm_leads(context_type, context_id);
CREATE INDEX idx_crm_leads_user ON public.crm_leads(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_crm_leads_conversation ON public.crm_leads(conversation_id) WHERE conversation_id IS NOT NULL;

-- 3) CRM Lead Notes (internal notes)
CREATE TABLE public.crm_lead_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_lead_notes_lead ON public.crm_lead_notes(lead_id);

-- 4) CRM Tasks / Activities
CREATE TABLE public.crm_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL DEFAULT 'follow-up' CHECK (task_type IN ('call', 'message', 'follow-up', 'meeting', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'cancelled')),
  assigned_to_user_id UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_tasks_lead ON public.crm_tasks(lead_id);
CREATE INDEX idx_crm_tasks_due ON public.crm_tasks(due_at) WHERE status = 'open';
CREATE INDEX idx_crm_tasks_assigned ON public.crm_tasks(assigned_to_user_id) WHERE status = 'open';

-- 5) CRM Lead Activity Log (timeline)
CREATE TABLE public.crm_lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  actor_user_id UUID,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_lead_activities_lead ON public.crm_lead_activities(lead_id);

-- 6) CRM Settings (per context)
CREATE TABLE public.crm_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  context_type TEXT NOT NULL CHECK (context_type IN ('gym', 'coach', 'event')),
  context_id UUID NOT NULL,
  auto_create_leads_from_messages BOOLEAN DEFAULT true,
  default_assignee_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (context_type, context_id)
);

-- ==========================================================
-- ENABLE ROW LEVEL SECURITY
-- ==========================================================

ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;

-- ==========================================================
-- RLS POLICIES - Context-scoped access
-- ==========================================================

-- Helper function to check if user has access to a context
CREATE OR REPLACE FUNCTION public.user_has_crm_access(p_context_type TEXT, p_context_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check based on context type
  IF p_context_type = 'gym' THEN
    -- User owns the gym OR is gym staff/manager
    RETURN EXISTS (
      SELECT 1 FROM public.gyms WHERE id = p_context_id AND owner_id = v_user_id
    ) OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = v_user_id 
        AND role IN ('gym_manager', 'gym_staff') 
        AND scope_id = p_context_id
    ) OR EXISTS (
      SELECT 1 FROM public.gym_staff WHERE gym_id = p_context_id AND user_id = v_user_id
    );
  ELSIF p_context_type = 'coach' THEN
    -- User is the coach
    RETURN EXISTS (
      SELECT 1 FROM public.coaches WHERE id = p_context_id AND user_id = v_user_id
    );
  ELSIF p_context_type = 'event' THEN
    -- User is the organiser OR event staff
    RETURN EXISTS (
      SELECT 1 FROM public.events WHERE id = p_context_id AND organiser_id = v_user_id
    ) OR EXISTS (
      SELECT 1 FROM public.event_staff 
      WHERE event_id = p_context_id AND user_id = v_user_id
    );
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Pipeline Stages policies
CREATE POLICY "Users can view pipeline stages for their contexts"
  ON public.crm_pipeline_stages FOR SELECT
  USING (public.user_has_crm_access(context_type, context_id));

CREATE POLICY "Users can manage pipeline stages for their contexts"
  ON public.crm_pipeline_stages FOR ALL
  USING (public.user_has_crm_access(context_type, context_id));

-- Leads policies
CREATE POLICY "Users can view leads for their contexts"
  ON public.crm_leads FOR SELECT
  USING (public.user_has_crm_access(context_type, context_id));

CREATE POLICY "Users can manage leads for their contexts"
  ON public.crm_leads FOR ALL
  USING (public.user_has_crm_access(context_type, context_id));

-- Lead Notes policies
CREATE POLICY "Users can view notes for leads they can access"
  ON public.crm_lead_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.crm_leads l 
      WHERE l.id = lead_id 
        AND public.user_has_crm_access(l.context_type, l.context_id)
    )
  );

CREATE POLICY "Users can create notes for leads they can access"
  ON public.crm_lead_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.crm_leads l 
      WHERE l.id = lead_id 
        AND public.user_has_crm_access(l.context_type, l.context_id)
    )
  );

CREATE POLICY "Users can delete their own notes"
  ON public.crm_lead_notes FOR DELETE
  USING (author_user_id = auth.uid());

-- Tasks policies
CREATE POLICY "Users can view tasks for leads they can access"
  ON public.crm_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.crm_leads l 
      WHERE l.id = lead_id 
        AND public.user_has_crm_access(l.context_type, l.context_id)
    )
  );

CREATE POLICY "Users can manage tasks for leads they can access"
  ON public.crm_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.crm_leads l 
      WHERE l.id = lead_id 
        AND public.user_has_crm_access(l.context_type, l.context_id)
    )
  );

-- Activities policies
CREATE POLICY "Users can view activities for leads they can access"
  ON public.crm_lead_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.crm_leads l 
      WHERE l.id = lead_id 
        AND public.user_has_crm_access(l.context_type, l.context_id)
    )
  );

CREATE POLICY "Users can create activities for leads they can access"
  ON public.crm_lead_activities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.crm_leads l 
      WHERE l.id = lead_id 
        AND public.user_has_crm_access(l.context_type, l.context_id)
    )
  );

-- Settings policies
CREATE POLICY "Users can view settings for their contexts"
  ON public.crm_settings FOR SELECT
  USING (public.user_has_crm_access(context_type, context_id));

CREATE POLICY "Users can manage settings for their contexts"
  ON public.crm_settings FOR ALL
  USING (public.user_has_crm_access(context_type, context_id));

-- ==========================================================
-- TRIGGERS FOR UPDATED_AT
-- ==========================================================

CREATE TRIGGER update_crm_pipeline_stages_updated_at
  BEFORE UPDATE ON public.crm_pipeline_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_leads_updated_at
  BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_tasks_updated_at
  BEFORE UPDATE ON public.crm_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_settings_updated_at
  BEFORE UPDATE ON public.crm_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================================
-- FUNCTION: Auto-create lead from conversation
-- ==========================================================

CREATE OR REPLACE FUNCTION public.crm_auto_create_lead_from_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_context_type TEXT;
  v_context_id UUID;
  v_sender_id UUID;
  v_sender_email TEXT;
  v_sender_name TEXT;
  v_sender_phone TEXT;
  v_existing_lead_id UUID;
  v_new_lead_id UUID;
  v_default_stage_id UUID;
  v_profile RECORD;
  v_settings RECORD;
BEGIN
  -- Only process first message in a conversation (not system messages)
  IF NEW.is_system_message = true THEN
    RETURN NEW;
  END IF;
  
  -- Get conversation context
  SELECT context_type, context_id INTO v_context_type, v_context_id
  FROM public.conversations
  WHERE id = NEW.conversation_id;
  
  -- Only auto-create for gym, coach, event contexts
  IF v_context_type NOT IN ('gym', 'coach', 'event') THEN
    RETURN NEW;
  END IF;
  
  -- Check if auto-create is enabled for this context
  SELECT * INTO v_settings
  FROM public.crm_settings
  WHERE context_type = v_context_type AND context_id = v_context_id;
  
  IF v_settings.id IS NOT NULL AND v_settings.auto_create_leads_from_messages = false THEN
    RETURN NEW;
  END IF;
  
  -- Check if lead already exists for this conversation
  SELECT id INTO v_existing_lead_id
  FROM public.crm_leads
  WHERE conversation_id = NEW.conversation_id
  LIMIT 1;
  
  IF v_existing_lead_id IS NOT NULL THEN
    -- Update last_contacted_at
    UPDATE public.crm_leads
    SET last_contacted_at = NEW.created_at,
        updated_at = now()
    WHERE id = v_existing_lead_id;
    RETURN NEW;
  END IF;
  
  v_sender_id := NEW.sender_user_id;
  
  -- Get sender info
  IF v_sender_id IS NOT NULL THEN
    -- Get user email from auth
    SELECT email INTO v_sender_email
    FROM auth.users
    WHERE id = v_sender_id;
    
    -- Get profile info
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE user_id = v_sender_id;
    
    v_sender_name := COALESCE(v_profile.display_name, v_profile.first_name || ' ' || v_profile.last_name, 'Unknown User');
    v_sender_phone := v_profile.telephone;
    
    -- Check if lead already exists for this user in this context
    SELECT id INTO v_existing_lead_id
    FROM public.crm_leads
    WHERE context_type = v_context_type
      AND context_id = v_context_id
      AND (
        (email = v_sender_email AND email IS NOT NULL)
        OR user_id = v_sender_id
      )
    LIMIT 1;
    
    IF v_existing_lead_id IS NOT NULL THEN
      -- Link conversation to existing lead
      UPDATE public.crm_leads
      SET conversation_id = NEW.conversation_id,
          last_contacted_at = NEW.created_at,
          updated_at = now()
      WHERE id = v_existing_lead_id;
      RETURN NEW;
    END IF;
  ELSE
    v_sender_name := 'Unknown Sender';
    v_sender_email := NULL;
  END IF;
  
  -- Get default stage for this context
  SELECT id INTO v_default_stage_id
  FROM public.crm_pipeline_stages
  WHERE context_type = v_context_type
    AND context_id = v_context_id
    AND is_default = true
  LIMIT 1;
  
  -- If no default stage, create one
  IF v_default_stage_id IS NULL THEN
    INSERT INTO public.crm_pipeline_stages (context_type, context_id, stage_name, stage_order, is_default)
    VALUES (v_context_type, v_context_id, 'New Enquiry', 0, true)
    RETURNING id INTO v_default_stage_id;
  END IF;
  
  -- Create new lead
  INSERT INTO public.crm_leads (
    context_type,
    context_id,
    lead_name,
    email,
    phone,
    user_id,
    is_registered_user,
    stage_id,
    source,
    conversation_id,
    last_contacted_at,
    is_incomplete,
    assigned_to_user_id,
    -- Contact snapshot from profile
    contact_telephone,
    contact_instagram,
    contact_tiktok,
    contact_youtube,
    contact_twitter,
    contact_website,
    home_address_line1,
    home_address_line2,
    home_address_city,
    home_address_postcode,
    home_address_country,
    work_company,
    work_address_line1,
    work_address_line2,
    work_address_city,
    work_address_postcode,
    work_address_country
  )
  VALUES (
    v_context_type,
    v_context_id,
    v_sender_name,
    v_sender_email,
    v_sender_phone,
    v_sender_id,
    v_sender_id IS NOT NULL,
    v_default_stage_id,
    'messaging',
    NEW.conversation_id,
    NEW.created_at,
    v_sender_email IS NULL,
    v_settings.default_assignee_user_id,
    -- Contact snapshot
    v_profile.telephone,
    v_profile.instagram_handle,
    v_profile.tiktok_handle,
    v_profile.youtube_handle,
    v_profile.twitter_handle,
    v_profile.website_url,
    v_profile.address_line1,
    v_profile.address_line2,
    v_profile.address_city,
    v_profile.address_postcode,
    v_profile.address_country,
    v_profile.work_company,
    v_profile.work_address_line1,
    v_profile.work_address_line2,
    v_profile.work_address_city,
    v_profile.work_address_postcode,
    v_profile.work_address_country
  )
  RETURNING id INTO v_new_lead_id;
  
  -- Log activity
  INSERT INTO public.crm_lead_activities (lead_id, activity_type, description, metadata)
  VALUES (v_new_lead_id, 'lead_created', 'Lead auto-created from messaging', 
    jsonb_build_object('source', 'messaging', 'conversation_id', NEW.conversation_id));
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-creating leads
CREATE TRIGGER trg_crm_auto_create_lead
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.crm_auto_create_lead_from_conversation();

-- ==========================================================
-- FUNCTION: Link user to existing leads on signup
-- ==========================================================

CREATE OR REPLACE FUNCTION public.crm_link_user_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  -- Get user email
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = NEW.user_id;
  
  IF v_email IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Update any leads with matching email
  UPDATE public.crm_leads
  SET user_id = NEW.user_id,
      is_registered_user = true,
      is_incomplete = false,
      updated_at = now()
  WHERE email = v_email
    AND user_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- Trigger on profile creation
CREATE TRIGGER trg_crm_link_user_on_profile_create
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.crm_link_user_on_signup();

-- ==========================================================
-- ENABLE REALTIME FOR CRM TABLES
-- ==========================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_lead_activities;