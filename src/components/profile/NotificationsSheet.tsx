import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Dumbbell, Zap, MessageSquare, Trophy, Building2, Megaphone, Smartphone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";

interface NotificationsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationsSheet({ isOpen, onClose }: NotificationsSheetProps) {
  const { preferences, updatePreferences, isLoading } = useNotifications();
  const [localPrefs, setLocalPrefs] = useState({
    workout_reminders: true,
    habit_reminders: true,
    coach_messages: true,
    event_updates: true,
    gym_updates: true,
    announcements: true,
    push_enabled: true,
    email_enabled: false,
  });

  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        workout_reminders: preferences.workout_reminders,
        habit_reminders: preferences.habit_reminders,
        coach_messages: preferences.coach_messages,
        event_updates: preferences.event_updates,
        gym_updates: preferences.gym_updates,
        announcements: preferences.announcements,
        push_enabled: preferences.push_enabled,
        email_enabled: preferences.email_enabled,
      });
    }
  }, [preferences]);

  const handleToggle = async (key: keyof typeof localPrefs, value: boolean) => {
    setLocalPrefs(prev => ({ ...prev, [key]: value }));
    try {
      await updatePreferences({ [key]: value });
    } catch (error) {
      toast.error("Failed to update preference");
      setLocalPrefs(prev => ({ ...prev, [key]: !value }));
    }
  };

  const NOTIFICATION_TYPES = [
    { key: "workout_reminders" as const, icon: Dumbbell, label: "Workout Reminders", description: "Reminders for scheduled workouts" },
    { key: "habit_reminders" as const, icon: Zap, label: "Habit Reminders", description: "Daily habit check-in reminders" },
    { key: "coach_messages" as const, icon: MessageSquare, label: "Coach Messages", description: "Messages from your coach" },
    { key: "event_updates" as const, icon: Trophy, label: "Event Updates", description: "Competition and event notifications" },
    { key: "gym_updates" as const, icon: Building2, label: "Gym Membership", description: "Membership and gym notifications" },
    { key: "announcements" as const, icon: Megaphone, label: "Announcements", description: "General platform updates" },
  ];

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
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-hidden rounded-t-2xl bg-background flex flex-col pb-bottom-nav"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Notifications</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Delivery Channels */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Bell className="h-4 w-4" />
                  <span>Delivery Channels</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-4 rounded-xl border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Smartphone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">Push Notifications</div>
                        <div className="text-sm text-muted-foreground">
                          Instant alerts on your device
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={localPrefs.push_enabled}
                      onCheckedChange={(checked) => handleToggle("push_enabled", checked)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium">Email Notifications</div>
                        <div className="text-sm text-muted-foreground">
                          Receive updates via email
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={localPrefs.email_enabled}
                      onCheckedChange={(checked) => handleToggle("email_enabled", checked)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </section>

              <Separator />

              {/* Notification Types */}
              <section className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground">
                  Notification Types
                </div>

                <div className="space-y-2">
                  {NOTIFICATION_TYPES.map((type) => (
                    <div
                      key={type.key}
                      className="flex items-center justify-between p-4 rounded-xl border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <type.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-sm text-muted-foreground">
                            {type.description}
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={localPrefs[type.key]}
                        onCheckedChange={(checked) => handleToggle(type.key, checked)}
                        disabled={isLoading}
                      />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
