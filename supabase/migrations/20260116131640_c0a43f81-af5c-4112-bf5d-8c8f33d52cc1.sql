-- Fix: Change the view from SECURITY DEFINER to SECURITY INVOKER
-- SECURITY INVOKER ensures the view uses the permissions of the querying user
-- which is what we want for RLS to work correctly

-- Drop and recreate the view with SECURITY INVOKER
DROP VIEW IF EXISTS public.user_profiles_secure;

CREATE VIEW public.user_profiles_secure 
WITH (security_invoker = true) AS
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