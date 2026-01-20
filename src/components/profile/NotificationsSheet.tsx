import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Dumbbell, MessageSquare, Trophy, Building2, Settings, Mail, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotifications, NotificationCategory } from "@/hooks/useNotifications";
import { toast } from "sonner";

interface NotificationsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CategoryConfig {
  key: NotificationCategory;
  label: string;
  description: string;
  icon: React.ElementType;
  emailField: keyof typeof defaultEmailPrefs;
}

const defaultEmailPrefs = {
  email_workout: true,
  email_coach: true,
  email_event: true,
  email_gym: true,
  email_system: true,
  email_messages: false,
};

const CATEGORIES: CategoryConfig[] = [
  {
    key: "workout",
    label: "Workouts",
    description: "PR achieved, streak milestones, workout completed",
    icon: Dumbbell,
    emailField: "email_workout",
  },
  {
    key: "coach",
    label: "Coaching",
    description: "Messages, plan updates, check-ins, feedback",
    icon: MessageSquare,
    emailField: "email_coach",
  },
  {
    key: "event",
    label: "Events",
    description: "Registration, schedule changes, scores, leaderboards",
    icon: Trophy,
    emailField: "email_event",
  },
  {
    key: "gym",
    label: "Gym",
    description: "Invitations, membership status, payments",
    icon: Building2,
    emailField: "email_gym",
  },
  {
    key: "system",
    label: "System",
    description: "Announcements, account changes, security",
    icon: Settings,
    emailField: "email_system",
  },
  {
    key: "messages",
    label: "Messages",
    description: "New message notifications (throttled)",
    icon: Mail,
    emailField: "email_messages",
  },
];

const THROTTLE_OPTIONS = [
  { value: 5, label: "5 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 240, label: "4 hours" },
];

export function NotificationsSheet({ isOpen, onClose }: NotificationsSheetProps) {
  const { preferences, updatePreferences, isLoading } = useNotifications();
  const [localPrefs, setLocalPrefs] = useState({
    ...defaultEmailPrefs,
    message_email_throttle_minutes: 15,
  });

  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        email_workout: preferences.email_workout ?? true,
        email_coach: preferences.email_coach ?? true,
        email_event: preferences.email_event ?? true,
        email_gym: preferences.email_gym ?? true,
        email_system: preferences.email_system ?? true,
        email_messages: preferences.email_messages ?? false,
        message_email_throttle_minutes: preferences.message_email_throttle_minutes ?? 15,
      });
    }
  }, [preferences]);

  const handleEmailToggle = async (field: keyof typeof defaultEmailPrefs, value: boolean) => {
    setLocalPrefs(prev => ({ ...prev, [field]: value }));
    try {
      await updatePreferences({ [field]: value });
    } catch (error) {
      toast.error("Failed to update preference");
      setLocalPrefs(prev => ({ ...prev, [field]: !value }));
    }
  };

  const handleThrottleChange = async (value: string) => {
    const minutes = parseInt(value, 10);
    setLocalPrefs(prev => ({ ...prev, message_email_throttle_minutes: minutes }));
    try {
      await updatePreferences({ message_email_throttle_minutes: minutes });
    } catch (error) {
      toast.error("Failed to update throttle setting");
    }
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
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-hidden rounded-t-2xl bg-background flex flex-col pb-bottom-nav"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Notification Settings</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Info Banner */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border">
                <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">In-app notifications are always on</p>
                  <p>Control which categories also send you emails. Invitations (gym, coach, event) always send emails regardless of these settings.</p>
                </div>
              </div>

              {/* Email Preferences by Category */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>Email Notifications by Category</span>
                </div>

                <div className="space-y-2">
                  {CATEGORIES.map((category) => (
                    <div
                      key={category.key}
                      className="flex items-center justify-between p-4 rounded-xl border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <category.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{category.label}</div>
                          <div className="text-sm text-muted-foreground">
                            {category.description}
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={localPrefs[category.emailField]}
                        onCheckedChange={(checked) => handleEmailToggle(category.emailField, checked)}
                        disabled={isLoading}
                      />
                    </div>
                  ))}
                </div>
              </section>

              <Separator />

              {/* Message Throttling */}
              <section className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground">
                  Message Email Throttling
                </div>

                <div className="p-4 rounded-xl border space-y-3">
                  <p className="text-sm text-muted-foreground">
                    To avoid email spam during active conversations, message notifications are throttled.
                  </p>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="throttle" className="shrink-0">Max 1 email per</Label>
                    <Select
                      value={localPrefs.message_email_throttle_minutes.toString()}
                      onValueChange={handleThrottleChange}
                      disabled={isLoading || !localPrefs.email_messages}
                    >
                      <SelectTrigger id="throttle" className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {THROTTLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value.toString()}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
