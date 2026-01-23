import { useOutletContext } from "react-router-dom";
import { 
  Users, 
  UserPlus, 
  Calendar, 
  MessageSquare,
  TrendingUp,
  ClipboardCheck,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RunClub, useRunClubManagement } from "@/hooks/useRunClubs";

interface RunClubPortalContext {
  selectedClubId: string | null;
  selectedClub: RunClub | null;
}

export default function RunClubDashboard() {
  const { selectedClubId, selectedClub } = useOutletContext<RunClubPortalContext>();
  const { members, applications, runs, events, isLoading } = useRunClubManagement(selectedClubId);

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

  const activeMembers = members.filter(m => m.status === 'active').length;
  const pendingApplications = applications.filter(a => a.status === 'pending').length;
  const upcomingEvents = events.filter(e => new Date(e.event_date) >= new Date()).length;
  const activeRuns = runs.filter(r => r.is_active).length;

  const stats = [
    {
      title: "Active Members",
      value: activeMembers,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Pending Applications",
      value: pendingApplications,
      icon: UserPlus,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "Active Runs",
      value: activeRuns,
      icon: Calendar,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Upcoming Events",
      value: upcomingEvents,
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of {selectedClub?.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Applications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Recent Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {applications.filter(a => a.status === 'pending').length === 0 ? (
              <p className="text-muted-foreground text-sm">No pending applications</p>
            ) : (
              <div className="space-y-3">
                {applications
                  .filter(a => a.status === 'pending')
                  .slice(0, 5)
                  .map((app) => (
                    <div 
                      key={app.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {(app as any).profile?.display_name || app.applicant_name || 'Unknown'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Applied {new Date(app.applied_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Runs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {runs.filter(r => r.is_active).length === 0 ? (
              <p className="text-muted-foreground text-sm">No runs scheduled</p>
            ) : (
              <div className="space-y-3">
                {runs
                  .filter(r => r.is_active && r.is_recurring)
                  .slice(0, 5)
                  .map((run) => {
                    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                    return (
                      <div 
                        key={run.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{run.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {run.day_of_week !== null ? days[run.day_of_week] : 'TBD'} 
                            {run.start_time && ` at ${run.start_time.slice(0, 5)}`}
                          </p>
                        </div>
                        {run.distances.length > 0 && (
                          <span className="text-sm text-muted-foreground">
                            {run.distances.join(', ')}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
