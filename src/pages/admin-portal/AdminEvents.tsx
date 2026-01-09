import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Label } from "@/components/ui/label";
import {
  Search,
  MoreHorizontal,
  Plus,
  Eye,
  Edit,
  Users,
  Download,
  Flag,
  Calendar,
  Trophy,
  ClipboardList,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { logAuditEvent } from "@/hooks/useAuditLog";

interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  event_mode: string | null;
  organiser_id: string;
  created_at: string;
  registration_count?: number;
  division_count?: number;
}

const STATUS_OPTIONS = ["draft", "published", "live", "finished", "cancelled"];

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const [eventsRes, registrationsRes, divisionsRes] = await Promise.all([
        supabase.from("events").select("*").order("start_date", { ascending: false }),
        supabase.from("event_registrations").select("event_id"),
        supabase.from("event_divisions").select("event_id"),
      ]);

      if (eventsRes.error) throw eventsRes.error;

      // Count registrations and divisions per event
      const regCounts: Record<string, number> = {};
      const divCounts: Record<string, number> = {};

      (registrationsRes.data || []).forEach((r) => {
        regCounts[r.event_id] = (regCounts[r.event_id] || 0) + 1;
      });

      (divisionsRes.data || []).forEach((d) => {
        divCounts[d.event_id] = (divCounts[d.event_id] || 0) + 1;
      });

      const eventsWithCounts = (eventsRes.data || []).map((event) => ({
        ...event,
        registration_count: regCounts[event.id] || 0,
        division_count: divCounts[event.id] || 0,
      }));

      setEvents(eventsWithCounts);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load events");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      !searchQuery ||
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || event.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = async () => {
    if (!selectedEvent || !newStatus) return;

    try {
      const { error } = await supabase
        .from("events")
        .update({ status: newStatus })
        .eq("id", selectedEvent.id);

      if (error) throw error;

      await logAuditEvent({
        action: "event_status_updated",
        message: `Event '${selectedEvent.title}' status changed from '${selectedEvent.status}' to '${newStatus}'`,
        category: "event",
        entityType: "event",
        entityId: selectedEvent.id,
        metadata: { oldStatus: selectedEvent.status, newStatus },
      });

      toast.success("Event status updated");
      setShowStatusDialog(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (error) {
      console.error("Error updating event status:", error);
      toast.error("Failed to update event status");
    }
  };

  const exportEvents = () => {
    const csvData = filteredEvents.map((event) => ({
      id: event.id,
      title: event.title,
      status: event.status,
      mode: event.event_mode || "",
      location: event.location || "",
      start_date: event.start_date || "",
      end_date: event.end_date || "",
      registrations: event.registration_count,
      divisions: event.division_count,
      created_at: event.created_at,
    }));

    const headers = Object.keys(csvData[0] || {}).join(",");
    const rows = csvData.map((row) => Object.values(row).join(",")).join("\n");
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `events-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    logAuditEvent({
      action: "events_exported",
      message: `Exported ${filteredEvents.length} events to CSV`,
      category: "admin",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "default";
      case "published":
        return "secondary";
      case "finished":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-muted-foreground">
            Manage events and competitions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportEvents}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Events ({filteredEvents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Registrations</TableHead>
                  <TableHead>Divisions</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <Flag className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium">{event.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {event.location || "No location"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(event.status) as any}>
                        {event.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {event.event_mode || "Not set"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {event.start_date
                        ? format(new Date(event.start_date), "MMM d, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>{event.registration_count}</TableCell>
                    <TableCell>{event.division_count}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowDetailDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Users className="h-4 w-4 mr-2" />
                            Registrations
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <ClipboardList className="h-4 w-4 mr-2" />
                            Divisions
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Trophy className="h-4 w-4 mr-2" />
                            Leaderboards
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedEvent(event);
                              setNewStatus(event.status);
                              setShowStatusDialog(true);
                            }}
                          >
                            <Calendar className="h-4 w-4 mr-2" />
                            Change Status
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Title</Label>
                  <p className="font-medium">{selectedEvent.title}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p>
                    <Badge variant={getStatusColor(selectedEvent.status) as any}>
                      {selectedEvent.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Mode</Label>
                  <p>{selectedEvent.event_mode || "Not set"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Location</Label>
                  <p>{selectedEvent.location || "Not set"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Start Date</Label>
                  <p>
                    {selectedEvent.start_date
                      ? format(new Date(selectedEvent.start_date), "PPP")
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">End Date</Label>
                  <p>
                    {selectedEvent.end_date
                      ? format(new Date(selectedEvent.end_date), "PPP")
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Registrations</Label>
                  <p>{selectedEvent.registration_count}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Divisions</Label>
                  <p>{selectedEvent.division_count}</p>
                </div>
              </div>
              {selectedEvent.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1">{selectedEvent.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Event Status</DialogTitle>
            <DialogDescription>
              Update the status of "{selectedEvent?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStatusDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
