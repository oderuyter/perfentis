-- Fix infinite recursion in event_teams RLS policies
-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Team members can view their team" ON event_teams;

-- Create a simpler policy that doesn't cause recursion
-- Allow anyone who is registered for an event to see teams in that event
CREATE POLICY "Event participants can view teams"
  ON event_teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_registrations
      WHERE event_registrations.event_id = event_teams.event_id
        AND event_registrations.user_id = auth.uid()
    )
    OR leader_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_teams.event_id
        AND events.organiser_id = auth.uid()
    )
  );