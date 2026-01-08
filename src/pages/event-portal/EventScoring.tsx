import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Target,
  Check,
  X,
  Clock,
  Hash,
  Weight,
  Save,
} from "lucide-react";
import { toast } from "sonner";

interface Score {
  id: string;
  registration_id: string | null;
  team_id: string | null;
  workout_id: string;
  score_value: number | null;
  score_time_seconds: number | null;
  score_reps: number | null;
  score_weight: number | null;
  status: string;
  athlete_name?: string;
  team_name?: string;
}

interface Workout {
  id: string;
  title: string;
  scoring_type: string;
}

interface Division {
  id: string;
  name: string;
}

interface Heat {
  id: string;
  name: string | null;
  workout_id: string | null;
  division_id: string | null;
}

interface Registration {
  id: string;
  user_id: string;
  division_id: string | null;
  profile?: { display_name: string | null };
}

interface ContextType {
  selectedEventId: string | null;
}

export default function EventScoring() {
  const { selectedEventId } = useOutletContext<ContextType>();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [heats, setHeats] = useState<Heat[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [selectedWorkout, setSelectedWorkout] = useState<string>("");
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [selectedHeat, setSelectedHeat] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<Score>>>({});

  useEffect(() => {
    if (selectedEventId) {
      fetchData();
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (selectedWorkout) {
      fetchScores();
    }
  }, [selectedWorkout]);

  const fetchData = async () => {
    if (!selectedEventId) return;

    try {
      const [workoutsRes, divisionsRes, heatsRes, regsRes] = await Promise.all([
        supabase
          .from("event_workouts")
          .select("id, title, scoring_type")
          .eq("event_id", selectedEventId),
        supabase
          .from("event_divisions")
          .select("id, name")
          .eq("event_id", selectedEventId),
        supabase
          .from("event_heats")
          .select("id, name, workout_id, division_id")
          .eq("event_id", selectedEventId),
        supabase
          .from("event_registrations")
          .select("id, user_id, division_id")
          .eq("event_id", selectedEventId)
          .eq("status", "confirmed"),
      ]);

      setWorkouts(workoutsRes.data || []);
      setDivisions(divisionsRes.data || []);
      setHeats(heatsRes.data || []);

      // Fetch profiles for registrations
      const regsWithProfiles = await Promise.all(
        (regsRes.data || []).map(async (reg) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", reg.user_id)
            .single();
          return { ...reg, profile };
        })
      );
      setRegistrations(regsWithProfiles);

      if (workoutsRes.data && workoutsRes.data.length > 0) {
        setSelectedWorkout(workoutsRes.data[0].id);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchScores = async () => {
    if (!selectedWorkout) return;

    try {
      const { data, error } = await supabase
        .from("event_scores")
        .select("*")
        .eq("workout_id", selectedWorkout);

      if (error) throw error;

      const scoresMap: Record<string, Score> = {};
      (data || []).forEach((score) => {
        const key = score.registration_id || score.team_id;
        if (key) scoresMap[key] = score;
      });
      setScores(scoresMap);
    } catch (error) {
      console.error("Error fetching scores:", error);
    }
  };

  const updateScore = (registrationId: string, field: string, value: any) => {
    setPendingChanges((prev) => ({
      ...prev,
      [registrationId]: {
        ...prev[registrationId],
        [field]: value,
      },
    }));
  };

  const saveScores = async () => {
    if (!selectedEventId || !selectedWorkout) return;

    setSaving(true);
    try {
      const updates = Object.entries(pendingChanges).map(async ([regId, changes]) => {
        const existingScore = scores[regId];

        if (existingScore) {
          // Update existing
          const { error } = await supabase
            .from("event_scores")
            .update({
              ...changes,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingScore.id);

          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase.from("event_scores").insert({
            event_id: selectedEventId,
            workout_id: selectedWorkout,
            registration_id: regId,
            ...changes,
            status: "submitted",
          });

          if (error) throw error;
        }
      });

      await Promise.all(updates);
      toast.success("Scores saved");
      setPendingChanges({});
      fetchScores();
    } catch (error) {
      console.error("Error saving scores:", error);
      toast.error("Failed to save scores");
    } finally {
      setSaving(false);
    }
  };

  const validateScore = async (regId: string, valid: boolean) => {
    const existingScore = scores[regId];
    if (!existingScore) return;

    try {
      const { error } = await supabase
        .from("event_scores")
        .update({
          status: valid ? "validated" : "rejected",
          validated_at: new Date().toISOString(),
        })
        .eq("id", existingScore.id);

      if (error) throw error;
      toast.success(valid ? "Score validated" : "Score rejected");
      fetchScores();
    } catch (error) {
      console.error("Error validating score:", error);
      toast.error("Failed to update");
    }
  };

  const currentWorkout = workouts.find((w) => w.id === selectedWorkout);

  const filteredRegistrations = registrations.filter((reg) => {
    if (selectedDivision !== "all" && reg.division_id !== selectedDivision) {
      return false;
    }
    return true;
  });

  const getScoreValue = (regId: string) => {
    const pending = pendingChanges[regId];
    const existing = scores[regId];
    return pending || existing || {};
  };

  const statusColors: Record<string, string> = {
    submitted: "bg-yellow-500/20 text-yellow-600",
    validated: "bg-green-500/20 text-green-600",
    rejected: "bg-red-500/20 text-red-600",
  };

  if (!selectedEventId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Target className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Event Selected</h2>
        <p className="text-muted-foreground">
          Select an event to enter scores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Scoring</h1>
          <p className="text-muted-foreground">
            Enter and validate athlete scores
          </p>
        </div>
        <Button
          onClick={saveScores}
          disabled={saving || Object.keys(pendingChanges).length === 0}
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Scores"}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="w-48">
          <Label className="mb-2 block">Workout</Label>
          <Select value={selectedWorkout} onValueChange={setSelectedWorkout}>
            <SelectTrigger>
              <SelectValue placeholder="Select workout" />
            </SelectTrigger>
            <SelectContent>
              {workouts.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Label className="mb-2 block">Division</Label>
          <Select value={selectedDivision} onValueChange={setSelectedDivision}>
            <SelectTrigger>
              <SelectValue placeholder="All divisions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              {divisions.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Label className="mb-2 block">Heat</Label>
          <Select value={selectedHeat} onValueChange={setSelectedHeat}>
            <SelectTrigger>
              <SelectValue placeholder="All heats" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Heats</SelectItem>
              {heats
                .filter((h) => !selectedWorkout || h.workout_id === selectedWorkout)
                .map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name || "Unnamed Heat"}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scoring Info */}
      {currentWorkout && (
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg">{currentWorkout.title}</CardTitle>
              <Badge variant="outline" className="capitalize">
                Score Type: {currentWorkout.scoring_type}
              </Badge>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Scoring Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Athlete</TableHead>
                {currentWorkout?.scoring_type === "time" && (
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Time (mm:ss)
                    </div>
                  </TableHead>
                )}
                {(currentWorkout?.scoring_type === "reps" ||
                  currentWorkout?.scoring_type === "points") && (
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Hash className="h-4 w-4" />
                      Reps/Points
                    </div>
                  </TableHead>
                )}
                {currentWorkout?.scoring_type === "weight" && (
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Weight className="h-4 w-4" />
                      Weight (lbs)
                    </div>
                  </TableHead>
                )}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredRegistrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <p className="text-muted-foreground">No athletes to score</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRegistrations.map((reg) => {
                  const scoreData = getScoreValue(reg.id);
                  const existingScore = scores[reg.id];

                  return (
                    <TableRow key={reg.id}>
                      <TableCell>
                        <span className="font-medium">
                          {reg.profile?.display_name || "Unknown"}
                        </span>
                      </TableCell>

                      {currentWorkout?.scoring_type === "time" && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              placeholder="Min"
                              className="w-20"
                              value={
                                scoreData.score_time_seconds
                                  ? Math.floor(scoreData.score_time_seconds / 60)
                                  : ""
                              }
                              onChange={(e) => {
                                const mins = parseInt(e.target.value) || 0;
                                const secs = (scoreData.score_time_seconds || 0) % 60;
                                updateScore(reg.id, "score_time_seconds", mins * 60 + secs);
                              }}
                            />
                            <span className="self-center">:</span>
                            <Input
                              type="number"
                              placeholder="Sec"
                              className="w-20"
                              max={59}
                              value={
                                scoreData.score_time_seconds
                                  ? scoreData.score_time_seconds % 60
                                  : ""
                              }
                              onChange={(e) => {
                                const secs = Math.min(parseInt(e.target.value) || 0, 59);
                                const mins = Math.floor((scoreData.score_time_seconds || 0) / 60);
                                updateScore(reg.id, "score_time_seconds", mins * 60 + secs);
                              }}
                            />
                          </div>
                        </TableCell>
                      )}

                      {(currentWorkout?.scoring_type === "reps" ||
                        currentWorkout?.scoring_type === "points") && (
                        <TableCell>
                          <Input
                            type="number"
                            placeholder="Reps"
                            className="w-24"
                            value={scoreData.score_reps || ""}
                            onChange={(e) =>
                              updateScore(reg.id, "score_reps", parseInt(e.target.value) || null)
                            }
                          />
                        </TableCell>
                      )}

                      {currentWorkout?.scoring_type === "weight" && (
                        <TableCell>
                          <Input
                            type="number"
                            placeholder="Weight"
                            className="w-24"
                            value={scoreData.score_weight || ""}
                            onChange={(e) =>
                              updateScore(reg.id, "score_weight", parseFloat(e.target.value) || null)
                            }
                          />
                        </TableCell>
                      )}

                      <TableCell>
                        {existingScore ? (
                          <Badge className={statusColors[existingScore.status]}>
                            {existingScore.status}
                          </Badge>
                        ) : pendingChanges[reg.id] ? (
                          <Badge variant="outline">Unsaved</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {existingScore && existingScore.status === "submitted" && (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => validateScore(reg.id, true)}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => validateScore(reg.id, false)}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
