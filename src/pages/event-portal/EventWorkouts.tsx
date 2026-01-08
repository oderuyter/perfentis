import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Plus,
  Edit,
  Trash2,
  Dumbbell,
  Clock,
  Eye,
  EyeOff,
  Calendar,
  GripVertical,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Workout {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  workout_type: string;
  time_cap_seconds: number | null;
  scoring_type: string;
  standards: string | null;
  exercise_data: any;
  stage_day: number;
  display_order: number;
  released_at: string | null;
  submission_deadline: string | null;
  is_published: boolean;
  created_at: string;
}

interface ContextType {
  selectedEventId: string | null;
}

const emptyWorkout: Partial<Workout> = {
  title: "",
  description: "",
  workout_type: "amrap",
  time_cap_seconds: null,
  scoring_type: "reps",
  standards: "",
  exercise_data: null,
  stage_day: 1,
  is_published: false,
};

export default function EventWorkouts() {
  const { selectedEventId } = useOutletContext<ContextType>();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Workout> | null>(null);
  const [saving, setSaving] = useState(false);
  const [releaseDate, setReleaseDate] = useState("");
  const [releaseTime, setReleaseTime] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");

  useEffect(() => {
    if (selectedEventId) {
      fetchWorkouts();
    }
  }, [selectedEventId]);

  const fetchWorkouts = async () => {
    if (!selectedEventId) return;

    try {
      const { data, error } = await supabase
        .from("event_workouts")
        .select("*")
        .eq("event_id", selectedEventId)
        .order("stage_day", { ascending: true })
        .order("display_order", { ascending: true });

      if (error) throw error;
      setWorkouts(data || []);
    } catch (error) {
      console.error("Error fetching workouts:", error);
      toast.error("Failed to load workouts");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (workout: Workout) => {
    setEditing(workout);
    if (workout.released_at) {
      const releaseDateTime = new Date(workout.released_at);
      setReleaseDate(format(releaseDateTime, "yyyy-MM-dd"));
      setReleaseTime(format(releaseDateTime, "HH:mm"));
    } else {
      setReleaseDate("");
      setReleaseTime("");
    }
    if (workout.submission_deadline) {
      const deadlineDateTime = new Date(workout.submission_deadline);
      setDeadlineDate(format(deadlineDateTime, "yyyy-MM-dd"));
      setDeadlineTime(format(deadlineDateTime, "HH:mm"));
    } else {
      setDeadlineDate("");
      setDeadlineTime("");
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editing?.title || !selectedEventId) {
      toast.error("Workout title is required");
      return;
    }

    setSaving(true);
    try {
      const releasedAt = releaseDate && releaseTime
        ? new Date(`${releaseDate}T${releaseTime}`).toISOString()
        : null;
      const deadline = deadlineDate && deadlineTime
        ? new Date(`${deadlineDate}T${deadlineTime}`).toISOString()
        : null;

      const workoutData = {
        title: editing.title,
        description: editing.description,
        workout_type: editing.workout_type,
        time_cap_seconds: editing.time_cap_seconds,
        scoring_type: editing.scoring_type,
        standards: editing.standards,
        exercise_data: editing.exercise_data,
        stage_day: editing.stage_day || 1,
        released_at: releasedAt,
        submission_deadline: deadline,
        is_published: editing.is_published,
      };

      if (editing.id) {
        const { error } = await supabase
          .from("event_workouts")
          .update(workoutData)
          .eq("id", editing.id);

        if (error) throw error;
        toast.success("Workout updated");
      } else {
        const { error } = await supabase.from("event_workouts").insert({
          ...workoutData,
          event_id: selectedEventId,
          display_order: workouts.length,
        });

        if (error) throw error;
        toast.success("Workout created");
      }

      setDialogOpen(false);
      setEditing(null);
      setReleaseDate("");
      setReleaseTime("");
      setDeadlineDate("");
      setDeadlineTime("");
      fetchWorkouts();
    } catch (error) {
      console.error("Error saving workout:", error);
      toast.error("Failed to save workout");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this workout? Scores will also be deleted.")) {
      return;
    }

    try {
      const { error } = await supabase.from("event_workouts").delete().eq("id", id);
      if (error) throw error;
      toast.success("Workout deleted");
      fetchWorkouts();
    } catch (error) {
      console.error("Error deleting workout:", error);
      toast.error("Failed to delete workout");
    }
  };

  const togglePublish = async (workout: Workout) => {
    try {
      const { error } = await supabase
        .from("event_workouts")
        .update({
          is_published: !workout.is_published,
          released_at: !workout.is_published ? new Date().toISOString() : workout.released_at,
        })
        .eq("id", workout.id);

      if (error) throw error;
      toast.success(workout.is_published ? "Workout unpublished" : "Workout published");
      fetchWorkouts();
    } catch (error) {
      console.error("Error toggling publish:", error);
      toast.error("Failed to update");
    }
  };

  const isReleased = (workout: Workout) => {
    if (!workout.is_published) return false;
    if (!workout.released_at) return true;
    return new Date(workout.released_at) <= new Date();
  };

  const workoutTypeLabels: Record<string, string> = {
    amrap: "AMRAP",
    for_time: "For Time",
    emom: "EMOM",
    max_reps: "Max Reps",
    max_weight: "Max Weight",
    max_distance: "Max Distance",
    time_trial: "Time Trial",
  };

  const scoringTypeLabels: Record<string, string> = {
    reps: "Reps",
    time: "Time",
    weight: "Weight",
    distance: "Distance",
    points: "Points",
  };

  if (!selectedEventId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Dumbbell className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Event Selected</h2>
        <p className="text-muted-foreground">
          Select an event to manage workouts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workouts</h1>
          <p className="text-muted-foreground">
            Create and schedule event workouts
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditing(emptyWorkout);
                setReleaseDate("");
                setReleaseTime("");
                setDeadlineDate("");
                setDeadlineTime("");
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Workout
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing?.id ? "Edit Workout" : "Create Workout"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Workout Name *</Label>
                <Input
                  id="title"
                  value={editing?.title || ""}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Workout 1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Workout Type</Label>
                  <Select
                    value={editing?.workout_type || "amrap"}
                    onValueChange={(v) =>
                      setEditing((prev) => ({ ...prev, workout_type: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(workoutTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Scoring Type</Label>
                  <Select
                    value={editing?.scoring_type || "reps"}
                    onValueChange={(v) =>
                      setEditing((prev) => ({ ...prev, scoring_type: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(scoringTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stage_day">Stage / Day</Label>
                  <Input
                    id="stage_day"
                    type="number"
                    min={1}
                    value={editing?.stage_day || 1}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        stage_day: parseInt(e.target.value) || 1,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time_cap">Time Cap (minutes)</Label>
                  <Input
                    id="time_cap"
                    type="number"
                    min={0}
                    value={editing?.time_cap_seconds ? editing.time_cap_seconds / 60 : ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        time_cap_seconds: e.target.value
                          ? parseInt(e.target.value) * 60
                          : null,
                      }))
                    }
                    placeholder="No cap"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Workout Description</Label>
                <Textarea
                  id="description"
                  value={editing?.description || ""}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="21-15-9&#10;Thrusters (95/65)&#10;Pull-ups"
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Use free text or structured format
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="standards">Movement Standards</Label>
                <Textarea
                  id="standards"
                  value={editing?.standards || ""}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev, standards: e.target.value }))
                  }
                  placeholder="Describe movement standards, equipment requirements..."
                  rows={3}
                />
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-medium">Release Schedule</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Release Date</Label>
                    <Input
                      type="date"
                      value={releaseDate}
                      onChange={(e) => setReleaseDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Release Time</Label>
                    <Input
                      type="time"
                      value={releaseTime}
                      onChange={(e) => setReleaseTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Submission Deadline Date</Label>
                    <Input
                      type="date"
                      value={deadlineDate}
                      onChange={(e) => setDeadlineDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Submission Deadline Time</Label>
                    <Input
                      type="time"
                      value={deadlineTime}
                      onChange={(e) => setDeadlineTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Published</Label>
                    <p className="text-sm text-muted-foreground">
                      Make visible when release time arrives
                    </p>
                  </div>
                  <Switch
                    checked={editing?.is_published ?? false}
                    onCheckedChange={(v) =>
                      setEditing((prev) => ({ ...prev, is_published: v }))
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

      {/* Workouts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="col-span-full text-center py-8 text-muted-foreground">
            Loading...
          </p>
        ) : workouts.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No workouts yet</p>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(emptyWorkout);
                setDialogOpen(true);
              }}
            >
              Create your first workout
            </Button>
          </div>
        ) : (
          workouts.map((workout) => (
            <Card key={workout.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="mb-2">
                      Day {workout.stage_day}
                    </Badge>
                    <CardTitle className="text-lg">{workout.title}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(workout)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(workout.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {workoutTypeLabels[workout.workout_type] || workout.workout_type}
                  </Badge>
                  <Badge variant="secondary">
                    Score: {scoringTypeLabels[workout.scoring_type] || workout.scoring_type}
                  </Badge>
                  {workout.time_cap_seconds && (
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      {Math.floor(workout.time_cap_seconds / 60)} min cap
                    </Badge>
                  )}
                </div>

                {workout.description && (
                  <pre className="text-sm text-muted-foreground bg-muted/50 p-2 rounded whitespace-pre-wrap font-mono line-clamp-4">
                    {workout.description}
                  </pre>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    {isReleased(workout) ? (
                      <Badge className="bg-green-500/20 text-green-600">
                        <Eye className="h-3 w-3 mr-1" />
                        Released
                      </Badge>
                    ) : workout.is_published && workout.released_at ? (
                      <Badge className="bg-blue-500/20 text-blue-600">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(workout.released_at), "MMM d, HH:mm")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Draft
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePublish(workout)}
                  >
                    {workout.is_published ? "Unpublish" : "Publish Now"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
