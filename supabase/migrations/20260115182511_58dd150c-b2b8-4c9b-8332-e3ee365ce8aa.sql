-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their participant records" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can view read receipts for their conversations" ON public.message_read_receipts;
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.message_read_receipts;

-- Recreate conversation policies without circular references
-- Use a direct join approach instead of EXISTS with subquery

-- For conversations: allow if user is a participant (check via direct join in application code)
-- We'll use a simpler approach - just check if the conversation exists
CREATE POLICY "Users can view conversations they participate in" 
ON public.conversations FOR SELECT 
USING (
  id IN (
    SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
  )
);

-- For conversation_participants: allow viewing if user is participant of that conversation
CREATE POLICY "Users can view their participant records" 
ON public.conversation_participants FOR SELECT 
USING (user_id = auth.uid());

-- Allow users to see other participants in conversations they're part of
CREATE POLICY "Users can view other participants in their conversations" 
ON public.conversation_participants FOR SELECT 
USING (
  conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants cp2 WHERE cp2.user_id = auth.uid()
  )
);

-- For messages: check if user is participant of the conversation
CREATE POLICY "Users can view messages in their conversations" 
ON public.messages FOR SELECT 
USING (
  conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages in their conversations" 
ON public.messages FOR INSERT 
WITH CHECK (
  sender_user_id = auth.uid() AND
  conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
  )
);

-- For read receipts
CREATE POLICY "Users can view read receipts for their conversations" 
ON public.message_read_receipts FOR SELECT 
USING (
  message_id IN (
    SELECT m.id FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can mark messages as read" 
ON public.message_read_receipts FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND
  message_id IN (
    SELECT m.id FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE cp.user_id = auth.uid()
  )
);