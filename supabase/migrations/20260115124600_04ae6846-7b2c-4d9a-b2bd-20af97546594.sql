-- Add missing columns to user_notifications for full notification functionality
ALTER TABLE public.user_notifications 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'system',
ADD COLUMN IF NOT EXISTS entity_type text,
ADD COLUMN IF NOT EXISTS entity_id text,
ADD COLUMN IF NOT EXISTS action_url text;

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON public.user_notifications(created_at DESC);

-- Update the create_notification function to support all notification types
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid, 
  _title text, 
  _body text, 
  _type text DEFAULT 'system', 
  _entity_type text DEFAULT NULL, 
  _entity_id text DEFAULT NULL, 
  _action_url text DEFAULT NULL
)
RETURNS uuid
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