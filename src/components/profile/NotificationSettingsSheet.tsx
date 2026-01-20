import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Bell, Dumbbell, MessageSquare, Trophy, Building2, Megaphone, 
  Mail, Smartphone, Info, ChevronDown, ChevronUp, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useNotifications, NotificationPreferences } from "@/hooks/useNotifications";
import { toast } from "sonner";

interface NotificationSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CategoryConfig {
  key: string;
  icon: React.ElementType;
  label: string;
  description: string;
  inAppKey: keyof NotificationPreferences;
  emailKey: string;
  subTypes?: { key: string; label: string }[];
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: "workout",
    icon: Dumbbell,
    label: "Workout",
    description: "Workout completions, PRs, streak milestones",
    inAppKey: "workout_reminders",
    emailKey: "email_workout",
    subTypes: [
      { key: "completed", label: "Workout completed" },
      { key: "pr", label: "PR achieved" },
      { key: "streak", label: "Streak milestones" },
    ],
  },
  {
    key: "coach",
    icon: MessageSquare,
    label: "Coaching",
    description: "Coach messages, plan updates, check-ins",
    inAppKey: "coach_messages",
    emailKey: "email_coach",
    subTypes: [
      { key: "message", label: "New coach message" },
      { key: "plan", label: "Plan assigned/updated" },
      { key: "checkin_due", label: "Check-in due" },
      { key: "feedback", label: "Coach feedback" },
    ],
  },
  {
    key: "event",
    icon: Trophy,
    label: "Events",
    description: "Registration, schedule, scores, results",
    inAppKey: "event_updates",
    emailKey: "email_event",
    subTypes: [
      { key: "registration", label: "Registration confirmed" },
      { key: "waitlist", label: "Waitlist updates" },
      { key: "workout_release", label: "Workout released" },
      { key: "schedule", label: "Schedule changes" },
      { key: "score", label: "Score updates" },
      { key: "reminder", label: "Event reminders" },
    ],
  },
  {
    key: "gym",
    icon: Building2,
    label: "Gym",
    description: "Membership, invitations, updates",
    inAppKey: "gym_updates",
    emailKey: "email_gym",
    subTypes: [
      { key: "invite", label: "Gym invitation" },
      { key: "membership", label: "Membership changes" },
      { key: "payment", label: "Payment reminders" },
    ],
  },
  {
    key: "system",
    icon: Megaphone,
    label: "System",
    description: "Announcements, account updates",
    inAppKey: "announcements",
    emailKey: "email_system",
    subTypes: [
      { key: "announcement", label: "Admin announcements" },
      { key: "account", label: "Account/security changes" },
    ],
  },
];

export function NotificationSettingsSheet({ isOpen, onClose }: NotificationSettingsSheetProps) {
  const { preferences, updatePreferences, isLoading } = useNotifications();
  const [localPrefs, setLocalPrefs] = useState<Record<string, any>>({});
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [throttleMinutes, setThrottleMinutes] = useState(15);

  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        // In-app toggles
        workout_reminders: preferences.workout_reminders,
        habit_reminders: preferences.habit_reminders,
        coach_messages: preferences.coach_messages,
        event_updates: preferences.event_updates,
        gym_updates: preferences.gym_updates,
        announcements: preferences.announcements,
        // Email toggles
        email_enabled: preferences.email_enabled,
        email_workout: (preferences as any).email_workout ?? false,
        email_coach: (preferences as any).email_coach ?? true,
        email_event: (preferences as any).email_event ?? true,
        email_gym: (preferences as any).email_gym ?? true,
        email_system: (preferences as any).email_system ?? true,
        email_messages: (preferences as any).email_messages ?? true,
      });
      setThrottleMinutes((preferences as any).message_email_throttle_minutes ?? 15);
    }
  }, [preferences]);

  const handleToggle = async (key: string, value: boolean) => {
    setLocalPrefs(prev => ({ ...prev, [key]: value }));
    try {
      await updatePreferences({ [key]: value } as Partial<NotificationPreferences>);
    } catch (error) {
      toast.error("Failed to update preference");
      setLocalPrefs(prev => ({ ...prev, [key]: !value }));
    }
  };

  const handleThrottleChange = async (minutes: number) => {
    setThrottleMinutes(minutes);
    try {
      await updatePreferences({ message_email_throttle_minutes: minutes } as any);
    } catch (error) {
      toast.error("Failed to update throttle setting");
    }
  };

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
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
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Notification Settings</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Explainer */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  In-app notifications will always appear in your inbox. Email is optional 
                  and can be enabled per category below.
                </p>
              </div>

              {/* Master Email Toggle */}
              <section className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl border">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">Email Notifications</div>
                      <div className="text-sm text-muted-foreground">
                        Receive updates via email
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={localPrefs.email_enabled || false}
                    onCheckedChange={(checked) => handleToggle("email_enabled", checked)}
                    disabled={isLoading}
                  />
                </div>
              </section>

              <Separator />

              {/* Categories */}
              <section className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground">
                  Notification Categories
                </div>

                <div className="space-y-2">
                  {CATEGORIES.map((category) => (
                    <Collapsible
                      key={category.key}
                      open={expandedCategories.includes(category.key)}
                      onOpenChange={() => toggleCategory(category.key)}
                    >
                      <div className="rounded-xl border overflow-hidden">
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <category.icon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{category.label}</div>
                              <div className="text-sm text-muted-foreground">
                                {category.description}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {/* Email toggle for category */}
                            {localPrefs.email_enabled && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <Switch
                                  checked={localPrefs[category.emailKey] || false}
                                  onCheckedChange={(checked) => handleToggle(category.emailKey, checked)}
                                  disabled={isLoading}
                                />
                              </div>
                            )}
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                {expandedCategories.includes(category.key) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>
                        
                        <CollapsibleContent>
                          <div className="px-4 pb-4 pt-0 space-y-2">
                            <Separator className="mb-3" />
                            <div className="text-xs text-muted-foreground mb-2">
                              Notification types in this category:
                            </div>
                            {category.subTypes?.map((subType) => (
                              <div
                                key={subType.key}
                                className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/30"
                              >
                                <span className="text-sm">{subType.label}</span>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Smartphone className="h-3 w-3" />
                                  {localPrefs.email_enabled && localPrefs[category.emailKey] && (
                                    <>
                                      <span>+</span>
                                      <Mail className="h-3 w-3" />
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              </section>

              {/* Message Throttle Setting */}
              {localPrefs.email_enabled && localPrefs.email_messages && (
                <>
                  <Separator />
                  <section className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">
                      Message Email Throttle
                    </div>
                    <div className="p-4 rounded-xl border space-y-3">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">Limit message emails</div>
                          <div className="text-xs text-muted-foreground">
                            Avoid multiple emails for rapid message exchanges
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Label htmlFor="throttle" className="text-sm whitespace-nowrap">
                          Max 1 email per conversation every
                        </Label>
                        <Input
                          id="throttle"
                          type="number"
                          min={5}
                          max={60}
                          value={throttleMinutes}
                          onChange={(e) => handleThrottleChange(parseInt(e.target.value) || 15)}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">minutes</span>
                      </div>
                    </div>
                  </section>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}