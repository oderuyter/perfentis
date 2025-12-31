import { motion } from "framer-motion";
import { 
  User, 
  Target, 
  Ruler, 
  Heart, 
  Smartphone, 
  Palette, 
  Bell, 
  Shield, 
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  Check
} from "lucide-react";
import { useTheme, accentColors } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface SettingRowProps {
  icon: React.ElementType;
  label: string;
  value?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

function SettingRow({ icon: Icon, label, value, onClick, children }: SettingRowProps) {
  const content = (
    <>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-accent-subtle flex items-center justify-center">
          <Icon className="h-4 w-4 text-accent-foreground" />
        </div>
        <span className="font-medium text-sm">{label}</span>
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
        className="w-full flex items-center justify-between py-3.5 active:bg-muted/50 transition-colors rounded-lg -mx-2 px-2"
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
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-6 pb-2">
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

export default function Profile() {
  const { mode, accent, setMode, setAccent } = useTheme();

  const cycleTheme = () => {
    const modes: ThemeMode[] = ["system", "light", "dark"];
    const currentIndex = modes.indexOf(mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setMode(modes[nextIndex]);
  };

  const ThemeIcon = themeModeIcons[mode];

  return (
    <div className="min-h-screen pt-safe px-4 pb-4">
      {/* Header */}
      <header className="pt-6 pb-4">
        <motion.h1 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight"
        >
          Profile
        </motion.h1>
      </header>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl p-4 shadow-card border border-border/50 mt-4"
      >
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-accent-subtle flex items-center justify-center">
            <User className="h-7 w-7 text-accent-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Alex Morgan</h2>
            <p className="text-sm text-muted-foreground">alex@example.com</p>
          </div>
        </div>
      </motion.div>

      {/* Settings List */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-2"
      >
        <SectionHeader title="Profile" />
        <div className="space-y-0.5">
          <SettingRow icon={User} label="Personal Details" />
          <SettingRow icon={Target} label="Training Goals" value="Build Muscle" />
          <SettingRow icon={Ruler} label="Units" value="Metric" />
        </div>

        <SectionHeader title="Health & Devices" />
        <div className="space-y-0.5">
          <SettingRow icon={Smartphone} label="Integrations" />
          <SettingRow icon={Heart} label="Heart Rate Zones" />
        </div>

        <SectionHeader title="Appearance" />
        <div className="space-y-0.5">
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
                      ? "ring-2 ring-offset-2 ring-offset-background ring-foreground/20 scale-110" 
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
        <div className="space-y-0.5">
          <SettingRow icon={Bell} label="Notifications" />
          <SettingRow icon={Shield} label="Privacy & Data" />
        </div>
      </motion.div>
    </div>
  );
}
