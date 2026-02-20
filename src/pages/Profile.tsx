import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { 
  User, 
  Target, 
  Ruler, 
  Heart, 
  Smartphone,
  Palette,
  Radio,
  Bell, 
  Shield, 
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  Check,
  LogOut,
  Camera,
  Loader2,
  Share2
} from "lucide-react";
import { useTheme, accentColors } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { PersonalDetailsSheet } from "@/components/profile/PersonalDetailsSheet";
import { TrainingGoalsSheet } from "@/components/profile/TrainingGoalsSheet";
import { UnitsSheet } from "@/components/profile/UnitsSheet";
import { IntegrationsSheet } from "@/components/profile/IntegrationsSheet";
import { HeartRateZonesSheet } from "@/components/profile/HeartRateZonesSheet";
import { HRDevicesSheet } from "@/components/profile/HRDevicesSheet";
import { NotificationsSheet } from "@/components/profile/NotificationsSheet";
import { PrivacySheet } from "@/components/profile/PrivacySheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SettingRowProps {
  icon: React.ElementType;
  label: string;
  value?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  danger?: boolean;
}

function SettingRow({ icon: Icon, label, value, onClick, children, danger }: SettingRowProps) {
  const content = (
    <>
      <div className="flex items-center gap-3">
        <div className={cn(
          "h-9 w-9 rounded-xl flex items-center justify-center",
          danger ? "bg-destructive/15" : "bg-primary/12"
        )}>
          <Icon className={cn(
            "h-4 w-4",
            danger ? "text-destructive" : "text-primary"
          )} />
        </div>
        <span className={cn(
          "font-medium",
          danger && "text-destructive"
        )}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {children || (
          <>
            {value && <span className="text-sm text-muted-foreground">{value}</span>}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between py-3.5 active:bg-muted/30 transition-colors rounded-xl -mx-2 px-2"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between py-3.5 -mx-2 px-2">
      {content}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-6 pb-2">
      {title}
    </p>
  );
}

type ThemeMode = "system" | "light" | "dark";

const themeModeLabels: Record<ThemeMode, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

const themeModeIcons: Record<ThemeMode, React.ElementType> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

const trainingGoalLabels: Record<string, string> = {
  build_muscle: "Build Muscle",
  lose_weight: "Lose Weight",
  gain_strength: "Gain Strength",
  improve_endurance: "Improve Endurance",
  general_fitness: "General Fitness",
  sport_performance: "Sport Performance",
  flexibility: "Flexibility",
  rehabilitation: "Rehabilitation",
};

export default function Profile() {
  const { mode, accent, setMode, setAccent } = useTheme();
  const { user, signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { uploadAvatar, isUploading } = useAvatarUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sheet states
  const [personalDetailsOpen, setPersonalDetailsOpen] = useState(false);
  const [trainingGoalsOpen, setTrainingGoalsOpen] = useState(false);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [hrZonesOpen, setHrZonesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [hrDevicesOpen, setHrDevicesOpen] = useState(false);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);

  const cycleTheme = () => {
    const modes: ThemeMode[] = ["system", "light", "dark"];
    const currentIndex = modes.indexOf(mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setMode(modes[nextIndex]);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAvatar(file);
    }
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const ThemeIcon = themeModeIcons[mode];

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "User";
  const email = user?.email || "";
  const initials = displayName.slice(0, 2).toUpperCase();
  const trainingGoalValue = profile?.training_goal 
    ? trainingGoalLabels[profile.training_goal] || profile.training_goal 
    : "Not set";
  const unitsValue = profile?.units === "imperial" ? "Imperial" : "Metric";

  return (
    <div className="min-h-screen gradient-page pt-safe px-4 pb-28">
      {/* Hidden file input for avatar upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      
      {/* Ambient glow */}
      <div className="fixed inset-0 gradient-glow pointer-events-none" />
      
      {/* Header */}
      <header className="relative pt-14 pb-4">
        <motion.h1 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold tracking-tight"
        >
          Profile
        </motion.h1>
      </header>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-glass-accent p-5 mt-4"
      >
        <div className="flex items-center gap-4">
          <button 
            onClick={handleAvatarClick}
            disabled={isUploading}
            className="relative group"
          >
            <Avatar className="h-14 w-14 rounded-xl border-2 border-primary/20">
              <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
              <AvatarFallback className="rounded-xl bg-primary/15 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className={cn(
              "absolute inset-0 rounded-xl flex items-center justify-center transition-opacity",
              isUploading 
                ? "bg-black/50 opacity-100" 
                : "bg-black/40 opacity-0 group-hover:opacity-100"
            )}>
              {isUploading ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </div>
          </button>
          <div 
            className="flex-1 min-w-0 cursor-pointer" 
            onClick={() => setPersonalDetailsOpen(true)}
          >
            <h2 className="font-bold text-lg truncate text-foreground">{displayName}</h2>
            <p className="text-sm text-muted-foreground truncate">{email}</p>
          </div>
          <ChevronRight 
            className="h-5 w-5 text-muted-foreground cursor-pointer" 
            onClick={() => setPersonalDetailsOpen(true)}
          />
        </div>
      </motion.div>

      {/* Settings List */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative mt-2"
      >
        <SectionHeader title="Profile" />
        <div className="card-glass p-4 space-y-0.5">
          <SettingRow 
            icon={User} 
            label="Personal Details" 
            onClick={() => setPersonalDetailsOpen(true)} 
          />
          <SettingRow 
            icon={Target} 
            label="Training Goals" 
            value={trainingGoalValue}
            onClick={() => setTrainingGoalsOpen(true)} 
          />
          <SettingRow 
            icon={Ruler} 
            label="Units" 
            value={unitsValue}
            onClick={() => setUnitsOpen(true)} 
          />
        </div>

        <SectionHeader title="Health & Devices" />
        <div className="card-glass p-4 space-y-0.5">
          <SettingRow 
            icon={Radio} 
            label="HR Monitors" 
            onClick={() => setHrDevicesOpen(true)} 
          />
          <SettingRow 
            icon={Heart} 
            label="Heart Rate Zones" 
            onClick={() => setHrZonesOpen(true)} 
          />
          <SettingRow 
            icon={Smartphone} 
            label="Integrations" 
            onClick={() => setIntegrationsOpen(true)} 
          />
        </div>

        <SectionHeader title="Appearance" />
        <div className="card-glass p-4 space-y-0.5">
          <SettingRow
            icon={ThemeIcon}
            label="Theme"
            onClick={cycleTheme}
          >
            <span className="text-sm text-muted-foreground">{themeModeLabels[mode]}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </SettingRow>
          
          {/* Accent Color Picker */}
          <SettingRow icon={Palette} label="Accent Color">
            <div className="flex items-center gap-1.5">
              {accentColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setAccent(color.value)}
                  className={cn(
                    "h-7 w-7 rounded-full transition-all flex items-center justify-center",
                    accent === color.value 
                      ? "ring-2 ring-offset-2 ring-offset-background ring-primary/50 scale-110" 
                      : "hover:scale-105"
                  )}
                  style={{ backgroundColor: color.color }}
                  title={color.label}
                >
                  {accent === color.value && (
                    <Check className="h-3.5 w-3.5 text-white drop-shadow-sm" />
                  )}
                </button>
              ))}
            </div>
          </SettingRow>
        </div>

        <SectionHeader title="Preferences" />
        <div className="card-glass p-4 space-y-0.5">
          <SettingRow 
            icon={Bell} 
            label="Notifications" 
            onClick={() => setNotificationsOpen(true)} 
          />
          <SettingRow 
            icon={Shield} 
            label="Privacy & Data" 
            onClick={() => setPrivacyOpen(true)} 
          />
          <SettingRow icon={Share2} label="Share after workout">
            <Switch
              checked={!!profile?.social_share_after_workout}
              onCheckedChange={(checked) =>
                updateProfile({ social_share_after_workout: checked })
              }
            />
          </SettingRow>
        </div>

        <SectionHeader title="Account" />
        <div className="card-glass p-4 space-y-0.5">
          <SettingRow 
            icon={LogOut} 
            label="Sign Out" 
            onClick={() => setSignOutDialogOpen(true)}
            danger
          >
            <span></span>
          </SettingRow>
        </div>
      </motion.div>

      {/* Sheets */}
      <PersonalDetailsSheet 
        isOpen={personalDetailsOpen} 
        onClose={() => setPersonalDetailsOpen(false)} 
      />
      <TrainingGoalsSheet 
        isOpen={trainingGoalsOpen} 
        onClose={() => setTrainingGoalsOpen(false)} 
      />
      <UnitsSheet 
        isOpen={unitsOpen} 
        onClose={() => setUnitsOpen(false)} 
      />
      <IntegrationsSheet 
        isOpen={integrationsOpen} 
        onClose={() => setIntegrationsOpen(false)} 
      />
      <HeartRateZonesSheet 
        isOpen={hrZonesOpen} 
        onClose={() => setHrZonesOpen(false)} 
      />
      <NotificationsSheet 
        isOpen={notificationsOpen} 
        onClose={() => setNotificationsOpen(false)} 
      />
      <HRDevicesSheet
        isOpen={hrDevicesOpen}
        onClose={() => setHrDevicesOpen(false)}
      />
      <PrivacySheet
        isOpen={privacyOpen} 
        onClose={() => setPrivacyOpen(false)} 
      />

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out of your account and returned to the login screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
