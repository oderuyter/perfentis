import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Check, CheckCheck, Dumbbell, MessageSquare, Trophy, Building2, Megaphone, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, UserNotification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
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

function NotificationItem({ 
  notification, 
  onRead,
  onNavigate,
}: { 
  notification: UserNotification;
  onRead: (id: string) => void;
  onNavigate: (url: string) => void;
}) {
  const Icon = TYPE_ICONS[notification.type] || Bell;
  const colorClass = TYPE_COLORS[notification.type] || TYPE_COLORS.system;
  const isUnread = !notification.read_at;

  const handleClick = () => {
    if (isUnread) {
      onRead(notification.id);
    }
    if (notification.action_url) {
      onNavigate(notification.action_url);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50 rounded-xl",
        isUnread && "bg-primary/5"
      )}
    >
      <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", colorClass)}>
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
    </button>
  );
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const handleNavigate = (url: string) => {
    onClose();
    navigate(url);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 top-0 z-50 max-h-[80vh] overflow-hidden rounded-b-2xl bg-background"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    <CheckCheck className="h-4 w-4 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <ScrollArea className="max-h-[calc(80vh-80px)]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Bell className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-1">No notifications yet</h3>
                  <p className="text-sm text-muted-foreground">
                    You're all caught up!
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRead={markAsRead}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
