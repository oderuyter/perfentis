import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type ConversationContextType = 'gym' | 'coach' | 'event' | 'support' | 'direct';

export interface Conversation {
  id: string;
  context_type: ConversationContextType;
  context_id: string | null;
  subject: string | null;
  status: 'open' | 'closed';
  assigned_user_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  context_name?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
  participants?: Array<{
    user_id: string;
    role: string;
    display_name?: string;
    avatar_url?: string;
  }>;
}

interface UseConversationsOptions {
  contextType?: ConversationContextType;
  contextId?: string;
  status?: 'open' | 'closed' | 'all';
}

export function useConversations(options: UseConversationsOptions = {}) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadTotal, setUnreadTotal] = useState(0);

  const fetchConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    try {
      // Build query for conversations the user participates in
      let query = supabase
        .from("conversations")
        .select(`
          *,
          conversation_participants!inner(user_id, role),
          messages(id, body_text, created_at, sender_user_id, is_system_message)
        `)
        .eq("conversation_participants.user_id", user.id)
        .order("updated_at", { ascending: false });

      // Filter by context type if specified
      if (options.contextType) {
        query = query.eq("context_type", options.contextType);
      }

      // Filter by context ID if specified
      if (options.contextId) {
        query = query.eq("context_id", options.contextId);
      }

      // Filter by status if specified
      if (options.status && options.status !== 'all') {
        query = query.eq("status", options.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get read receipts for unread count
      const { data: readReceipts } = await supabase
        .from("message_read_receipts")
        .select("message_id")
        .eq("user_id", user.id);

      const readMessageIds = new Set(readReceipts?.map(r => r.message_id) || []);

      // Get context names (gyms, coaches, events)
      const contextIds = {
        gym: new Set<string>(),
        coach: new Set<string>(),
        event: new Set<string>(),
      };

      data?.forEach(conv => {
        if (conv.context_id) {
          if (conv.context_type === 'gym') contextIds.gym.add(conv.context_id);
          if (conv.context_type === 'coach') contextIds.coach.add(conv.context_id);
          if (conv.context_type === 'event') contextIds.event.add(conv.context_id);
        }
      });

      // Fetch context names
      const [gymsResult, coachesResult, eventsResult] = await Promise.all([
        contextIds.gym.size > 0 
          ? supabase.from("gyms").select("id, name").in("id", Array.from(contextIds.gym))
          : { data: [] },
        contextIds.coach.size > 0
          ? supabase.from("coaches").select("id, display_name").in("id", Array.from(contextIds.coach))
          : { data: [] },
        contextIds.event.size > 0
          ? supabase.from("events").select("id, title").in("id", Array.from(contextIds.event))
          : { data: [] },
      ]);

      const gymNames = new Map<string, string>();
      gymsResult.data?.forEach(g => gymNames.set(g.id, g.name));
      const coachNames = new Map<string, string>();
      coachesResult.data?.forEach(c => coachNames.set(c.id, c.display_name));
      const eventNames = new Map<string, string>();
      eventsResult.data?.forEach(e => eventNames.set(e.id, e.title));

      // Transform data
      const transformed: Conversation[] = (data || []).map(conv => {
        const messages = conv.messages || [];
        const sortedMessages = [...messages].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const lastMessage = sortedMessages[0];
        
        // Count unread messages (not sent by current user, not read)
        const unreadCount = messages.filter(
          m => m.sender_user_id !== user.id && !readMessageIds.has(m.id)
        ).length;

        let contextName = '';
        if (conv.context_type === 'gym' && conv.context_id) {
          contextName = gymNames.get(conv.context_id) || 'Unknown Gym';
        } else if (conv.context_type === 'coach' && conv.context_id) {
          contextName = coachNames.get(conv.context_id) || 'Unknown Coach';
        } else if (conv.context_type === 'event' && conv.context_id) {
          contextName = eventNames.get(conv.context_id) || 'Unknown Event';
        } else if (conv.context_type === 'support') {
          contextName = 'Platform Support';
        } else if (conv.context_type === 'direct') {
          contextName = 'Direct Message';
        }

        return {
          id: conv.id,
          context_type: conv.context_type as ConversationContextType,
          context_id: conv.context_id,
          subject: conv.subject,
          status: conv.status as 'open' | 'closed',
          assigned_user_id: conv.assigned_user_id,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          context_name: contextName,
          last_message: lastMessage?.body_text,
          last_message_at: lastMessage?.created_at,
          unread_count: unreadCount,
        };
      });

      setConversations(transformed);
      setUnreadTotal(transformed.reduce((sum, c) => sum + (c.unread_count || 0), 0));
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, options.contextType, options.contextId, options.status]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  return {
    conversations,
    isLoading,
    unreadTotal,
    refetch: fetchConversations,
  };
}

// Hook for portal-specific inbox (gyms, events with assignment support)
export function usePortalConversations(contextType: ConversationContextType, contextId: string | null) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user || !contextId) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          conversation_participants(user_id, role),
          messages(id, body_text, created_at, sender_user_id, is_system_message)
        `)
        .eq("context_type", contextType)
        .eq("context_id", contextId)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Get user profiles for participants
      const participantIds = new Set<string>();
      data?.forEach(conv => {
        conv.conversation_participants?.forEach((p: { user_id: string }) => {
          participantIds.add(p.user_id);
        });
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", Array.from(participantIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Transform data
      const transformed: Conversation[] = (data || []).map(conv => {
        const messages = conv.messages || [];
        const sortedMessages = [...messages].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const lastMessage = sortedMessages[0];

        const participants = conv.conversation_participants?.map((p: { user_id: string; role: string }) => ({
          user_id: p.user_id,
          role: p.role,
          display_name: profileMap.get(p.user_id)?.display_name,
          avatar_url: profileMap.get(p.user_id)?.avatar_url,
        }));

        // Find the user participant (not staff)
        const userParticipant = participants?.find((p: { role: string }) => p.role === 'user');

        return {
          id: conv.id,
          context_type: conv.context_type as ConversationContextType,
          context_id: conv.context_id,
          subject: conv.subject,
          status: conv.status as 'open' | 'closed',
          assigned_user_id: conv.assigned_user_id,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          context_name: userParticipant?.display_name || 'Unknown User',
          last_message: lastMessage?.body_text,
          last_message_at: lastMessage?.created_at,
          participants,
        };
      });

      setConversations(transformed);
    } catch (error) {
      console.error("Error fetching portal conversations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, contextType, contextId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Realtime subscription
  useEffect(() => {
    if (!user || !contextId) return;

    const channel = supabase
      .channel(`portal-conversations-${contextId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, contextId, fetchConversations]);

  const assignConversation = async (conversationId: string, staffUserId: string | null) => {
    const { error } = await supabase
      .from("conversations")
      .update({ assigned_user_id: staffUserId })
      .eq("id", conversationId);

    if (error) throw error;
    await fetchConversations();
  };

  const updateStatus = async (conversationId: string, status: 'open' | 'closed') => {
    const { error } = await supabase
      .from("conversations")
      .update({ status })
      .eq("id", conversationId);

    if (error) throw error;
    await fetchConversations();
  };

  return {
    conversations,
    isLoading,
    refetch: fetchConversations,
    assignConversation,
    updateStatus,
  };
}
