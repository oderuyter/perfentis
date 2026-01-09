import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save, Shield, Bell, Database, Globe } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminSettings() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [signupsEnabled, setSignupsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const handleSave = () => {
    toast.success("Settings saved");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Settings</h1>
          <p className="text-muted-foreground">Configure global platform settings</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <CardTitle>General</CardTitle>
            </div>
            <CardDescription>Basic platform configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Platform Name</Label>
                <Input defaultValue="Flow Fitness" />
              </div>
              <div className="space-y-2">
                <Label>Support Email</Label>
                <Input defaultValue="support@flowfitness.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Platform URL</Label>
              <Input defaultValue="https://flowfitness.com" />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>Security and access controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Disable access for non-admin users
                </p>
              </div>
              <Switch
                checked={maintenanceMode}
                onCheckedChange={setMaintenanceMode}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>New User Signups</Label>
                <p className="text-sm text-muted-foreground">
                  Allow new users to register
                </p>
              </div>
              <Switch
                checked={signupsEnabled}
                onCheckedChange={setSignupsEnabled}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Session Timeout (minutes)</Label>
              <Input type="number" defaultValue="60" className="max-w-[200px]" />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Platform notification settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send email notifications to users
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Default Sender Name</Label>
              <Input defaultValue="Flow Fitness" className="max-w-[300px]" />
            </div>
          </CardContent>
        </Card>

        {/* Database Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle>Data Management</CardTitle>
            </div>
            <CardDescription>Database and storage configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Data Retention (days)</Label>
                <Input type="number" defaultValue="365" />
              </div>
              <div className="space-y-2">
                <Label>Audit Log Retention (days)</Label>
                <Input type="number" defaultValue="90" />
              </div>
            </div>
            <div className="pt-4">
              <Button variant="outline" className="text-destructive">
                Clear Cache
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
