-- Fix RLS policies that incorrectly reference auth.users (causes: permission denied for table users)

-- 1) event_team_members: allow access by user_id OR by matching JWT email (for invited-but-not-linked cases)
DROP POLICY IF EXISTS "Members can view own membership" ON public.event_team_members;
CREATE POLICY "Members can view own membership"
ON public.event_team_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    auth.uid() IS NOT NULL
    AND email IS NOT NULL
    AND email = (auth.jwt() ->> 'email')
  )
);

-- 2) coach_invitations: replace auth.users email lookup with JWT email
DROP POLICY IF EXISTS "Users can view invitation with valid token" ON public.coach_invitations;
CREATE POLICY "Users can view invitation with valid token"
ON public.coach_invitations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.coaches
    WHERE public.coaches.id = coach_invitations.coach_id
      AND public.coaches.user_id = auth.uid()
  )
  OR (
    auth.uid() IS NOT NULL
    AND email = (auth.jwt() ->> 'email')
    AND status = 'pending'
    AND expires_at > now()
  )
);
