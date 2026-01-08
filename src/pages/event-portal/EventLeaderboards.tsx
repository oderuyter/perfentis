import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Trophy, Medal, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface LeaderboardEntry {
  rank: number;
  registration_id: string;
  athlete_name: string;
  division_name: string;
  total_points: number;
  workout_scores: Record<string, { score: string; points: number; rank: number }>;
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

interface ContextType {
  selectedEventId: string | null;
}

export default function EventLeaderboards() {
  const { selectedEventId } = useOutletContext<ContextType>();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (selectedEventId) {
      fetchData();
    }
  }, [selectedEventId, selectedDivision]);

  const fetchData = async () => {
    if (!selectedEventId) return;

    try {
      // Fetch workouts and divisions
      const [workoutsRes, divisionsRes] = await Promise.all([
        supabase
          .from("event_workouts")
          .select("id, title, scoring_type")
          .eq("event_id", selectedEventId)
          .eq("is_published", true)
          .order("stage_day")
          .order("display_order"),
        supabase
          .from("event_divisions")
          .select("id, name")
          .eq("event_id", selectedEventId),
      ]);

      setWorkouts(workoutsRes.data || []);
      setDivisions(divisionsRes.data || []);

      // Fetch all scores and registrations
      let regsQuery = supabase
        .from("event_registrations")
        .select("id, user_id, division_id")
        .eq("event_id", selectedEventId)
        .in("status", ["confirmed", "checked_in"]);

      if (selectedDivision !== "all") {
        regsQuery = regsQuery.eq("division_id", selectedDivision);
      }

      const { data: registrations } = await regsQuery;

      const { data: scores } = await supabase
        .from("event_scores")
        .select("*")
        .eq("event_id", selectedEventId)
        .in("status", ["submitted", "validated"]);

      // Get profiles
      const profilesMap: Record<string, string> = {};
      if (registrations) {
        const userIds = registrations.map((r) => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);

        (profiles || []).forEach((p) => {
          profilesMap[p.user_id] = p.display_name || "Unknown";
        });
      }

      // Calculate leaderboard
      const workoutsList = workoutsRes.data || [];
      const divisionsList = divisionsRes.data || [];
      const scoresList = scores || [];

      // Build leaderboard entries
      const entries: LeaderboardEntry[] = (registrations || []).map((reg) => {
        const workoutScores: Record<string, { score: string; points: number; rank: number }> = {};
        let totalPoints = 0;

        workoutsList.forEach((workout) => {
          const regScore = scoresList.find(
            (s) => s.registration_id === reg.id && s.workout_id === workout.id
          );

          if (regScore) {
            // Get all scores for this workout in same division
            const divisionScores = scoresList
              .filter((s) => {
                const regForScore = (registrations || []).find((r) => r.id === s.registration_id);
                return (
                  s.workout_id === workout.id &&
                  (!selectedDivision || selectedDivision === "all" || regForScore?.division_id === selectedDivision)
                );
              })
              .map((s) => {
                if (workout.scoring_type === "time") {
                  return { regId: s.registration_id, value: s.score_time_seconds || Infinity };
                } else if (workout.scoring_type === "weight") {
                  return { regId: s.registration_id, value: -(s.score_weight || 0) }; // Negative for descending
                } else {
                  return { regId: s.registration_id, value: -(s.score_reps || 0) }; // Negative for descending
                }
              })
              .sort((a, b) => a.value - b.value);

            const rank = divisionScores.findIndex((s) => s.regId === reg.id) + 1;
            const points = rank > 0 ? Math.max(100 - (rank - 1) * 5, 1) : 0;
            totalPoints += points;

            let scoreDisplay = "—";
            if (workout.scoring_type === "time" && regScore.score_time_seconds) {
              const mins = Math.floor(regScore.score_time_seconds / 60);
              const secs = regScore.score_time_seconds % 60;
              scoreDisplay = `${mins}:${secs.toString().padStart(2, "0")}`;
            } else if (workout.scoring_type === "weight" && regScore.score_weight) {
              scoreDisplay = `${regScore.score_weight} lbs`;
            } else if (regScore.score_reps) {
              scoreDisplay = `${regScore.score_reps} reps`;
            }

            workoutScores[workout.id] = { score: scoreDisplay, points, rank };
          } else {
            workoutScores[workout.id] = { score: "—", points: 0, rank: 0 };
          }
        });

        const division = divisionsList.find((d) => d.id === reg.division_id);

        return {
          rank: 0,
          registration_id: reg.id,
          athlete_name: profilesMap[reg.user_id] || "Unknown",
          division_name: division?.name || "—",
          total_points: totalPoints,
          workout_scores: workoutScores,
        };
      });

      // Sort and assign ranks
      entries.sort((a, b) => b.total_points - a.total_points);
      entries.forEach((entry, idx) => {
        entry.rank = idx + 1;
      });

      setLeaderboard(entries);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      toast.error("Failed to load leaderboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Medal className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="font-bold">{rank}</span>;
  };

  if (!selectedEventId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Trophy className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Event Selected</h2>
        <p className="text-muted-foreground">
          Select an event to view the leaderboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leaderboards</h1>
          <p className="text-muted-foreground">
            Live standings and rankings
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedDivision} onValueChange={setSelectedDivision}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Divisions" />
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
          <Button variant="outline" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">Rank</TableHead>
                <TableHead>Athlete</TableHead>
                <TableHead>Division</TableHead>
                {workouts.map((w) => (
                  <TableHead key={w.id} className="text-center min-w-[100px]">
                    {w.title}
                  </TableHead>
                ))}
                <TableHead className="text-center">Total Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4 + workouts.length} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : leaderboard.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4 + workouts.length} className="text-center py-8">
                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No scores yet</p>
                  </TableCell>
                </TableRow>
              ) : (
                leaderboard.map((entry) => (
                  <TableRow key={entry.registration_id}>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        {getRankBadge(entry.rank)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{entry.athlete_name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.division_name}</Badge>
                    </TableCell>
                    {workouts.map((w) => {
                      const ws = entry.workout_scores[w.id];
                      return (
                        <TableCell key={w.id} className="text-center">
                          <div className="text-sm">
                            <span className="font-medium">{ws?.score || "—"}</span>
                            {ws?.rank > 0 && (
                              <div className="text-xs text-muted-foreground">
                                #{ws.rank} ({ws.points} pts)
                              </div>
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      <span className="font-bold text-lg">{entry.total_points}</span>
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
