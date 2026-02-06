-- Fix 1: email_delivery_events - restrict INSERT to admin only
-- Edge functions use service_role which bypasses RLS, so this is safe
DROP POLICY IF EXISTS "System can insert delivery events" ON public.email_delivery_events;
CREATE POLICY "Admins can insert delivery events"
  ON public.email_delivery_events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin', 'global'));

-- Fix 2: email_logs - restrict INSERT to admin only  
-- Edge functions use service_role which bypasses RLS, so this is safe
DROP POLICY IF EXISTS "Admin can insert email logs" ON public.email_logs;
CREATE POLICY "Admins can insert email logs"
  ON public.email_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin', 'global'));

-- Fix 3: message_email_throttle - restrict to own records
-- The can_send_message_email function is SECURITY DEFINER so it bypasses RLS
DROP POLICY IF EXISTS "System can manage throttle" ON public.message_email_throttle;
CREATE POLICY "Users can manage own throttle records"
  ON public.message_email_throttle
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);