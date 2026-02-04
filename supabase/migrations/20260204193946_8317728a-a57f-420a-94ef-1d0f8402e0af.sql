
-- Fix the ensure_coach_client_role function to use global scope (coach scope doesn't exist)
CREATE OR REPLACE FUNCTION public.ensure_coach_client_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Add coach_client role with global scope
  INSERT INTO user_roles (user_id, role, scope_type, scope_id)
  VALUES (NEW.client_user_id, 'coach_client', 'global', NULL)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;
