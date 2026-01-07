-- Fix the overly permissive check-in policy
DROP POLICY IF EXISTS "Gyms can insert checkins" ON public.membership_checkins;

-- Allow check-ins to be created by gym owners or the membership holder
CREATE POLICY "Authorized checkins" ON public.membership_checkins FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships m
    LEFT JOIN public.gyms g ON g.id = m.gym_id
    WHERE m.id = membership_checkins.membership_id
    AND (m.user_id = auth.uid() OR g.owner_id = auth.uid())
  )
);