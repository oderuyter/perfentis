-- Fix infinite recursion on display session reads by removing the self-referential participant policy
DROP POLICY IF EXISTS "Participants can view sessions" ON public.display_sessions;