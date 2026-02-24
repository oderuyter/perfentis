-- Allow public read of displays by token (for unauthenticated display screens)
CREATE POLICY "Anyone can read active displays by token"
ON public.displays
FOR SELECT
USING (is_active = true);

-- Allow public read of display_sessions for display screens
CREATE POLICY "Anyone can read display sessions"
ON public.display_sessions
FOR SELECT
USING (true);

-- Allow public read of gyms for display owner name
-- (gyms likely already has a public read policy, but ensure it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polrelid = 'public.gyms'::regclass AND polname = 'Anyone can view active gyms'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view active gyms" ON public.gyms FOR SELECT USING (status = ''active'')';
  END IF;
END $$;
