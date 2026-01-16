-- Create a secure RPC function to create conversations
-- This bypasses RLS issues by running as security definer while still validating auth

CREATE OR REPLACE FUNCTION public.create_conversation_rpc(
  p_context_type TEXT,
  p_context_id UUID,
  p_subject TEXT DEFAULT NULL,
  p_initial_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_conversation_id UUID;
  v_existing_conversation_id UUID;
BEGIN
  -- Validate caller is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'PGRST301';
  END IF;

  -- Check for existing open conversation for this user + context
  SELECT c.id INTO v_existing_conversation_id
  FROM public.conversations c
  JOIN public.conversation_participants cp ON cp.conversation_id = c.id
  WHERE c.context_type = p_context_type
    AND c.context_id = p_context_id
    AND c.status = 'open'
    AND cp.user_id = v_user_id
  LIMIT 1;

  IF v_existing_conversation_id IS NOT NULL THEN
    -- Return existing conversation
    RETURN v_existing_conversation_id;
  END IF;

  -- Create new conversation
  INSERT INTO public.conversations (context_type, context_id, subject, status)
  VALUES (p_context_type, p_context_id, p_subject, 'open')
  RETURNING id INTO v_conversation_id;

  -- Add the current user as a participant
  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  VALUES (v_conversation_id, v_user_id, 'user');

  -- The trigger add_default_conversation_participants will add staff/owners automatically

  -- Insert initial message if provided
  IF p_initial_message IS NOT NULL AND p_initial_message <> '' THEN
    INSERT INTO public.messages (conversation_id, sender_user_id, body, is_system_message)
    VALUES (v_conversation_id, v_user_id, p_initial_message, false);
  END IF;

  -- Insert system message to mark conversation start
  INSERT INTO public.messages (conversation_id, sender_user_id, body, is_system_message)
  VALUES (v_conversation_id, v_user_id, 'Conversation started', true);

  RETURN v_conversation_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_conversation_rpc(TEXT, UUID, TEXT, TEXT) TO authenticated;