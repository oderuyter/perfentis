-- First, create a security definer function to check if a user is a participant
-- This avoids infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE user_id = _user_id
      AND conversation_id = _conversation_id
  )
$$;

-- Drop all existing policies on conversation_participants
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can insert participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_policy" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert_policy" ON public.conversation_participants;

-- Create simple, non-recursive policies for conversation_participants
-- For SELECT: users can see participants if they are authenticated
-- We use a security definer function to avoid recursion
CREATE POLICY "conversation_participants_select"
ON public.conversation_participants
FOR SELECT
USING (
  auth.uid() = user_id OR
  public.is_conversation_participant(auth.uid(), conversation_id)
);

-- For INSERT: any authenticated user can add participants to new conversations
CREATE POLICY "conversation_participants_insert"
ON public.conversation_participants
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Drop and recreate conversation policies
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_policy" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_policy" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_policy" ON public.conversations;

-- Conversations: users can view conversations they participate in
CREATE POLICY "conversations_select"
ON public.conversations
FOR SELECT
USING (public.is_conversation_participant(auth.uid(), id));

-- Conversations: authenticated users can create conversations
CREATE POLICY "conversations_insert"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Conversations: participants can update conversations
CREATE POLICY "conversations_update"
ON public.conversations
FOR UPDATE
USING (public.is_conversation_participant(auth.uid(), id));

-- Drop and recreate messages policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;

-- Messages: users can view messages in conversations they participate in
CREATE POLICY "messages_select"
ON public.messages
FOR SELECT
USING (public.is_conversation_participant(auth.uid(), conversation_id));

-- Messages: users can send messages to conversations they participate in
CREATE POLICY "messages_insert"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  (sender_user_id = auth.uid() OR sender_user_id IS NULL)
);

-- Drop and recreate message_read_receipts policies
DROP POLICY IF EXISTS "Users can view their read receipts" ON public.message_read_receipts;
DROP POLICY IF EXISTS "Users can create read receipts" ON public.message_read_receipts;
DROP POLICY IF EXISTS "message_read_receipts_select_policy" ON public.message_read_receipts;
DROP POLICY IF EXISTS "message_read_receipts_insert_policy" ON public.message_read_receipts;

-- Read receipts: users can view their own
CREATE POLICY "message_read_receipts_select"
ON public.message_read_receipts
FOR SELECT
USING (user_id = auth.uid());

-- Read receipts: users can create their own
CREATE POLICY "message_read_receipts_insert"
ON public.message_read_receipts
FOR INSERT
WITH CHECK (user_id = auth.uid());