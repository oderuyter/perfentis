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
  Sun
} from "lucide-react";
import { useState } from "react";

interface SettingRowProps {
  icon: React.ElementType;
  label: string;
  value?: string;
  onClick?: () => void;
}

function SettingRow({ icon: Icon, label, value, onClick }: SettingRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-3.5 active:bg-muted/50 transition-colors -mx-4 px-4"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span className="font-medium text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-sm text-muted-foreground">{value}</span>}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-6 pb-2">
      {title}
    </p>
  );
}

export default function Profile() {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

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
          <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center">
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
        <div className="divide-y divide-border/50">
          <SettingRow icon={User} label="Personal Details" />
          <SettingRow icon={Target} label="Training Goals" value="Build Muscle" />
          <SettingRow icon={Ruler} label="Units" value="Metric" />
        </div>

        <SectionHeader title="Health & Devices" />
        <div className="divide-y divide-border/50">
          <SettingRow icon={Smartphone} label="Integrations" />
          <SettingRow icon={Heart} label="Heart Rate Zones" />
        </div>

        <SectionHeader title="Appearance" />
        <div className="divide-y divide-border/50">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between py-3.5 active:bg-muted/50 transition-colors -mx-4 px-4"
          >
            <div className="flex items-center gap-3">
              {isDark ? (
                <Moon className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Sun className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="font-medium text-sm">Theme</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {isDark ? "Dark" : "Light"}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
          <SettingRow icon={Palette} label="Accent Color" value="Sage" />
        </div>

        <SectionHeader title="Preferences" />
        <div className="divide-y divide-border/50">
          <SettingRow icon={Bell} label="Notifications" />
          <SettingRow icon={Shield} label="Privacy & Data" />
        </div>
      </motion.div>
    </div>
  );
}
