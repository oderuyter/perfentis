-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.coach_invitations;

-- Create a more restrictive policy that requires token validation
-- Users can only view an invitation if they provide the correct token via RPC or if they are the coach
CREATE POLICY "Users can view invitation with valid token" 
ON public.coach_invitations 
FOR SELECT 
USING (
  -- Coach who created the invitation can see it
  EXISTS (
    SELECT 1 FROM coaches 
    WHERE coaches.id = coach_invitations.coach_id 
    AND coaches.user_id = auth.uid()
  )
  OR
  -- Authenticated user whose email matches the invitation (for accepting)
  (
    auth.uid() IS NOT NULL 
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status = 'pending'
    AND expires_at > now()
  )
);