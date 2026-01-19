import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Eye, Calendar, MapPin, Users, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_mode: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  is_public: boolean;
  hero_image_url: string | null;
  rules: string | null;
  contact_email: string | null;
  created_at: string;
  registration_count?: number;
  category_id?: string | null;
  gym_id?: string | null;
}

interface Gym {
  id: string;
  name: string;
  address: string | null;
}

interface EventCategory {
  id: string;
  name: string;
}

interface ContextType {
  refreshEvents: () => void;
}

const emptyEvent: Partial<Event> = {
  title: "",
  description: "",
  event_type: "single_day",
  event_mode: "in_person",
  location: "",
  start_date: "",
  end_date: "",
  is_public: true,
  rules: "",
  contact_email: "",
  category_id: "",
  gym_id: "",
};

export default function EventsManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { refreshEvents } = useOutletContext<ContextType>();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<Event> | null>(null);
  const [saving, setSaving] = useState(false);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [gymSearchOpen, setGymSearchOpen] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchGyms();
    fetchCategories();
  }, [user]);

  const fetchGyms = async () => {
    const { data } = await supabase
      .from("gyms")
      .select("id, name, address")
      .eq("status", "active")
      .order("name");
    setGyms(data || []);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("event_categories")
      .select("id, name")
      .eq("is_active", true)
      .order("display_order");
    setCategories(data || []);
  };

  const handleGymSelect = (gymId: string) => {
    const selectedGym = gyms.find(g => g.id === gymId);
    if (selectedGym) {
      setEditingEvent(prev => ({
        ...prev,
        gym_id: gymId,
        location: selectedGym.address || selectedGym.name,
      }));
    }
    setGymSearchOpen(false);
  };

  const fetchEvents = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          event_registrations(count)
        `)
        .eq("organiser_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const eventsWithCounts = (data || []).map((e: any) => ({
        ...e,
        registration_count: e.event_registrations?.[0]?.count || 0,
      }));

      setEvents(eventsWithCounts);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingEvent?.title || !user) {
      toast.error("Event title is required");
      return;
    }

    setSaving(true);
    try {
      if (editingEvent.id) {
        // Update
        const { error } = await supabase
          .from("events")
          .update({
            title: editingEvent.title,
            description: editingEvent.description,
            event_type: editingEvent.event_type,
            event_mode: editingEvent.event_mode,
            location: editingEvent.location,
            start_date: editingEvent.start_date || null,
            end_date: editingEvent.end_date || null,
            is_public: editingEvent.is_public,
            rules: editingEvent.rules,
            contact_email: editingEvent.contact_email,
            category_id: editingEvent.category_id || null,
            gym_id: editingEvent.gym_id || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingEvent.id);

        if (error) throw error;
        toast.success("Event updated");
      } else {
        // Create
        const { error } = await supabase.from("events").insert({
          title: editingEvent.title,
          description: editingEvent.description,
          event_type: editingEvent.event_type,
          event_mode: editingEvent.event_mode,
          location: editingEvent.location,
          start_date: editingEvent.start_date || null,
          end_date: editingEvent.end_date || null,
          is_public: editingEvent.is_public,
          rules: editingEvent.rules,
          contact_email: editingEvent.contact_email,
          category_id: editingEvent.category_id || null,
          gym_id: editingEvent.gym_id || null,
          organiser_id: user.id,
          status: "draft",
        });

        if (error) throw error;
        toast.success("Event created");
      }

      setDialogOpen(false);
      setEditingEvent(null);
      fetchEvents();
      refreshEvents();
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error("Failed to save event");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event? This cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
      toast.success("Event deleted");
      fetchEvents();
      refreshEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const updateStatus = async (eventId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", eventId);

      if (error) throw error;
      toast.success(`Event ${newStatus}`);
      fetchEvents();
      refreshEvents();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    published: "bg-blue-500/20 text-blue-500",
    live: "bg-green-500/20 text-green-500",
    finished: "bg-gray-500/20 text-gray-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-muted-foreground">Manage your competitions and events</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingEvent(emptyEvent)}>
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEvent?.id ? "Edit Event" : "Create Event"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Name *</Label>
                <Input
                  id="title"
                  value={editingEvent?.title || ""}
                  onChange={(e) =>
                    setEditingEvent((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Summer Throwdown 2026"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingEvent?.description || ""}
                  onChange={(e) =>
                    setEditingEvent((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Event description..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={editingEvent?.category_id || ""}
                    onValueChange={(v) =>
                      setEditingEvent((prev) => ({ ...prev, category_id: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <Select
                    value={editingEvent?.event_type || "single_day"}
                    onValueChange={(v) =>
                      setEditingEvent((prev) => ({ ...prev, event_type: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single_day">Single Day</SelectItem>
                      <SelectItem value="multi_day">Multi-Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Event Mode</Label>
                <Select
                  value={editingEvent?.event_mode || "in_person"}
                  onValueChange={(v) =>
                    setEditingEvent((prev) => ({ ...prev, event_mode: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_person">In Person</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Venue / Location</Label>
                <Popover open={gymSearchOpen} onOpenChange={setGymSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={gymSearchOpen}
                      className="w-full justify-between font-normal"
                    >
                      {editingEvent?.gym_id ? (
                        <span className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {gyms.find(g => g.id === editingEvent?.gym_id)?.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Search gyms...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search gyms..." />
                      <CommandList>
                        <CommandEmpty>No gyms found.</CommandEmpty>
                        <CommandGroup>
                          {gyms.map((gym) => (
                            <CommandItem
                              key={gym.id}
                              value={gym.name}
                              onSelect={() => handleGymSelect(gym.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  editingEvent?.gym_id === gym.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div>
                                <p className="font-medium">{gym.name}</p>
                                {gym.address && (
                                  <p className="text-xs text-muted-foreground">{gym.address}</p>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Input
                  id="location"
                  value={editingEvent?.location || ""}
                  onChange={(e) =>
                    setEditingEvent((prev) => ({ ...prev, location: e.target.value, gym_id: "" }))
                  }
                  placeholder="Or enter address manually"
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={editingEvent?.start_date || ""}
                    onChange={(e) =>
                      setEditingEvent((prev) => ({ ...prev, start_date: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={editingEvent?.end_date || ""}
                    onChange={(e) =>
                      setEditingEvent((prev) => ({ ...prev, end_date: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={editingEvent?.contact_email || ""}
                  onChange={(e) =>
                    setEditingEvent((prev) => ({ ...prev, contact_email: e.target.value }))
                  }
                  placeholder="events@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rules">Event Rules / Standards</Label>
                <Textarea
                  id="rules"
                  value={editingEvent?.rules || ""}
                  onChange={(e) =>
                    setEditingEvent((prev) => ({ ...prev, rules: e.target.value }))
                  }
                  placeholder="Movement standards, scoring rules, etc."
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Public Event</Label>
                  <p className="text-sm text-muted-foreground">
                    Visible in event discovery
                  </p>
                </div>
                <Switch
                  checked={editingEvent?.is_public ?? true}
                  onCheckedChange={(v) =>
                    setEditingEvent((prev) => ({ ...prev, is_public: v }))
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingEvent(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editingEvent?.id ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Events Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registrations</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">No events yet</p>
                    <Button
                      variant="link"
                      onClick={() => {
                        setEditingEvent(emptyEvent);
                        setDialogOpen(true);
                      }}
                    >
                      Create your first event
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {event.event_mode?.replace("_", " ")} • {event.event_type?.replace("_", " ")}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {event.start_date ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(event.start_date), "MMM d, yyyy")}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.location ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[150px]">{event.location}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[event.status]}>
                        {event.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {event.registration_count || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingEvent(event);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {event.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatus(event.id, "published")}
                          >
                            Publish
                          </Button>
                        )}
                        {event.status === "published" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatus(event.id, "live")}
                          >
                            Go Live
                          </Button>
                        )}
                        {event.status === "live" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatus(event.id, "finished")}
                          >
                            End
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(event.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
