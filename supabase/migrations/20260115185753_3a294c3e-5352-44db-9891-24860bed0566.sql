-- Fix linter warnings we can address in migrations

-- 1) Ensure trigger function has a fixed search_path
CREATE OR REPLACE FUNCTION public.update_coach_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2) Remove overly-permissive insert policy on user_notifications
-- Inserts should go through the SECURITY DEFINER function public.create_notification.
DROP POLICY IF EXISTS "System can insert notifications" ON public.user_notifications;