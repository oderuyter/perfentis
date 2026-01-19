import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, subDays, isAfter } from "date-fns";
import { Bell, CheckCheck, Dumbbell, MessageSquare, Trophy, Building2, Megaphone, Zap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface UserNotification {
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

const TYPE_ICONS: Record<string, React.ElementType> = {
  workout: Dumbbell,
  habit: Zap,
  coach: MessageSquare,
  event: Trophy,
  gym: Building2,
  system: Megaphone,
};

const TYPE_COLORS: Record<string, string> = {
  workout: "bg-blue-500/10 text-blue-500",
  habit: "bg-yellow-500/10 text-yellow-500",
  coach: "bg-green-500/10 text-green-500",
  event: "bg-purple-500/10 text-purple-500",
  gym: "bg-orange-500/10 text-orange-500",
  system: "bg-primary/10 text-primary",
};

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const fourteenDaysAgo = subDays(new Date(), 14).toISOString();
      
      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", fourteenDaysAgo)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const typedData = (data || []).map((n: Record<string, unknown>) => ({
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
      
      setNotifications(typedData);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      await supabase
        .from("user_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      await supabase
        .from("user_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleNotificationClick = (notification: UserNotification) => {
    if (!notification.read_at) {
      markAsRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  // Group notifications by date
  const today = new Date();
  const todayNotifications = notifications.filter((n) =>
    isAfter(new Date(n.created_at), subDays(today, 1))
  );
  const thisWeekNotifications = notifications.filter(
    (n) =>
      isAfter(new Date(n.created_at), subDays(today, 7)) &&
      !isAfter(new Date(n.created_at), subDays(today, 1))
  );
  const olderNotifications = notifications.filter(
    (n) => !isAfter(new Date(n.created_at), subDays(today, 7))
  );

  const renderNotificationGroup = (title: string, items: UserNotification[]) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 px-4">{title}</h3>
        <div className="space-y-1">
          {items.map((notification, index) => {
            const Icon = TYPE_ICONS[notification.type] || Bell;
            const colorClass = TYPE_COLORS[notification.type] || TYPE_COLORS.system;
            const isUnread = !notification.read_at;

            return (
              <motion.button
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50 rounded-xl",
                  isUnread && "bg-primary/5"
                )}
              >
                <div
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                    colorClass
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn("font-medium text-sm", isUnread && "text-foreground")}>
                      {notification.title}
                    </span>
                    {isUnread && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                    {notification.body}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Notifications</h1>
              <p className="text-xs text-muted-foreground">Last 14 days</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="h-[calc(100vh-80px)]">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No notifications</h3>
              <p className="text-sm text-muted-foreground">
                You're all caught up! No notifications in the last 14 days.
              </p>
            </div>
          ) : (
            <>
              {renderNotificationGroup("Today", todayNotifications)}
              {renderNotificationGroup("This Week", thisWeekNotifications)}
              {renderNotificationGroup("Older", olderNotifications)}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
