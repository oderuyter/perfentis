import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface UserNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  workout_reminders: boolean;
  habit_reminders: boolean;
  coach_messages: boolean;
  event_updates: boolean;
  gym_updates: boolean;
  announcements: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const typedData = (data || []).map((n: Record<string, unknown>) => ({
        id: n.id as string,
        user_id: n.user_id as string,
        title: n.title as string,
        body: n.body as string,
        type: (n.type as string) || 'system',
        entity_type: n.entity_type as string | null,
        entity_id: n.entity_id as string | null,
        action_url: n.action_url as string | null,
        read_at: n.read_at as string | null,
        created_at: n.created_at as string,
      })) as UserNotification[];
      setNotifications(typedData);
      setUnreadCount(typedData.filter(n => !n.read_at).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [user]);

  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setPreferences(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setPreferences(data as NotificationPreferences);
      } else {
        // Create default preferences
        const { data: newPrefs, error: insertError } = await supabase
          .from("notification_preferences")
          .insert({ user_id: user.id })
          .select()
          .single();
        
        if (!insertError && newPrefs) {
          setPreferences(newPrefs as NotificationPreferences);
        }
      }
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
  }, [fetchNotifications, fetchPreferences]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as UserNotification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!user || !preferences) return;

    try {
      const { error } = await supabase
        .from("notification_preferences")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;

      setPreferences(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
    }
  };

  return {
    notifications,
    preferences,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    refetch: fetchNotifications,
  };
}

// Utility function to create notifications from frontend
export async function createNotification(
  userId: string,
  title: string,
  body: string,
  type: string = 'system',
  entityType?: string,
  entityId?: string,
  actionUrl?: string
) {
  try {
    const { data, error } = await supabase.rpc('create_notification', {
      _user_id: userId,
      _title: title,
      _body: body,
      _type: type,
      _entity_type: entityType || null,
      _entity_id: entityId || null,
      _action_url: actionUrl || null,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}
