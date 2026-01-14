-- Fix the create_notification function search_path (already has it, but let's ensure)
DROP FUNCTION IF EXISTS public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

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
SET search_path = public
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