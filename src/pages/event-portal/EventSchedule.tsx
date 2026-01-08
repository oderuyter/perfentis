import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Edit,
  Trash2,
  Clock,
  Users,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Heat {
  id: string;
  event_id: string;
  workout_id: string | null;
  division_id: string | null;
  name: string | null;
  start_time: string | null;
  duration_minutes: number;
  lane_count: number;
  status: string;
  created_at: string;
  event_workouts?: { title: string };
  event_divisions?: { name: string };
}

interface Workout {
  id: string;
  title: string;
}

interface Division {
  id: string;
  name: string;
}

interface ContextType {
  selectedEventId: string | null;
}

const emptyHeat: Partial<Heat> = {
  name: "",
  workout_id: null,
  division_id: null,
  start_time: null,
  duration_minutes: 15,
  lane_count: 6,
  status: "scheduled",
};

export default function EventSchedule() {
  const { selectedEventId } = useOutletContext<ContextType>();
  const [heats, setHeats] = useState<Heat[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Heat> | null>(null);
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");

  useEffect(() => {
    if (selectedEventId) {
      fetchData();
    }
  }, [selectedEventId]);

  const fetchData = async () => {
    if (!selectedEventId) return;

    try {
      const [heatsRes, workoutsRes, divisionsRes] = await Promise.all([
        supabase
          .from("event_heats")
          .select(`
            *,
            event_workouts(title),
            event_divisions(name)
          `)
          .eq("event_id", selectedEventId)
          .order("start_time", { ascending: true }),
        supabase
          .from("event_workouts")
          .select("id, title")
          .eq("event_id", selectedEventId),
        supabase
          .from("event_divisions")
          .select("id, name")
          .eq("event_id", selectedEventId),
      ]);

      if (heatsRes.error) throw heatsRes.error;
      setHeats(heatsRes.data || []);
      setWorkouts(workoutsRes.data || []);
      setDivisions(divisionsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (heat: Heat) => {
    setEditing(heat);
    if (heat.start_time) {
      const dt = new Date(heat.start_time);
      setStartDate(format(dt, "yyyy-MM-dd"));
      setStartTime(format(dt, "HH:mm"));
    } else {
      setStartDate("");
      setStartTime("");
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedEventId) return;

    setSaving(true);
    try {
      const startDateTime = startDate && startTime
        ? new Date(`${startDate}T${startTime}`).toISOString()
        : null;

      const heatData = {
        name: editing?.name || null,
        workout_id: editing?.workout_id || null,
        division_id: editing?.division_id || null,
        start_time: startDateTime,
        duration_minutes: editing?.duration_minutes || 15,
        lane_count: editing?.lane_count || 6,
        status: editing?.status || "scheduled",
      };

      if (editing?.id) {
        const { error } = await supabase
          .from("event_heats")
          .update(heatData)
          .eq("id", editing.id);

        if (error) throw error;
        toast.success("Heat updated");
      } else {
        const { error } = await supabase.from("event_heats").insert({
          ...heatData,
          event_id: selectedEventId,
        });

        if (error) throw error;
        toast.success("Heat created");
      }

      setDialogOpen(false);
      setEditing(null);
      setStartDate("");
      setStartTime("");
      fetchData();
    } catch (error) {
      console.error("Error saving heat:", error);
      toast.error("Failed to save heat");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this heat? Lane assignments will also be removed.")) {
      return;
    }

    try {
      const { error } = await supabase.from("event_heats").delete().eq("id", id);
      if (error) throw error;
      toast.success("Heat deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting heat:", error);
      toast.error("Failed to delete heat");
    }
  };

  // Group heats by date
  const heatsByDate = heats.reduce((acc, heat) => {
    const dateKey = heat.start_time
      ? format(new Date(heat.start_time), "yyyy-MM-dd")
      : "unscheduled";
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(heat);
    return acc;
  }, {} as Record<string, Heat[]>);

  if (!selectedEventId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Clock className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Event Selected</h2>
        <p className="text-muted-foreground">
          Select an event to manage the schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schedule (Heats / Lanes)</h1>
          <p className="text-muted-foreground">
            Create heats and assign athletes to lanes
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditing(emptyHeat);
                setStartDate("");
                setStartTime("");
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Heat
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing?.id ? "Edit Heat" : "Create Heat"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Heat Name (optional)</Label>
                <Input
                  id="name"
                  value={editing?.name || ""}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Heat 1, Finals, etc."
                />
              </div>

              <div className="space-y-2">
                <Label>Workout</Label>
                <Select
                  value={editing?.workout_id || "none"}
                  onValueChange={(v) =>
                    setEditing((prev) => ({
                      ...prev,
                      workout_id: v === "none" ? null : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select workout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No workout</SelectItem>
                    {workouts.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Division</Label>
                <Select
                  value={editing?.division_id || "none"}
                  onValueChange={(v) =>
                    setEditing((prev) => ({
                      ...prev,
                      division_id: v === "none" ? null : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All divisions</SelectItem>
                    {divisions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={1}
                    value={editing?.duration_minutes || 15}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        duration_minutes: parseInt(e.target.value) || 15,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lanes">Lane Count</Label>
                  <Input
                    id="lanes"
                    type="number"
                    min={1}
                    max={20}
                    value={editing?.lane_count || 6}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        lane_count: parseInt(e.target.value) || 6,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditing(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editing?.id ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Schedule Timeline */}
      {loading ? (
        <p className="text-center py-8 text-muted-foreground">Loading...</p>
      ) : heats.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">No heats scheduled</p>
          <Button
            variant="outline"
            onClick={() => {
              setEditing(emptyHeat);
              setDialogOpen(true);
            }}
          >
            Create your first heat
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(heatsByDate)
            .sort(([a], [b]) => (a === "unscheduled" ? 1 : b === "unscheduled" ? -1 : a.localeCompare(b)))
            .map(([date, dayHeats]) => (
              <Card key={date}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {date === "unscheduled"
                      ? "Unscheduled"
                      : format(new Date(date), "EEEE, MMMM d, yyyy")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Heat</TableHead>
                        <TableHead>Workout</TableHead>
                        <TableHead>Division</TableHead>
                        <TableHead>Lanes</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dayHeats.map((heat) => (
                        <TableRow key={heat.id}>
                          <TableCell>
                            {heat.start_time ? (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(heat.start_time), "HH:mm")}
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {heat.name || `Heat ${heats.indexOf(heat) + 1}`}
                            </span>
                          </TableCell>
                          <TableCell>
                            {heat.event_workouts?.title || "—"}
                          </TableCell>
                          <TableCell>
                            {heat.event_divisions?.name || "All"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Layers className="h-3 w-3" />
                              {heat.lane_count}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                heat.status === "completed"
                                  ? "default"
                                  : heat.status === "in_progress"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {heat.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(heat)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(heat.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
