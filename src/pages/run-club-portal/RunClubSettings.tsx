import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { 
  Loader2, 
  Save,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { RunClub, useRunClubManagement } from "@/hooks/useRunClubs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RunClubPortalContext {
  selectedClubId: string | null;
  selectedClub: RunClub | null;
  refetchClubs: () => void;
}

export default function RunClubSettings() {
  const navigate = useNavigate();
  const { selectedClubId, selectedClub, refetchClubs } = useOutletContext<RunClubPortalContext>();
  const { updateClub, isLoading } = useRunClubManagement(selectedClubId);

  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    applications_enabled: true,
    auto_approve_applications: false,
    status: "draft" as "draft" | "published" | "suspended",
  });

  useEffect(() => {
    if (selectedClub) {
      setFormData({
        applications_enabled: selectedClub.applications_enabled,
        auto_approve_applications: selectedClub.auto_approve_applications,
        status: selectedClub.status,
      });
    }
  }, [selectedClub]);

  if (!selectedClubId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a run club</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateClub({
        applications_enabled: formData.applications_enabled,
        auto_approve_applications: formData.auto_approve_applications,
      });
      refetchClubs();
      toast.success("Settings saved!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      await updateClub({ status: "published" });
      refetchClubs();
      toast.success("Club is now live!");
    } catch (error) {
      console.error("Error publishing:", error);
      toast.error("Failed to publish");
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async () => {
    setSaving(true);
    try {
      await updateClub({ status: "draft" });
      refetchClubs();
      toast.success("Club is now hidden");
    } catch (error) {
      console.error("Error unpublishing:", error);
      toast.error("Failed to unpublish");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("run_clubs")
        .delete()
        .eq("id", selectedClubId);

      if (error) throw error;

      toast.success("Club deleted");
      navigate("/run-clubs");
    } catch (error) {
      console.error("Error deleting club:", error);
      toast.error("Failed to delete club");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-muted-foreground">
            Configure your club settings
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Visibility */}
      <Card>
        <CardHeader>
          <CardTitle>Visibility</CardTitle>
          <CardDescription>Control who can see your club</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium">Club Status</p>
              <p className="text-sm text-muted-foreground">
                {formData.status === "published" 
                  ? "Your club is visible to everyone"
                  : "Your club is only visible to organisers"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={formData.status === "published" ? "default" : "secondary"}>
                {formData.status === "published" ? "Live" : "Draft"}
              </Badge>
              {formData.status === "published" ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleUnpublish}
                  disabled={saving}
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  Unpublish
                </Button>
              ) : (
                <Button 
                  size="sm"
                  onClick={handlePublish}
                  disabled={saving}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Publish
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications */}
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>Configure how people join your club</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Accept Applications</Label>
              <p className="text-sm text-muted-foreground">
                Allow people to apply to join
              </p>
            </div>
            <Switch
              checked={formData.applications_enabled}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, applications_enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Approve Applications</Label>
              <p className="text-sm text-muted-foreground">
                Automatically approve all applications
              </p>
            </div>
            <Switch
              checked={formData.auto_approve_applications}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, auto_approve_applications: checked })
              }
              disabled={!formData.applications_enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Club</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this club and all its data
              </p>
            </div>
            <Button 
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Club
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedClub?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All members, runs, events, and data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
