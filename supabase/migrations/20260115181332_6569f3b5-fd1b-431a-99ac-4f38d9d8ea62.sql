-- =====================================================
-- MESSAGING SYSTEM SCHEMA
-- Unified messaging for users, gyms, coaches, events, support
-- =====================================================

-- 1. Conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  context_type TEXT NOT NULL CHECK (context_type IN ('gym', 'coach', 'event', 'support', 'direct')),
  context_id UUID, -- References gym_id, coach_id, event_id, or null for support
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  assigned_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Conversation participants
CREATE TABLE public.conversation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'staff', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- 3. Messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES auth.users(id), -- null for system messages
  body_text TEXT NOT NULL CHECK (char_length(body_text) <= 2000),
  is_system_message BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Message read receipts
CREATE TABLE public.message_read_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_conversations_context ON public.conversations(context_type, context_id);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_updated ON public.conversations(updated_at DESC);
CREATE INDEX idx_conversation_participants_user ON public.conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conv ON public.conversation_participants(conversation_id);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON public.messages(sender_user_id);
CREATE INDEX idx_message_read_receipts_user ON public.message_read_receipts(user_id);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - Conversations
-- =====================================================

-- Users can view conversations they participate in
CREATE POLICY "Users can view their conversations"
ON public.conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
  )
);

-- Users can create conversations (system will add participants)
CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Participants can update conversation status (if staff/admin)
CREATE POLICY "Staff can update conversations"
ON public.conversations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = id 
    AND cp.user_id = auth.uid() 
    AND cp.role IN ('staff', 'admin')
  )
);

-- =====================================================
-- RLS POLICIES - Conversation Participants
-- =====================================================

-- Users can view participants of their conversations
CREATE POLICY "Users can view conversation participants"
ON public.conversation_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
  )
);

-- Staff can add participants to conversations they're part of
CREATE POLICY "Staff can add participants"
ON public.conversation_participants FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    -- User adding themselves
    user_id = auth.uid() OR
    -- Staff/admin adding others
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_id 
      AND cp.user_id = auth.uid() 
      AND cp.role IN ('staff', 'admin')
    )
  )
);

-- =====================================================
-- RLS POLICIES - Messages
-- =====================================================

-- Users can view messages in their conversations
CREATE POLICY "Users can view conversation messages"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
  )
);

-- Participants can send messages to their conversations
CREATE POLICY "Participants can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  sender_user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES - Read Receipts
-- =====================================================

-- Users can view their own read receipts
CREATE POLICY "Users can view their read receipts"
ON public.message_read_receipts FOR SELECT
USING (user_id = auth.uid());

-- Users can create read receipts for messages they can see
CREATE POLICY "Users can create read receipts"
ON public.message_read_receipts FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_id AND cp.user_id = auth.uid()
  )
);

-- =====================================================
-- TRIGGER: Auto-update conversations.updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations 
  SET updated_at = now() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_timestamp();

-- =====================================================
-- ENABLE REALTIME for messages
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;