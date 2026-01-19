-- Fix the crm_auto_create_lead_from_conversation function to not access auth.users directly
-- The auth.email() function should be used instead, or we skip email lookup for non-current users

CREATE OR REPLACE FUNCTION public.crm_auto_create_lead_from_conversation()
RETURNS trigger
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
  
  -- Get sender info from profiles (not auth.users)
  IF v_sender_id IS NOT NULL THEN
    -- Get profile info which should have email if synced
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE user_id = v_sender_id;
    
    -- Get email from profile's email field if available, otherwise leave null
    v_sender_email := v_profile.email;
    v_sender_name := COALESCE(v_profile.display_name, v_profile.first_name || ' ' || v_profile.last_name, 'Unknown User');
    v_sender_phone := v_profile.telephone;
    
    -- Check if lead already exists for this user in this context
    SELECT id INTO v_existing_lead_id
    FROM public.crm_leads
    WHERE context_type = v_context_type
      AND context_id = v_context_id
      AND user_id = v_sender_id
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

-- Also fix crm_link_user_on_signup to not access auth.users
CREATE OR REPLACE FUNCTION public.crm_link_user_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  -- Get email from the profile's email field if available
  v_email := NEW.email;
  
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