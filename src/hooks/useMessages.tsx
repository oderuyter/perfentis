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

      const profileMap = new Map(profiles?.map(p => [p.user_id, {
        user_id: p.user_id,
        // Use display_name, fall back to shortened user ID
        display_name: p.display_name || `User ${p.user_id.substring(0, 8)}`,
        avatar_url: p.avatar_url
      }]) || []);

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
      // First, check if conversation is closed and reopen it
      const { data: convData } = await supabase
        .from("conversations")
        .select("status")
        .eq("id", conversationId)
        .single();
      
      if (convData?.status === 'closed') {
        await supabase
          .from("conversations")
          .update({ status: 'open', updated_at: new Date().toISOString() })
          .eq("id", conversationId);
      }

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
      let notificationType: 'gym' | 'coach' | 'event' | 'system' = 'system';

      if (conversation.context_type === 'gym') {
        title = `Message from ${senderName}`;
        body = `${contextName}: ${messagePreview.substring(0, 80)}`;
        notificationType = 'gym';
      } else if (conversation.context_type === 'coach') {
        title = `Message from ${senderName}`;
        notificationType = 'coach';
      } else if (conversation.context_type === 'event') {
        title = `Message from ${senderName}`;
        body = `${contextName}: ${messagePreview.substring(0, 80)}`;
        notificationType = 'event';
      } else if (conversation.context_type === 'support') {
        title = 'Support Reply';
      }

      await createNotification({
        userId: participant.user_id,
        title,
        body,
        type: notificationType,
        entityType: 'conversation',
        entityId: conversationId,
        actionUrl: `/inbox?conversation=${conversationId}`,
      });
    }
  } catch (error) {
    console.error("Error notifying participants:", error);
  }
}

// Helper to create a new conversation using backend RPC
// This bypasses RLS issues by using a security definer function
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
}): Promise<string> {
  // Call the backend RPC function which handles:
  // - Authentication validation
  // - Deduplication of existing open conversations
  // - Creating the conversation
  // - Adding the current user as participant
  // - Triggering auto-add of staff/owner participants
  // - Inserting initial and system messages
  const { data, error } = await supabase.rpc('create_conversation_rpc', {
    p_context_type: contextType,
    p_context_id: contextId || null,
    p_subject: subject || null,
    p_initial_message: initialMessage || null,
  });

  if (error) {
    console.error("create_conversation_rpc error:", error);
    throw error;
  }

  if (!data) {
    throw new Error("No conversation ID returned from RPC");
  }

  return data as string;
}
