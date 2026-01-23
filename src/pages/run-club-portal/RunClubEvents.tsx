import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  Trophy, 
  Plus,
  Calendar,
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
import { RunClub, RunClubEvent, useRunClubManagement } from "@/hooks/useRunClubs";
import { toast } from "sonner";
import { format } from "date-fns";

interface RunClubPortalContext {
  selectedClubId: string | null;
  selectedClub: RunClub | null;
}

const EVENT_TYPES = [
  { value: "race", label: "Race" },
  { value: "time_trial", label: "Time Trial" },
  { value: "social", label: "Social Event" },
  { value: "training", label: "Training Session" },
  { value: "other", label: "Other" },
];

export default function RunClubEvents() {
  const { selectedClubId } = useOutletContext<RunClubPortalContext>();
  const { events, isLoading, createEvent, updateEvent, deleteEvent } = useRunClubManagement(selectedClubId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<RunClubEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_type: "race",
    event_date: "",
    start_time: "",
    location: "",
    distances: "",
    capacity: "",
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

  const openDialog = (event?: RunClubEvent) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        description: event.description || "",
        event_type: event.event_type,
        event_date: event.event_date,
        start_time: event.start_time || "",
        location: event.location || "",
        distances: event.distances.join(", "),
        capacity: event.capacity?.toString() || "",
      });
    } else {
      setEditingEvent(null);
      setFormData({
        title: "",
        description: "",
        event_type: "race",
        event_date: "",
        start_time: "",
        location: "",
        distances: "",
        capacity: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.event_date) {
      toast.error("Please enter a title and date");
      return;
    }

    setSaving(true);
    try {
      const eventData = {
        title: formData.title,
        description: formData.description || null,
        event_type: formData.event_type as RunClubEvent["event_type"],
        event_date: formData.event_date,
        start_time: formData.start_time || null,
        location: formData.location || null,
        distances: formData.distances.split(",").map(d => d.trim()).filter(Boolean),
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
      };

      if (editingEvent) {
        await updateEvent(editingEvent.id, eventData);
        toast.success("Event updated");
      } else {
        await createEvent(eventData);
        toast.success("Event created");
      }
      setDialogOpen(false);
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error("Failed to save event");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    
    try {
      await deleteEvent(eventId);
      toast.success("Event deleted");
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const upcomingEvents = events.filter(e => new Date(e.event_date) >= new Date());
  const pastEvents = events.filter(e => new Date(e.event_date) < new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Events & Races</h2>
          <p className="text-muted-foreground">
            Organize club events and races
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      {/* Upcoming Events */}
      <div className="space-y-3">
        <h3 className="font-medium text-muted-foreground">Upcoming Events</h3>
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-lg">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No upcoming events</p>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="bg-card border border-border rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{event.title}</h4>
                      <Badge variant="outline" className="capitalize">
                        {event.event_type.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(event.event_date), "EEE, MMM d, yyyy")}
                      {event.start_time && ` at ${event.start_time.slice(0, 5)}`}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.location}
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
                      <DropdownMenuItem onClick={() => openDialog(event)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(event.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {event.distances.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {event.distances.map((d, i) => (
                      <Badge key={i} variant="secondary">{d}</Badge>
                    ))}
                  </div>
                )}

                {event.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {event.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground">Past Events</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {pastEvents.slice(0, 4).map((event) => (
              <div
                key={event.id}
                className="bg-muted/50 border border-border rounded-lg p-4 opacity-60"
              >
                <h4 className="font-medium">{event.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(event.event_date), "MMM d, yyyy")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Create Event"}</DialogTitle>
            <DialogDescription>
              {editingEvent ? "Update event details" : "Add a new club event or race"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Spring 10K Race"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Event Type</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value) => setFormData({ ...formData, event_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="time">Start Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  placeholder="Unlimited"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g. Central Park"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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
                placeholder="Event details..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingEvent ? "Save Changes" : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
