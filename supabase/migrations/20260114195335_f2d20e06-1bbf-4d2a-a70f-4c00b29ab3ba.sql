-- Extend profiles table with contact fields
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS telephone TEXT,
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_handle TEXT,
  ADD COLUMN IF NOT EXISTS youtube_handle TEXT,
  ADD COLUMN IF NOT EXISTS twitter_handle TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS address_country TEXT,
  ADD COLUMN IF NOT EXISTS work_company TEXT,
  ADD COLUMN IF NOT EXISTS work_address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS work_address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS work_address_city TEXT,
  ADD COLUMN IF NOT EXISTS work_address_postcode TEXT,
  ADD COLUMN IF NOT EXISTS work_address_country TEXT,
  ADD COLUMN IF NOT EXISTS training_goal TEXT DEFAULT 'general_fitness',
  ADD COLUMN IF NOT EXISTS units TEXT DEFAULT 'metric',
  ADD COLUMN IF NOT EXISTS hr_zones_mode TEXT DEFAULT 'automatic',
  ADD COLUMN IF NOT EXISTS hr_zone1_max INTEGER,
  ADD COLUMN IF NOT EXISTS hr_zone2_max INTEGER,
  ADD COLUMN IF NOT EXISTS hr_zone3_max INTEGER,
  ADD COLUMN IF NOT EXISTS hr_zone4_max INTEGER,
  ADD COLUMN IF NOT EXISTS hr_zone5_max INTEGER,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS privacy_analytics BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS privacy_insights BOOLEAN DEFAULT true;

-- Create user notifications table
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  entity_type TEXT,
  entity_id TEXT,
  action_url TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  workout_reminders BOOLEAN DEFAULT true,
  habit_reminders BOOLEAN DEFAULT true,
  coach_messages BOOLEAN DEFAULT true,
  event_updates BOOLEAN DEFAULT true,
  gym_updates BOOLEAN DEFAULT true,
  announcements BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_notifications
CREATE POLICY "Users can view their own notifications"
  ON public.user_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.user_notifications FOR INSERT
  WITH CHECK (true);

-- RLS policies for notification_preferences
CREATE POLICY "Users can view their own notification preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger for notification_preferences updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _title TEXT,
  _body TEXT,
  _type TEXT DEFAULT 'system',
  _entity_type TEXT DEFAULT NULL,
  _entity_id TEXT DEFAULT NULL,
  _action_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _notification_id UUID;
  _prefs notification_preferences%ROWTYPE;
BEGIN
  -- Get user's notification preferences
  SELECT * INTO _prefs FROM notification_preferences WHERE user_id = _user_id;
  
  -- Check if user wants this type of notification
  IF _prefs.id IS NOT NULL THEN
    IF _type = 'workout' AND NOT _prefs.workout_reminders THEN RETURN NULL; END IF;
    IF _type = 'habit' AND NOT _prefs.habit_reminders THEN RETURN NULL; END IF;
    IF _type = 'coach' AND NOT _prefs.coach_messages THEN RETURN NULL; END IF;
    IF _type = 'event' AND NOT _prefs.event_updates THEN RETURN NULL; END IF;
    IF _type = 'gym' AND NOT _prefs.gym_updates THEN RETURN NULL; END IF;
    IF _type = 'system' AND NOT _prefs.announcements THEN RETURN NULL; END IF;
  END IF;
  
  INSERT INTO user_notifications (user_id, title, body, type, entity_type, entity_id, action_url)
  VALUES (_user_id, _title, _body, _type, _entity_type, _entity_id, _action_url)
  RETURNING id INTO _notification_id;
  
  RETURN _notification_id;
END;
$$;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;