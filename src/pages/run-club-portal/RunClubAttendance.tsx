import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { format } from "date-fns";
import { 
  ClipboardCheck,
  Calendar,
  Loader2,
  Users,
  History,
  BarChart3,
  Plus,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RunClub, RunClubRun, useRunClubManagement } from "@/hooks/useRunClubs";
import { 
  useRunClubAttendance, 
  useClubAttendanceStats,
  RunInstance 
} from "@/hooks/useRunClubAttendance";
import { RunAttendanceSheet } from "@/components/run-clubs/RunAttendanceSheet";
import { AttendanceStatsCard } from "@/components/run-clubs/AttendanceStatsCard";
import { toast } from "sonner";

interface RunClubPortalContext {
  selectedClubId: string | null;
  selectedClub: RunClub | null;
}

export default function RunClubAttendance() {
  const { selectedClubId } = useOutletContext<RunClubPortalContext>();
  const { runs, members, isLoading: managementLoading } = useRunClubManagement(selectedClubId);
  const { 
    instances, 
    attendance,
    isLoading: attendanceLoading,
    createInstance,
    recordAttendance,
    bulkRecordAttendance,
    completeInstance,
    cancelInstance,
    refetchInstances,
    refetchAttendance
  } = useRunClubAttendance(selectedClubId);
  const { stats: clubStats, isLoading: statsLoading } = useClubAttendanceStats(selectedClubId);

  const [selectedRun, setSelectedRun] = useState<RunClubRun | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<RunInstance | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!selectedClubId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a run club</p>
      </div>
    );
  }

  const isLoading = managementLoading || attendanceLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const runsWithTracking = runs.filter(r => r.is_active && r.attendance_tracking_enabled);
  const completedInstances = instances.filter(i => i.status === "completed");
  const upcomingInstances = instances.filter(i => i.status === "scheduled");

  const handleOpenAttendanceSheet = (run: RunClubRun, instance?: RunInstance) => {
    setSelectedRun(run);
    setSelectedInstance(instance || null);
    setSheetOpen(true);
  };

  const handleRecordAttendance = async (
    instanceId: string,
    runId: string,
    records: Array<{ userId: string; attended: boolean; notes?: string }>
  ) => {
    await bulkRecordAttendance(instanceId, runId, records);
  };

  const handleCancelInstance = async (instance: RunInstance) => {
    try {
      await cancelInstance(instance.id, "Cancelled by organiser");
      toast.success("Session cancelled");
    } catch (error) {
      toast.error("Failed to cancel session");
    }
  };

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Attendance</h2>
          <p className="text-muted-foreground">
            Track member attendance at runs
          </p>
        </div>
      </div>

      <Tabs defaultValue="record" className="space-y-6">
        <TabsList>
          <TabsTrigger value="record" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Record
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistics
          </TabsTrigger>
        </TabsList>

        {/* Record Attendance Tab */}
        <TabsContent value="record" className="space-y-6">
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
            <>
              {/* Quick Record Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Quick Record</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {runsWithTracking.map((run) => (
                    <Card 
                      key={run.id} 
                      className="cursor-pointer hover:border-primary/50 transition-colors group"
                      onClick={() => handleOpenAttendanceSheet(run)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{run.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {run.day_of_week !== null ? days[run.day_of_week] : 'TBD'}
                              {run.start_time && ` at ${run.start_time.slice(0, 5)}`}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Button size="sm" variant="secondary" className="h-7 text-xs">
                                <Plus className="h-3 w-3 mr-1" />
                                Record Today
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Scheduled Sessions */}
              {upcomingInstances.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Scheduled Sessions</h3>
                  <div className="space-y-2">
                    {upcomingInstances.map((instance) => {
                      const run = runs.find(r => r.id === instance.run_id);
                      return (
                        <Card key={instance.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                  <Clock className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {instance.run?.title || run?.title || "Run Session"}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(instance.scheduled_date), "EEEE, MMM d")}
                                    {instance.scheduled_time && ` at ${instance.scheduled_time.slice(0, 5)}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => run && handleOpenAttendanceSheet(run, instance)}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Take Attendance
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => handleCancelInstance(instance)}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Cancel Session
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Attendance History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completedInstances.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No completed sessions yet</p>
                  <p className="text-sm">Record attendance to see history here</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {completedInstances.map((instance) => {
                      const run = runs.find(r => r.id === instance.run_id);
                      return (
                        <div 
                          key={instance.id}
                          className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => run && handleOpenAttendanceSheet(run, instance)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {instance.run?.title || run?.title || "Run Session"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(instance.scheduled_date), "EEEE, MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="gap-1">
                              <Users className="h-3 w-3" />
                              {instance.attendance_count || 0}
                            </Badge>
                            {instance.weather_conditions && (
                              <Badge variant="outline" className="capitalize">
                                {instance.weather_conditions}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats">
          <AttendanceStatsCard stats={clubStats} isLoading={statsLoading} />
        </TabsContent>
      </Tabs>

      {/* Attendance Recording Sheet */}
      <RunAttendanceSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setSelectedRun(null);
            setSelectedInstance(null);
            refetchInstances();
            refetchAttendance();
          }
        }}
        run={selectedRun}
        members={members}
        instance={selectedInstance}
        existingAttendance={
          selectedInstance 
            ? attendance.filter(a => a.run_instance_id === selectedInstance.id)
            : []
        }
        onCreateInstance={createInstance}
        onRecordAttendance={handleRecordAttendance}
        onCompleteInstance={completeInstance}
      />
    </div>
  );
}
