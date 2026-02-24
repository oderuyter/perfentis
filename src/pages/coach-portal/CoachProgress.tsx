import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TrendingUp,
  Calendar,
  Dumbbell,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Activity,
  Target,
  Trophy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCoachClients } from "@/hooks/useCoach";
import { CoachStrengthScoreCard } from "@/components/coach/CoachStrengthScoreCard";
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";

interface Coach {
  id: string;
  display_name: string;
}

interface ClientWorkoutData {
  clientId: string;
  clientUserId: string;
  clientName: string;
  avatarUrl: string | null;
  planName: string | null;
  planProgress: number;
  currentWeek: number | null;
  totalWeeks: number | null;
  lastWorkoutAt: string | null;
  completedWorkouts: number;
  missedWorkouts: number;
  adherenceRate: number;
  recentSessions: WorkoutSession[];
}

interface WorkoutSession {
  id: string;
  workout_name: string;
  started_at: string;
  duration_seconds: number | null;
  total_volume: number | null;
  status: string;
  notes: string | null;
}

interface SessionDetail {
  session: WorkoutSession;
  exercises: ExerciseLog[];
}

interface ExerciseLog {
  id: string;
  exercise_name: string;
  exercise_order: number;
  sets: SetLog[];
  notes: string | null;
}

interface SetLog {
  id: string;
  set_number: number;
  target_weight: number | null;
  target_reps: number | null;
  completed_weight: number | null;
  completed_reps: number | null;
  rpe: number | null;
  is_completed: boolean;
}

export default function CoachProgress() {
  const { coach } = useOutletContext<{ coach: Coach }>();
  const { clients, isLoading: clientsLoading } = useCoachClients(coach?.id);
  const [clientData, setClientData] = useState<ClientWorkoutData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientWorkoutData | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
  const [showClientSheet, setShowClientSheet] = useState(false);
  const [showSessionSheet, setShowSessionSheet] = useState(false);

  // Fetch workout data for all clients
  useEffect(() => {
    async function fetchClientProgress() {
      if (!coach || clients.length === 0) {
        setClientData([]);
        setIsLoading(false);
        return;
      }

      try {
        const clientProgress: ClientWorkoutData[] = [];
        const thirtyDaysAgo = subDays(new Date(), 30);

        for (const client of clients.filter(c => c.status === 'active')) {
          const clientUserId = client.client_user_id;
          const profile = client.profiles;

          // Get active plan assignment
          const { data: assignments } = await supabase
            .from("client_plan_assignments")
            .select(`
              *,
              training_plans(name, duration_weeks)
            `)
            .eq("client_id", client.id)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1);

          const activeAssignment = assignments?.[0];

          // Get recent workout sessions
          const { data: sessions } = await supabase
            .from("workout_sessions")
            .select("*")
            .eq("user_id", clientUserId)
            .gte("started_at", thirtyDaysAgo.toISOString())
            .order("started_at", { ascending: false });

          const recentSessions = (sessions || []) as WorkoutSession[];
          const completedSessions = recentSessions.filter(s => s.status === 'completed');
          const abandonedSessions = recentSessions.filter(s => s.status === 'abandoned');

          // Calculate adherence (simplified: completed / expected based on plan)
          const expectedWorkoutsPerWeek = 4; // Default assumption
          const expectedWorkouts = Math.round((30 / 7) * expectedWorkoutsPerWeek);
          const adherenceRate = expectedWorkouts > 0 
            ? Math.min(100, Math.round((completedSessions.length / expectedWorkouts) * 100))
            : 0;

          clientProgress.push({
            clientId: client.id,
            clientUserId: clientUserId,
            clientName: profile?.display_name || 'Unknown',
            avatarUrl: profile?.avatar_url || null,
            planName: activeAssignment?.training_plans?.name || null,
            planProgress: activeAssignment?.progress_percentage || 0,
            currentWeek: activeAssignment?.current_week || null,
            totalWeeks: activeAssignment?.training_plans?.duration_weeks || null,
            lastWorkoutAt: completedSessions[0]?.started_at || null,
            completedWorkouts: completedSessions.length,
            missedWorkouts: abandonedSessions.length,
            adherenceRate,
            recentSessions: recentSessions.slice(0, 10),
          });
        }

        setClientData(clientProgress);
      } catch (error) {
        console.error("Error fetching client progress:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (!clientsLoading) {
      fetchClientProgress();
    }
  }, [coach, clients, clientsLoading]);

  // Fetch session details
  const fetchSessionDetails = async (session: WorkoutSession) => {
    try {
      const { data: exerciseLogs } = await supabase
        .from("exercise_logs")
        .select(`
          *,
          set_logs(*)
        `)
        .eq("session_id", session.id)
        .order("exercise_order", { ascending: true });

      const exercises: ExerciseLog[] = (exerciseLogs || []).map(log => ({
        id: log.id,
        exercise_name: log.exercise_name,
        exercise_order: log.exercise_order,
        notes: log.notes,
        sets: (log.set_logs || []).sort((a: any, b: any) => a.set_number - b.set_number),
      }));

      setSelectedSession({ session, exercises });
      setShowSessionSheet(true);
    } catch (error) {
      console.error("Error fetching session details:", error);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };

  const getAdherenceBadge = (rate: number) => {
    if (rate >= 80) return <Badge className="bg-accent/20 text-accent-foreground">Excellent</Badge>;
    if (rate >= 60) return <Badge className="bg-warning/20 text-warning-foreground">Good</Badge>;
    if (rate >= 40) return <Badge className="bg-muted text-muted-foreground">Needs Attention</Badge>;
    return <Badge variant="destructive">Low</Badge>;
  };

  if (isLoading || clientsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (clientData.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Client Progress</h2>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-1">No Active Clients</h3>
            <p className="text-sm text-muted-foreground">
              Client workout progress will appear here once you have active clients
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Client Progress</h2>
        <Badge variant="outline">{clientData.length} active clients</Badge>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {clientData.reduce((sum, c) => sum + c.completedWorkouts, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Workouts (30d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Math.round(clientData.reduce((sum, c) => sum + c.adherenceRate, 0) / clientData.length)}%
                </p>
                <p className="text-sm text-muted-foreground">Avg Adherence</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {clientData.filter(c => c.lastWorkoutAt && 
                    isWithinInterval(new Date(c.lastWorkoutAt), {
                      start: subDays(new Date(), 3),
                      end: new Date()
                    })
                  ).length}
                </p>
                <p className="text-sm text-muted-foreground">Active (3d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client List */}
      <div className="space-y-3">
        {clientData.map((client) => (
          <Card 
            key={client.clientId} 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => {
              setSelectedClient(client);
              setShowClientSheet(true);
            }}
          >
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={client.avatarUrl || undefined} />
                  <AvatarFallback>
                    {client.clientName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">{client.clientName}</h3>
                    {getAdherenceBadge(client.adherenceRate)}
                  </div>
                  {client.planName && (
                    <p className="text-sm text-muted-foreground truncate">
                      {client.planName} • Week {client.currentWeek || 1}/{client.totalWeeks || '?'}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      {client.completedWorkouts} completed
                    </span>
                    {client.missedWorkouts > 0 && (
                      <span className="flex items-center gap-1">
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                        {client.missedWorkouts} abandoned
                      </span>
                    )}
                    {client.lastWorkoutAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {format(new Date(client.lastWorkoutAt), 'MMM d')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="hidden sm:flex flex-col items-end gap-1">
                  {client.planName && (
                    <div className="w-24">
                      <Progress value={client.planProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1 text-right">
                        {client.planProgress}% complete
                      </p>
                    </div>
                  )}
                </div>

                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Client Detail Sheet */}
      <Sheet open={showClientSheet} onOpenChange={setShowClientSheet}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={selectedClient?.avatarUrl || undefined} />
                <AvatarFallback>
                  {selectedClient?.clientName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p>{selectedClient?.clientName}</p>
                <p className="text-sm font-normal text-muted-foreground">
                  {selectedClient?.planName || 'No active plan'}
                </p>
              </div>
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)] mt-6">
            <div className="space-y-6 pr-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-2xl font-bold">{selectedClient?.adherenceRate}%</p>
                    <p className="text-xs text-muted-foreground">Adherence</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-2xl font-bold">{selectedClient?.completedWorkouts}</p>
                    <p className="text-xs text-muted-foreground">Workouts (30d)</p>
                  </CardContent>
                </Card>
              </div>

              {/* Strength Score */}
              {selectedClient?.clientUserId && (
                <CoachStrengthScoreCard clientUserId={selectedClient.clientUserId} />
              )}

              {/* Plan Progress */}
              {selectedClient?.planName && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Plan Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">{selectedClient.planName}</span>
                      <span className="text-sm text-muted-foreground">
                        Week {selectedClient.currentWeek}/{selectedClient.totalWeeks}
                      </span>
                    </div>
                    <Progress value={selectedClient.planProgress} className="h-2" />
                  </CardContent>
                </Card>
              )}

              {/* Recent Sessions */}
              <div>
                <h4 className="font-medium mb-3">Recent Workouts</h4>
                <div className="space-y-2">
                  {selectedClient?.recentSessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No recent workouts
                    </p>
                  ) : (
                    selectedClient?.recentSessions.map((session) => (
                      <Card 
                        key={session.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => fetchSessionDetails(session)}
                      >
                        <CardContent className="py-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <Dumbbell className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-sm">
                                  {session.workout_name}
                                </span>
                                {session.status === 'completed' ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span>{format(new Date(session.started_at), 'MMM d, h:mm a')}</span>
                                <span>{formatDuration(session.duration_seconds)}</span>
                                {session.total_volume && (
                                  <span>{(session.total_volume / 1000).toFixed(1)}k kg</span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Session Detail Sheet */}
      <Sheet open={showSessionSheet} onOpenChange={setShowSessionSheet}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {selectedSession?.session.workout_name}
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)] mt-6">
            <div className="space-y-4 pr-4">
              {/* Session Summary */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="py-3 text-center">
                    <p className="font-bold">
                      {formatDuration(selectedSession?.session.duration_seconds || null)}
                    </p>
                    <p className="text-xs text-muted-foreground">Duration</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-3 text-center">
                    <p className="font-bold">
                      {selectedSession?.exercises.length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Exercises</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-3 text-center">
                    <p className="font-bold">
                      {selectedSession?.session.total_volume 
                        ? `${(selectedSession.session.total_volume / 1000).toFixed(1)}k`
                        : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">Volume (kg)</p>
                  </CardContent>
                </Card>
              </div>

              {/* Athlete Notes */}
              {selectedSession?.session.notes && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Athlete Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {selectedSession.session.notes}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Exercises with Sets */}
              <div className="space-y-3">
                <h4 className="font-medium">Exercises</h4>
                {selectedSession?.exercises.map((exercise) => (
                  <Card key={exercise.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {exercise.exercise_order + 1}.
                        </span>
                        {exercise.exercise_name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        <div className="grid grid-cols-4 text-xs text-muted-foreground mb-1">
                          <span>Set</span>
                          <span>Target</span>
                          <span>Actual</span>
                          <span>RPE</span>
                        </div>
                        {exercise.sets.map((set) => (
                          <div 
                            key={set.id} 
                            className={`grid grid-cols-4 text-sm py-1 ${
                              set.is_completed ? '' : 'text-muted-foreground line-through'
                            }`}
                          >
                            <span>{set.set_number}</span>
                            <span>
                              {set.target_weight}kg × {set.target_reps}
                            </span>
                            <span className={set.is_completed ? 'text-green-600' : ''}>
                              {set.completed_weight}kg × {set.completed_reps}
                            </span>
                            <span>{set.rpe || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
