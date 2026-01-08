import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Users, Trophy, Clock, Dumbbell } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface ContextType {
  selectedEventId: string | null;
  selectedEvent: { title: string } | undefined;
}

export default function EventReports() {
  const { selectedEventId, selectedEvent } = useOutletContext<ContextType>();
  const [exporting, setExporting] = useState<string | null>(null);

  const exportRegistrations = async () => {
    if (!selectedEventId) return;
    setExporting("registrations");

    try {
      const { data: registrations } = await supabase
        .from("event_registrations")
        .select(`
          *,
          event_divisions(name)
        `)
        .eq("event_id", selectedEventId);

      if (!registrations) return;

      // Get profiles
      const userIds = registrations.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const profileMap: Record<string, string> = {};
      (profiles || []).forEach((p) => {
        profileMap[p.user_id] = p.display_name || "Unknown";
      });

      const headers = ["Name", "Division", "Type", "Status", "Payment Status", "Registered At"];
      const rows = registrations.map((r) => [
        profileMap[r.user_id] || "Unknown",
        r.event_divisions?.name || "-",
        r.registration_type,
        r.status,
        r.payment_status,
        format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
      ]);

      downloadCSV("registrations", headers, rows);
      toast.success("Registrations exported");
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Export failed");
    } finally {
      setExporting(null);
    }
  };

  const exportScores = async () => {
    if (!selectedEventId) return;
    setExporting("scores");

    try {
      const { data: scores } = await supabase
        .from("event_scores")
        .select(`
          *,
          event_workouts(title)
        `)
        .eq("event_id", selectedEventId);

      if (!scores) return;

      // Get registration info
      const regIds = scores.filter((s) => s.registration_id).map((s) => s.registration_id);
      const { data: registrations } = await supabase
        .from("event_registrations")
        .select("id, user_id")
        .in("id", regIds);

      const userIds = (registrations || []).map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const profileMap: Record<string, string> = {};
      const regUserMap: Record<string, string> = {};
      
      (registrations || []).forEach((r) => {
        regUserMap[r.id] = r.user_id;
      });
      (profiles || []).forEach((p) => {
        profileMap[p.user_id] = p.display_name || "Unknown";
      });

      const headers = ["Workout", "Athlete", "Time", "Reps", "Weight", "Status", "Rank"];
      const rows = scores.map((s) => {
        const userId = s.registration_id ? regUserMap[s.registration_id] : null;
        const name = userId ? profileMap[userId] : "Unknown";
        const timeStr = s.score_time_seconds
          ? `${Math.floor(s.score_time_seconds / 60)}:${(s.score_time_seconds % 60).toString().padStart(2, "0")}`
          : "";

        return [
          s.event_workouts?.title || "-",
          name,
          timeStr,
          s.score_reps?.toString() || "",
          s.score_weight?.toString() || "",
          s.status,
          s.rank?.toString() || "",
        ];
      });

      downloadCSV("scores", headers, rows);
      toast.success("Scores exported");
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Export failed");
    } finally {
      setExporting(null);
    }
  };

  const exportSchedule = async () => {
    if (!selectedEventId) return;
    setExporting("schedule");

    try {
      const { data: heats } = await supabase
        .from("event_heats")
        .select(`
          *,
          event_workouts(title),
          event_divisions(name)
        `)
        .eq("event_id", selectedEventId)
        .order("start_time");

      if (!heats) return;

      const headers = ["Time", "Heat Name", "Workout", "Division", "Lanes", "Duration (min)"];
      const rows = heats.map((h) => [
        h.start_time ? format(new Date(h.start_time), "yyyy-MM-dd HH:mm") : "-",
        h.name || "-",
        h.event_workouts?.title || "-",
        h.event_divisions?.name || "All",
        h.lane_count.toString(),
        h.duration_minutes.toString(),
      ]);

      downloadCSV("schedule", headers, rows);
      toast.success("Schedule exported");
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Export failed");
    } finally {
      setExporting(null);
    }
  };

  const downloadCSV = (name: string, headers: string[], rows: string[][]) => {
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedEvent?.title || "event"}-${name}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  if (!selectedEventId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Event Selected</h2>
        <p className="text-muted-foreground">
          Select an event to export reports.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports / Exports</h1>
        <p className="text-muted-foreground">
          Export event data as CSV files
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Athlete List
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Export all registered athletes with division and payment status
            </p>
            <Button
              className="w-full"
              onClick={exportRegistrations}
              disabled={exporting === "registrations"}
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting === "registrations" ? "Exporting..." : "Export Registrations"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Export all workout scores with rankings
            </p>
            <Button
              className="w-full"
              onClick={exportScores}
              disabled={exporting === "scores"}
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting === "scores" ? "Exporting..." : "Export Scores"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Export heats and lane assignments
            </p>
            <Button
              className="w-full"
              onClick={exportSchedule}
              disabled={exporting === "schedule"}
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting === "schedule" ? "Exporting..." : "Export Schedule"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Detailed statistics coming soon</p>
            <p className="text-sm">Including registration trends, score distributions, and more</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
