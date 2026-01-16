import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { createNotification } from "@/lib/notifications";

export interface Message {
  id: string;
  conversation_id: string;
  sender_user_id: string | null;
  body_text: string;
  is_system_message: boolean;
  created_at: string;
  // Joined data
  sender?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!user || !conversationId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Get sender profiles
      const senderIds = new Set(
        data?.filter(m => m.sender_user_id).map(m => m.sender_user_id) || []
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", Array.from(senderIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const transformed: Message[] = (data || []).map(msg => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        sender_user_id: msg.sender_user_id,
        body_text: msg.body_text,
        is_system_message: msg.is_system_message,
        created_at: msg.created_at,
        sender: msg.sender_user_id ? {
          display_name: profileMap.get(msg.sender_user_id)?.display_name || null,
          avatar_url: profileMap.get(msg.sender_user_id)?.avatar_url || null,
        } : null,
      }));

      setMessages(transformed);

      // Mark messages as read
      if (data && data.length > 0) {
        const messageIds = data
          .filter(m => m.sender_user_id !== user.id)
          .map(m => m.id);

        if (messageIds.length > 0) {
          // Upsert read receipts
          const receipts = messageIds.map(id => ({
            message_id: id,
            user_id: user.id,
          }));

          await supabase
            .from("message_read_receipts")
            .upsert(receipts, { onConflict: 'message_id,user_id' });
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user || !conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, conversationId, fetchMessages]);

  const sendMessage = async (text: string) => {
    if (!user || !conversationId || !text.trim()) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_user_id: user.id,
          body_text: text.trim(),
          is_system_message: false,
        });

      if (error) throw error;

      // Notify other participants
      await notifyParticipants(conversationId, user.id, text.trim());

      await fetchMessages();
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  return {
    messages,
    isLoading,
    isSending,
    sendMessage,
    refetch: fetchMessages,
  };
}

// Helper to notify other participants
async function notifyParticipants(conversationId: string, senderId: string, messagePreview: string) {
  try {
    // Get conversation details
    const { data: conversation } = await supabase
      .from("conversations")
      .select("context_type, context_id")
      .eq("id", conversationId)
      .single();

    if (!conversation) return;

    // Get other participants
    const { data: participants } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .neq("user_id", senderId);

    if (!participants || participants.length === 0) return;

    // Get sender name
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", senderId)
      .single();

    const senderName = senderProfile?.display_name || 'Someone';

    // Get context name for notification
    let contextName = '';
    if (conversation.context_type === 'gym' && conversation.context_id) {
      const { data: gym } = await supabase
        .from("gyms")
        .select("name")
        .eq("id", conversation.context_id)
        .single();
      contextName = gym?.name || 'a gym';
    } else if (conversation.context_type === 'coach' && conversation.context_id) {
      const { data: coach } = await supabase
        .from("coaches")
        .select("display_name")
        .eq("id", conversation.context_id)
        .single();
      contextName = coach?.display_name || 'your coach';
    } else if (conversation.context_type === 'event' && conversation.context_id) {
      const { data: event } = await supabase
        .from("events")
        .select("title")
        .eq("id", conversation.context_id)
        .single();
      contextName = event?.title || 'an event';
    } else if (conversation.context_type === 'support') {
      contextName = 'Platform Support';
    }

    // Create notifications for each participant
    for (const participant of participants) {
      let title = 'New Message';
      let body = messagePreview.substring(0, 100);

      if (conversation.context_type === 'gym') {
        title = `Message from ${contextName}`;
      } else if (conversation.context_type === 'coach') {
        title = `Message from ${senderName}`;
      } else if (conversation.context_type === 'event') {
        title = `Message from ${contextName}`;
      } else if (conversation.context_type === 'support') {
        title = 'Support Reply';
      }

      await createNotification({
        userId: participant.user_id,
        title,
        body,
        type: 'system',
        entityType: 'conversation',
        entityId: conversationId,
        actionUrl: `/inbox?conversation=${conversationId}`,
      });
    }
  } catch (error) {
    console.error("Error notifying participants:", error);
  }
}

// Helper to create a new conversation
// Note: Staff/owner participants are automatically added by a database trigger
// based on context_type and context_id. We only need to add the current user.
export async function createConversation({
  contextType,
  contextId,
  subject,
  initialMessage,
}: {
  contextType: 'gym' | 'coach' | 'event' | 'support' | 'direct';
  contextId?: string;
  subject?: string;
  initialMessage?: string;
}) {
  // Ensure we have an authenticated user (RLS requires it)
  const {
    data: { user: currentUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!currentUser) throw new Error("Not authenticated");

  // Check for existing open conversation with this context (avoid duplicates)
  if (contextId) {
    // For user-initiated conversations, check if user already has an open one
    const { data: existingParticipation } = await supabase
      .from("conversation_participants")
      .select("conversation_id, conversations!inner(id, status, context_type, context_id)")
      .eq("user_id", currentUser.id);

    const existingConv = existingParticipation?.find(
      (p: any) => 
        p.conversations?.context_type === contextType &&
        p.conversations?.context_id === contextId &&
        p.conversations?.status === "open"
    );

    if (existingConv) {
      return existingConv.conversation_id;
    }
  }

  // Create new conversation
  // The database trigger `add_default_conversation_participants` will automatically
  // add gym owner/staff, coach user, or event organiser/staff based on context
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .insert({
      context_type: contextType,
      context_id: contextId || null,
      subject: subject || null,
      status: "open",
    })
    .select("id")
    .single();

  if (convError) throw convError;

  // Add current user as a participant (only inserting ourselves - RLS allows this)
  const { error: selfPartError } = await supabase
    .from("conversation_participants")
    .insert({
      conversation_id: conversation.id,
      user_id: currentUser.id,
      role: "user",
    });

  if (selfPartError) {
    console.error("Error adding self as participant:", selfPartError);
    // Don't throw - the trigger may have already added us or we might still proceed
  }

  // Send initial message if provided
  if (initialMessage && initialMessage.trim()) {
    const { error: initialError } = await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender_user_id: currentUser.id,
      body_text: initialMessage.trim(),
      is_system_message: false,
    });

    if (initialError) {
      console.error("Error sending initial message:", initialError);
      throw initialError;
    }
  }

  // Add system message to mark conversation start
  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    sender_user_id: null,
    body_text: "Conversation started",
    is_system_message: true,
  });

  return conversation.id;
}
