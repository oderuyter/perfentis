import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  Calendar, 
  Plus,
  Clock,
  MapPin,
  Loader2,
  Edit,
  Trash2,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RunClub, RunClubRun, useRunClubManagement } from "@/hooks/useRunClubs";
import { toast } from "sonner";

interface RunClubPortalContext {
  selectedClubId: string | null;
  selectedClub: RunClub | null;
}

const DAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function RunClubRuns() {
  const { selectedClubId } = useOutletContext<RunClubPortalContext>();
  const { runs, isLoading, createRun, updateRun, deleteRun } = useRunClubManagement(selectedClubId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRun, setEditingRun] = useState<RunClubRun | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    day_of_week: "",
    start_time: "",
    meeting_point: "",
    distances: "",
    is_recurring: true,
    attendance_tracking_enabled: true,
  });

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

  const openDialog = (run?: RunClubRun) => {
    if (run) {
      setEditingRun(run);
      setFormData({
        title: run.title,
        description: run.description || "",
        day_of_week: run.day_of_week?.toString() || "",
        start_time: run.start_time || "",
        meeting_point: run.meeting_point || "",
        distances: run.distances.join(", "),
        is_recurring: run.is_recurring,
        attendance_tracking_enabled: run.attendance_tracking_enabled,
      });
    } else {
      setEditingRun(null);
      setFormData({
        title: "",
        description: "",
        day_of_week: "",
        start_time: "",
        meeting_point: "",
        distances: "",
        is_recurring: true,
        attendance_tracking_enabled: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a run title");
      return;
    }

    setSaving(true);
    try {
      const runData = {
        title: formData.title,
        description: formData.description || null,
        day_of_week: formData.day_of_week ? parseInt(formData.day_of_week) : null,
        start_time: formData.start_time || null,
        meeting_point: formData.meeting_point || null,
        distances: formData.distances.split(",").map(d => d.trim()).filter(Boolean),
        is_recurring: formData.is_recurring,
        attendance_tracking_enabled: formData.attendance_tracking_enabled,
      };

      if (editingRun) {
        await updateRun(editingRun.id, runData);
        toast.success("Run updated");
      } else {
        await createRun(runData);
        toast.success("Run created");
      }
      setDialogOpen(false);
    } catch (error) {
      console.error("Error saving run:", error);
      toast.error("Failed to save run");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (runId: string) => {
    if (!confirm("Are you sure you want to delete this run?")) return;
    
    try {
      await deleteRun(runId);
      toast.success("Run deleted");
    } catch (error) {
      console.error("Error deleting run:", error);
      toast.error("Failed to delete run");
    }
  };

  const toggleActive = async (run: RunClubRun) => {
    try {
      await updateRun(run.id, { is_active: !run.is_active });
      toast.success(run.is_active ? "Run deactivated" : "Run activated");
    } catch (error) {
      console.error("Error toggling run:", error);
      toast.error("Failed to update run");
    }
  };

  const activeRuns = runs.filter(r => r.is_active);
  const inactiveRuns = runs.filter(r => !r.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Runs</h2>
          <p className="text-muted-foreground">
            Manage your club's regular runs
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Run
        </Button>
      </div>

      {/* Active Runs */}
      <div className="space-y-3">
        <h3 className="font-medium text-muted-foreground">Active Runs</h3>
        {activeRuns.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-lg">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No active runs scheduled</p>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Run
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeRuns.map((run) => (
              <div
                key={run.id}
                className="bg-card border border-border rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">{run.title}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Clock className="h-3.5 w-3.5" />
                      {run.day_of_week !== null ? DAYS_SHORT[run.day_of_week] : 'TBD'}
                      {run.start_time && ` at ${run.start_time.slice(0, 5)}`}
                    </div>
                    {run.meeting_point && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {run.meeting_point}
                      </div>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDialog(run)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleActive(run)}>
                        Deactivate
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(run.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {run.distances.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {run.distances.map((d, i) => (
                      <Badge key={i} variant="secondary">{d}</Badge>
                    ))}
                  </div>
                )}

                {run.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {run.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inactive Runs */}
      {inactiveRuns.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">Inactive Runs</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {inactiveRuns.map((run) => (
              <div
                key={run.id}
                className="bg-muted/50 border border-border rounded-lg p-4 opacity-60"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{run.title}</h4>
                    <p className="text-sm text-muted-foreground">Inactive</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => toggleActive(run)}
                  >
                    Activate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRun ? "Edit Run" : "Create Run"}</DialogTitle>
            <DialogDescription>
              {editingRun ? "Update run details" : "Add a new regular run"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Run Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Tuesday Track Session"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="day">Day of Week</Label>
                <Select
                  value={formData.day_of_week}
                  onValueChange={(value) => setFormData({ ...formData, day_of_week: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Start Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting_point">Meeting Point</Label>
              <Input
                id="meeting_point"
                placeholder="e.g. Café entrance, Main Street"
                value={formData.meeting_point}
                onChange={(e) => setFormData({ ...formData, meeting_point: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="distances">Distances (comma-separated)</Label>
              <Input
                id="distances"
                placeholder="e.g. 5km, 10km"
                value={formData.distances}
                onChange={(e) => setFormData({ ...formData, distances: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Run details, route info, etc."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="tracking">Track Attendance</Label>
              <Switch
                id="tracking"
                checked={formData.attendance_tracking_enabled}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, attendance_tracking_enabled: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingRun ? "Save Changes" : "Create Run"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
