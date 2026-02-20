import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export type NotificationCategory = "workout" | "coach" | "event" | "gym" | "system" | "messages";

export interface NotificationPreferences {
  id: string;
  user_id: string;
  // Legacy fields (still supported)
  workout_reminders: boolean;
  habit_reminders: boolean;
  coach_messages: boolean;
  event_updates: boolean;
  gym_updates: boolean;
  announcements: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  // New category-based email preferences
  email_workout: boolean;
  email_coach: boolean;
  email_event: boolean;
  email_gym: boolean;
  email_system: boolean;
  email_messages: boolean;
  message_email_throttle_minutes: number;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // --- Notifications query ---
  const {
    data: notifications = [],
    isLoading: notificationsLoading,
    refetch: refetchNotifications,
  } = useQuery<UserNotification[]>({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []).map((n: Record<string, unknown>) => ({
        id: n.id as string,
        user_id: n.user_id as string,
        title: n.title as string,
        body: n.body as string,
        type: (n.type as string) || "system",
        entity_type: n.entity_type as string | null,
        entity_id: n.entity_id as string | null,
        action_url: n.action_url as string | null,
        read_at: n.read_at as string | null,
        created_at: n.created_at as string,
      })) as UserNotification[];
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
  });

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  // --- Preferences query ---
  const {
    data: preferences = null,
    isLoading: preferencesLoading,
  } = useQuery<NotificationPreferences | null>({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as NotificationPreferences;
      // Create defaults if none exist
      const { data: newPrefs, error: insertError } = await supabase
        .from("notification_preferences")
        .insert({ user_id: user.id })
        .select()
        .single();
      if (insertError) throw insertError;
      return newPrefs as NotificationPreferences;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = notificationsLoading || preferencesLoading;

  // --- Real-time subscription ---
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("user_notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.setQueryData<UserNotification[]>(
            ["notifications", user.id],
            (old = []) => [payload.new as UserNotification, ...old]
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // --- Mutations ---
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user) throw new Error("Not authenticated");
      const readAt = new Date().toISOString();
      const { error } = await supabase
        .from("user_notifications")
        .update({ read_at: readAt })
        .eq("id", notificationId)
        .eq("user_id", user.id);
      if (error) throw error;
      return { notificationId, readAt };
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ["notifications", user?.id] });
      const previous = queryClient.getQueryData<UserNotification[]>(["notifications", user?.id]);
      const readAt = new Date().toISOString();
      queryClient.setQueryData<UserNotification[]>(
        ["notifications", user?.id],
        (old = []) => old.map((n) => (n.id === notificationId ? { ...n, read_at: readAt } : n))
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(["notifications", user?.id], context?.previous);
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const readAt = new Date().toISOString();
      const { error } = await supabase
        .from("user_notifications")
        .update({ read_at: readAt })
        .eq("user_id", user.id)
        .is("read_at", null);
      if (error) throw error;
      return new Date().toISOString();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications", user?.id] });
      const previous = queryClient.getQueryData<UserNotification[]>(["notifications", user?.id]);
      const readAt = new Date().toISOString();
      queryClient.setQueryData<UserNotification[]>(
        ["notifications", user?.id],
        (old = []) => old.map((n) => ({ ...n, read_at: n.read_at || readAt }))
      );
      return { previous };
    },
    onError: (_err, _v, context) => {
      queryClient.setQueryData(["notifications", user?.id], context?.previous);
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("notification_preferences")
        .update(updates)
        .eq("user_id", user.id);
      if (error) throw error;
      return updates;
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["notification-preferences", user?.id] });
      const previous = queryClient.getQueryData<NotificationPreferences | null>([
        "notification-preferences",
        user?.id,
      ]);
      queryClient.setQueryData<NotificationPreferences | null>(
        ["notification-preferences", user?.id],
        (old) => (old ? { ...old, ...updates } : old)
      );
      return { previous };
    },
    onError: (_err, _updates, context) => {
      queryClient.setQueryData(["notification-preferences", user?.id], context?.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences", user?.id] });
    },
  });

  const markAsRead = useCallback(
    (notificationId: string) => markAsReadMutation.mutateAsync(notificationId),
    [markAsReadMutation]
  );
  const markAllAsRead = useCallback(
    () => markAllAsReadMutation.mutateAsync(),
    [markAllAsReadMutation]
  );
  const updatePreferences = useCallback(
    (updates: Partial<NotificationPreferences>) => updatePreferencesMutation.mutateAsync(updates),
    [updatePreferencesMutation]
  );

  return {
    notifications,
    preferences,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    refetch: refetchNotifications,
  };
}

// Utility function to create notifications from frontend
export async function createNotification(
  userId: string,
  title: string,
  body: string,
  type: string = "system",
  entityType?: string,
  entityId?: string,
  actionUrl?: string
) {
  try {
    const { data, error } = await supabase.rpc("create_notification", {
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
