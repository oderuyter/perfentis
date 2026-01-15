-- Clean up recursive RLS policies for messaging tables

-- Helper: check participant (already exists, keep definition stable + secure)
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

-- Drop ALL known existing policies on messaging tables (some are recursive)
-- conversation_participants
DROP POLICY IF EXISTS "Staff can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view other participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view their participant records" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_policy" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert_policy" ON public.conversation_participants;

-- conversations
DROP POLICY IF EXISTS "Staff can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_policy" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_policy" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_policy" ON public.conversations;

-- messages
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can view conversation messages" ON public.messages;
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;

-- message_read_receipts
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.message_read_receipts;
DROP POLICY IF EXISTS "Users can view read receipts for their conversations" ON public.message_read_receipts;
DROP POLICY IF EXISTS "message_read_receipts_select" ON public.message_read_receipts;
DROP POLICY IF EXISTS "message_read_receipts_insert" ON public.message_read_receipts;
DROP POLICY IF EXISTS "message_read_receipts_select_policy" ON public.message_read_receipts;
DROP POLICY IF EXISTS "message_read_receipts_insert_policy" ON public.message_read_receipts;

-- Recreate NON-RECURSIVE policies

-- conversation_participants
CREATE POLICY "conversation_participants_select"
ON public.conversation_participants
FOR SELECT
USING (public.is_conversation_participant(auth.uid(), conversation_id));

-- Allow inserting your own participant row.
-- After you've inserted yourself, you may insert additional participants for that same conversation.
CREATE POLICY "conversation_participants_insert"
ON public.conversation_participants
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR public.is_conversation_participant(auth.uid(), conversation_id)
  )
);

-- conversations
CREATE POLICY "conversations_select"
ON public.conversations
FOR SELECT
USING (public.is_conversation_participant(auth.uid(), id));

CREATE POLICY "conversations_insert"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "conversations_update"
ON public.conversations
FOR UPDATE
USING (public.is_conversation_participant(auth.uid(), id));

-- messages
CREATE POLICY "messages_select"
ON public.messages
FOR SELECT
USING (public.is_conversation_participant(auth.uid(), conversation_id));

CREATE POLICY "messages_insert"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.is_conversation_participant(auth.uid(), conversation_id)
  AND (sender_user_id = auth.uid() OR sender_user_id IS NULL)
);

-- message_read_receipts
CREATE POLICY "message_read_receipts_select"
ON public.message_read_receipts
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "message_read_receipts_insert"
ON public.message_read_receipts
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND message_id IN (
    SELECT m.id
    FROM public.messages m
    WHERE public.is_conversation_participant(auth.uid(), m.conversation_id)
  )
);

-- Needed for UPSERT (upsert may run UPDATE when the row already exists)
CREATE POLICY "message_read_receipts_update"
ON public.message_read_receipts
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());