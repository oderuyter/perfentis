import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Calendar,
  Dumbbell,
  Trophy,
  Clock,
  Target,
  ArrowRight,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

interface ContextType {
  selectedEventId: string | null;
  selectedEvent: { id: string; title: string; status: string; start_date: string | null } | undefined;
  refreshEvents: () => void;
}

interface DashboardStats {
  totalRegistrations: number;
  paidRegistrations: number;
  pendingRegistrations: number;
  checkedIn: number;
  totalHeats: number;
  releasedWorkouts: number;
  totalWorkouts: number;
  divisionCounts: { name: string; count: number }[];
}

export default function EventDashboard() {
  const { selectedEventId, selectedEvent } = useOutletContext<ContextType>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalRegistrations: 0,
    paidRegistrations: 0,
    pendingRegistrations: 0,
    checkedIn: 0,
    totalHeats: 0,
    releasedWorkouts: 0,
    totalWorkouts: 0,
    divisionCounts: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedEventId) {
      fetchStats();
    }
  }, [selectedEventId]);

  const fetchStats = async () => {
    if (!selectedEventId) return;

    try {
      // Fetch registrations
      const { data: registrations } = await supabase
        .from("event_registrations")
        .select("id, payment_status, checked_in_at, division_id")
        .eq("event_id", selectedEventId);

      // Fetch heats
      const { data: heats } = await supabase
        .from("event_heats")
        .select("id")
        .eq("event_id", selectedEventId);

      // Fetch workouts
      const { data: workouts } = await supabase
        .from("event_workouts")
        .select("id, released_at, is_published")
        .eq("event_id", selectedEventId);

      // Fetch divisions for breakdown
      const { data: divisions } = await supabase
        .from("event_divisions")
        .select("id, name")
        .eq("event_id", selectedEventId);

      const regs = registrations || [];
      const divisionCounts = (divisions || []).map((div) => ({
        name: div.name,
        count: regs.filter((r) => r.division_id === div.id).length,
      }));

      setStats({
        totalRegistrations: regs.length,
        paidRegistrations: regs.filter((r) => r.payment_status === "paid").length,
        pendingRegistrations: regs.filter((r) => r.payment_status === "pending").length,
        checkedIn: regs.filter((r) => r.checked_in_at).length,
        totalHeats: heats?.length || 0,
        releasedWorkouts: (workouts || []).filter(
          (w) => w.is_published && w.released_at && new Date(w.released_at) <= new Date()
        ).length,
        totalWorkouts: workouts?.length || 0,
        divisionCounts,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedEventId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Trophy className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Event Selected</h2>
        <p className="text-muted-foreground mb-4">
          Create your first event or select one from the dropdown above.
        </p>
        <Button onClick={() => navigate("/event-portal/events/new")}>
          Create Event
        </Button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    published: "bg-blue-500/20 text-blue-500",
    live: "bg-green-500/20 text-green-500",
    finished: "bg-gray-500/20 text-gray-500",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{selectedEvent?.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            {selectedEvent?.start_date && (
              <span className="text-sm text-muted-foreground">
                {format(new Date(selectedEvent.start_date), "MMMM d, yyyy")}
              </span>
            )}
            <Badge className={statusColors[selectedEvent?.status || "draft"]}>
              {selectedEvent?.status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/event-portal/events")}>
            Edit Event
          </Button>
          {selectedEvent?.status === "draft" && (
            <Button>Publish Event</Button>
          )}
          {selectedEvent?.status === "live" && (
            <Button variant="destructive">End Event</Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalRegistrations}</p>
                <p className="text-sm text-muted-foreground">Registrations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.paidRegistrations}</p>
                <p className="text-sm text-muted-foreground">Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingRegistrations}</p>
                <p className="text-sm text-muted-foreground">Pending Payment</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.checkedIn}</p>
                <p className="text-sm text-muted-foreground">Checked In</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate("/event-portal/workouts")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Dumbbell className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Release Workout</p>
                  <p className="text-sm text-muted-foreground">
                    {stats.releasedWorkouts}/{stats.totalWorkouts} released
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate("/event-portal/scoring")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Open Scoring</p>
                  <p className="text-sm text-muted-foreground">Enter live scores</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate("/event-portal/leaderboards")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">View Leaderboard</p>
                  <p className="text-sm text-muted-foreground">See current standings</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Division Breakdown */}
      {stats.divisionCounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Registrations by Division</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.divisionCounts.map((div) => (
                <div key={div.name} className="flex items-center justify-between">
                  <span className="text-sm">{div.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${Math.min((div.count / stats.totalRegistrations) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8">{div.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Overview */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Heats Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalHeats}</p>
            <Button variant="link" className="px-0" onClick={() => navigate("/event-portal/schedule")}>
              Manage Schedule <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              Workouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {stats.releasedWorkouts} / {stats.totalWorkouts}
            </p>
            <p className="text-sm text-muted-foreground">released</p>
            <Button variant="link" className="px-0" onClick={() => navigate("/event-portal/workouts")}>
              Manage Workouts <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
