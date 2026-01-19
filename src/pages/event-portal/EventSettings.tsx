import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, CreditCard, Bell, Shield, Trash2, QrCode, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useOfflineCheckinQueue } from "@/hooks/useOfflineCheckinQueue";

interface ContextType {
  selectedEventId: string | null;
}

export default function EventSettings() {
  const { selectedEventId } = useOutletContext<ContextType>();
  const { user } = useAuth();
  const [enableCheckin, setEnableCheckin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { downloadEventForOffline, cachedEvent } = useOfflineCheckinQueue(selectedEventId);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!selectedEventId) return;
    
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("events")
          .select("enable_checkin")
          .eq("id", selectedEventId)
          .single();

        if (error) throw error;
        setEnableCheckin(data?.enable_checkin || false);
      } catch (error) {
        console.error("Error fetching event settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [selectedEventId]);

  const handleCheckinToggle = async (enabled: boolean) => {
    if (!selectedEventId || !user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({ enable_checkin: enabled })
        .eq("id", selectedEventId);

      if (error) throw error;
      setEnableCheckin(enabled);
      toast.success(enabled ? "Check-in enabled" : "Check-in disabled");

      // Log to audit
      await supabase.from("audit_logs").insert({
        action: enabled ? "checkin_enabled" : "checkin_disabled",
        category: "events",
        message: `Check-in ${enabled ? "enabled" : "disabled"} for event`,
        entity_type: "event",
        entity_id: selectedEventId,
        actor_id: user.id,
      });
    } catch (error) {
      console.error("Error updating check-in setting:", error);
      toast.error("Failed to update setting");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadOffline = async () => {
    setIsDownloading(true);
    const success = await downloadEventForOffline();
    setIsDownloading(false);
    
    if (success) {
      toast.success("Event downloaded for offline use");
    } else {
      toast.error("Failed to download event");
    }
  };

  if (!selectedEventId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Settings className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Event Selected</h2>
        <p className="text-muted-foreground">
          Select an event to manage settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure event settings and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Check-In
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Competitor Check-In</Label>
              <p className="text-sm text-muted-foreground">
                Generate QR passes for registered competitors
              </p>
            </div>
            <Switch 
              checked={enableCheckin} 
              onCheckedChange={handleCheckinToggle}
              disabled={isLoading || isSaving}
            />
          </div>
          
          {enableCheckin && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <Label>Offline Check-In</Label>
                <p className="text-sm text-muted-foreground">
                  Download event data for offline check-in
                  {cachedEvent && (
                    <span className="block text-xs mt-1">
                      Last downloaded: {new Date(cachedEvent.downloadedAt).toLocaleString()}
                    </span>
                  )}
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownloadOffline}
                disabled={isDownloading}
              >
                <Download className="h-4 w-4 mr-2" />
                {isDownloading ? "Downloading..." : "Download"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Payments</Label>
              <p className="text-sm text-muted-foreground">
                Accept payments for event registration
              </p>
            </div>
            <Switch disabled />
          </div>
          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            Payment integration coming soon. Currently using placeholder payments.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive emails for new registrations
              </p>
            </div>
            <Switch disabled />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Score Submissions</Label>
              <p className="text-sm text-muted-foreground">
                Notify when athletes submit scores
              </p>
            </div>
            <Switch disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Public Leaderboard</Label>
              <p className="text-sm text-muted-foreground">
                Allow anyone to view leaderboards
              </p>
            </div>
            <Switch defaultChecked disabled />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Show Athlete Names</Label>
              <p className="text-sm text-muted-foreground">
                Display full names on public leaderboards
              </p>
            </div>
            <Switch defaultChecked disabled />
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Delete Event</Label>
              <p className="text-sm text-muted-foreground">
                Permanently delete this event and all data
              </p>
            </div>
            <Button variant="destructive" disabled>
              Delete Event
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
