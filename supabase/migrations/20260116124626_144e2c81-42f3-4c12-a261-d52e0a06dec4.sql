-- Fix conversation creation failures by auto-adding staff participants server-side
-- so the client only needs to add itself (avoids RLS failures inserting other users)

CREATE OR REPLACE FUNCTION public.add_default_conversation_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_user_id uuid;
  v_coach_user_id uuid;
  v_organiser_user_id uuid;
BEGIN
  -- Only auto-add participants for context-scoped inboxes
  IF NEW.context_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.context_type = 'gym' THEN
    -- Gym owner
    SELECT owner_id INTO v_owner_user_id
    FROM public.gyms
    WHERE id = NEW.context_id;

    IF v_owner_user_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = NEW.id AND user_id = v_owner_user_id
    ) THEN
      INSERT INTO public.conversation_participants (conversation_id, user_id, role)
      VALUES (NEW.id, v_owner_user_id, 'staff');
    END IF;

    -- Gym staff
    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    SELECT NEW.id, gs.user_id, 'staff'
    FROM public.gym_staff gs
    WHERE gs.gym_id = NEW.context_id
      AND gs.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = NEW.id AND cp.user_id = gs.user_id
      );

  ELSIF NEW.context_type = 'coach' THEN
    -- Coach user
    SELECT user_id INTO v_coach_user_id
    FROM public.coaches
    WHERE id = NEW.context_id;

    IF v_coach_user_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = NEW.id AND user_id = v_coach_user_id
    ) THEN
      INSERT INTO public.conversation_participants (conversation_id, user_id, role)
      VALUES (NEW.id, v_coach_user_id, 'staff');
    END IF;

  ELSIF NEW.context_type = 'event' THEN
    -- Event organiser
    SELECT organiser_id INTO v_organiser_user_id
    FROM public.events
    WHERE id = NEW.context_id;

    IF v_organiser_user_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = NEW.id AND user_id = v_organiser_user_id
    ) THEN
      INSERT INTO public.conversation_participants (conversation_id, user_id, role)
      VALUES (NEW.id, v_organiser_user_id, 'staff');
    END IF;

    -- Event staff
    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    SELECT NEW.id, es.user_id, 'staff'
    FROM public.event_staff es
    WHERE es.event_id = NEW.context_id
      AND es.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = NEW.id AND cp.user_id = es.user_id
      );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS add_default_conversation_participants ON public.conversations;
CREATE TRIGGER add_default_conversation_participants
AFTER INSERT ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.add_default_conversation_participants();
