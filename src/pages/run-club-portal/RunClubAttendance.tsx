import { useOutletContext } from "react-router-dom";
import { 
  ClipboardCheck,
  Calendar,
  Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { RunClub, useRunClubManagement } from "@/hooks/useRunClubs";

interface RunClubPortalContext {
  selectedClubId: string | null;
  selectedClub: RunClub | null;
}

export default function RunClubAttendance() {
  const { selectedClubId } = useOutletContext<RunClubPortalContext>();
  const { runs, isLoading } = useRunClubManagement(selectedClubId);

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

  const runsWithTracking = runs.filter(r => r.is_active && r.attendance_tracking_enabled);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Attendance</h2>
        <p className="text-muted-foreground">
          Track member attendance at runs
        </p>
      </div>

      {runsWithTracking.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No runs with attendance tracking</h3>
            <p className="text-sm text-muted-foreground">
              Enable attendance tracking on your runs to start recording attendance
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {runsWithTracking.map((run) => {
            const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            return (
              <Card key={run.id} className="cursor-pointer hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{run.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {run.day_of_week !== null ? days[run.day_of_week] : 'TBD'}
                        {run.start_time && ` at ${run.start_time.slice(0, 5)}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click to record attendance
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Placeholder for future attendance recording */}
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Full attendance recording coming soon. Track member attendance, view statistics, and export reports.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
