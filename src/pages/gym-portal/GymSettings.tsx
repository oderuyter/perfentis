import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Settings,
  Bell,
  Shield,
  CreditCard,
  Globe
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ContextType {
  selectedGymId: string | null;
}

export default function GymSettings() {
  const { selectedGymId } = useOutletContext<ContextType>();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    autoRenew: true,
    publicProfile: true,
    timezone: "America/New_York"
  });

  if (!selectedGymId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a gym.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-muted-foreground">Configure your gym preferences</p>
      </div>

      {/* Notifications */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Notifications</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive updates via email</p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(v) => setSettings({ ...settings, emailNotifications: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>SMS Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive alerts via SMS</p>
            </div>
            <Switch
              checked={settings.smsNotifications}
              onCheckedChange={(v) => setSettings({ ...settings, smsNotifications: v })}
            />
          </div>
        </div>
      </div>

      {/* Billing */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Billing</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Renew Memberships</Label>
              <p className="text-sm text-muted-foreground">Automatically renew active memberships</p>
            </div>
            <Switch
              checked={settings.autoRenew}
              onCheckedChange={(v) => setSettings({ ...settings, autoRenew: v })}
            />
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Privacy</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Public Profile</Label>
              <p className="text-sm text-muted-foreground">Show gym in public directory</p>
            </div>
            <Switch
              checked={settings.publicProfile}
              onCheckedChange={(v) => setSettings({ ...settings, publicProfile: v })}
            />
          </div>
        </div>
      </div>

      {/* Regional */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Regional</h3>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Timezone</Label>
            <Select
              value={settings.timezone}
              onValueChange={(v) => setSettings({ ...settings, timezone: v })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                <SelectItem value="Europe/London">London (GMT)</SelectItem>
                <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                <SelectItem value="Australia/Sydney">Sydney (AEST)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium">
          Save Settings
        </button>
      </div>
    </div>
  );
}
