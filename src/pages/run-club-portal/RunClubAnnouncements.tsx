import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  Megaphone, 
  Plus,
  Loader2,
  Pin,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RunClub } from "@/hooks/useRunClubs";
import { toast } from "sonner";
import { format } from "date-fns";

interface RunClubPortalContext {
  selectedClubId: string | null;
  selectedClub: RunClub | null;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  author_user_id: string;
  is_pinned: boolean;
  published_at: string;
  created_at: string;
}

export default function RunClubAnnouncements() {
  const { user } = useAuth();
  const { selectedClubId } = useOutletContext<RunClubPortalContext>();
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    body: "",
    is_pinned: false,
    send_notification: true,
  });

  const fetchAnnouncements = useCallback(async () => {
    if (!selectedClubId) return;
    
    try {
      const { data, error } = await supabase
        .from("run_club_announcements")
        .select("*")
        .eq("run_club_id", selectedClubId)
        .order("is_pinned", { ascending: false })
        .order("published_at", { ascending: false });

      if (error) throw error;
      setAnnouncements((data || []) as Announcement[]);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedClubId]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  if (!selectedClubId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a run club</p>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.body.trim()) {
      toast.error("Please enter a title and message");
      return;
    }

    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("run_club_announcements")
        .insert({
          run_club_id: selectedClubId,
          title: formData.title,
          body: formData.body,
          is_pinned: formData.is_pinned,
          author_user_id: user.id,
          send_notification: formData.send_notification,
        });

      if (error) throw error;

      toast.success("Announcement posted!");
      setDialogOpen(false);
      setFormData({ title: "", body: "", is_pinned: false, send_notification: true });
      fetchAnnouncements();
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast.error("Failed to post announcement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;

    try {
      const { error } = await supabase
        .from("run_club_announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Announcement deleted");
      fetchAnnouncements();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Failed to delete announcement");
    }
  };

  const togglePin = async (announcement: Announcement) => {
    try {
      const { error } = await supabase
        .from("run_club_announcements")
        .update({ is_pinned: !announcement.is_pinned })
        .eq("id", announcement.id);

      if (error) throw error;
      fetchAnnouncements();
    } catch (error) {
      console.error("Error toggling pin:", error);
      toast.error("Failed to update announcement");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Announcements</h2>
          <p className="text-muted-foreground">
            Communicate with your members
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Announcement
        </Button>
      </div>

      {announcements.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No announcements yet</p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Announcement
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{announcement.title}</h3>
                  {announcement.is_pinned && (
                    <Badge variant="secondary" className="text-xs">
                      <Pin className="h-3 w-3 mr-1" />
                      Pinned
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePin(announcement)}
                  >
                    <Pin className={`h-4 w-4 ${announcement.is_pinned ? "text-primary" : ""}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(announcement.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <p className="text-muted-foreground whitespace-pre-wrap mb-2">
                {announcement.body}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(announcement.published_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
            <DialogDescription>
              Post an announcement to all club members
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Announcement title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                placeholder="Your announcement..."
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                rows={4}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Pin Announcement</Label>
                <p className="text-sm text-muted-foreground">
                  Keep at top of the list
                </p>
              </div>
              <Switch
                checked={formData.is_pinned}
                onCheckedChange={(checked) => setFormData({ ...formData, is_pinned: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Send Notification</Label>
                <p className="text-sm text-muted-foreground">
                  Notify members in-app
                </p>
              </div>
              <Switch
                checked={formData.send_notification}
                onCheckedChange={(checked) => setFormData({ ...formData, send_notification: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Post Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
