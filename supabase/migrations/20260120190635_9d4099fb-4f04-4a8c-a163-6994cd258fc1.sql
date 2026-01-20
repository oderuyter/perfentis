-- Fix the crm_link_user_on_signup trigger to get email from auth.users instead of profiles
CREATE OR REPLACE FUNCTION public.crm_link_user_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_email TEXT;
BEGIN
  -- Get email from auth.users using the user_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;