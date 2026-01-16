-- Fix: Protect admin_notes from being visible to regular users
-- and prevent non-admins from modifying it

-- Add policy for admins to access ALL profile data including admin_notes
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin', 'global'));

-- Add policy for admins to update any profile (including admin_notes and status)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin', 'global'));

-- Create a trigger to prevent non-admins from modifying admin_notes
CREATE OR REPLACE FUNCTION public.prevent_user_admin_notes_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If the user is NOT an admin, prevent admin_notes from being changed
  IF NOT public.has_role(auth.uid(), 'admin', 'global') THEN
    NEW.admin_notes := OLD.admin_notes;
    -- Also prevent users from modifying their own status
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_user_admin_notes_update ON public.profiles;
CREATE TRIGGER prevent_user_admin_notes_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_admin_notes_update();

-- Create a secure view for user profile access that excludes admin_notes
-- This allows client code to use this view instead of direct table access
CREATE OR REPLACE VIEW public.user_profiles_secure AS
SELECT 
  id,
  user_id,
  display_name,
  avatar_url,
  created_at,
  updated_at,
  date_of_birth,
  resting_hr,
  max_hr,
  training_goal,
  units,
  first_name,
  last_name,
  telephone,
  instagram_handle,
  tiktok_handle,
  youtube_handle,
  twitter_handle,
  website_url,
  address_line1,
  address_line2,
  address_city,
  address_postcode,
  address_country,
  work_company,
  work_address_line1,
  work_address_line2,
  work_address_city,
  work_address_postcode,
  work_address_country,
  status,
  last_active_at,
  theme_mode,
  accent_color,
  hr_zones_mode,
  hr_zone1_max,
  hr_zone2_max,
  hr_zone3_max,
  hr_zone4_max,
  hr_zone5_max,
  phone,
  privacy_analytics,
  privacy_insights
  -- admin_notes is intentionally excluded for security
FROM public.profiles
WHERE auth.uid() = user_id;

-- Grant access to authenticated users on the view
GRANT SELECT ON public.user_profiles_secure TO authenticated;