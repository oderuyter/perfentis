import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  MessageSquare,
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Video,
  ExternalLink,
  Send,
  DollarSign,
  Dumbbell,
  TrendingUp,
  Target,
  Trophy,
  Edit,
  History,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import { format, isPast, isToday, differenceInDays, subDays } from "date-fns";

interface Coach {
  id: string;
  user_id: string;
  display_name: string;
}

interface QuestionItem {
  id: string;
  type: "scale" | "text" | "yes_no";
  question: string;
}

interface ClientCheckin {
  id: string;
  client_id: string;
  template_id: string | null;
  status: string;
  responses: Record<string, unknown> | null;
  coach_comments: string | null;
  due_date: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  template?: {
    name: string;
    questions: QuestionItem[];
  };
}

interface ClientData {
  id: string;
  client_user_id: string;
  status: string;
  started_at: string;
  notes: string | null;
  service?: { name: string } | null;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    user_id: string;
  } | null;
}

interface WorkoutSession {
  id: string;
  workout_name: string;
  started_at: string;
  duration_seconds: number | null;
  total_volume: number | null;
  status: string;
}

interface Invoice {
  id: string;
  invoice_number: string | null;
  amount: number;
  status: string;
  due_date: string | null;
  created_at: string;
}

interface Appointment {
  id: string;
  start_time: string;
  duration_minutes: number;
  appointment_type: string;
  meeting_link: string | null;
  status: string;
}

export default function CheckinReviewWorkspace() {
  const { clientId, checkinId } = useParams<{ clientId: string; checkinId: string }>();
  const navigate = useNavigate();
  const { coach } = useOutletContext<{ coach: Coach }>();

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<ClientData | null>(null);
  const [checkin, setCheckin] = useState<ClientCheckin | null>(null);
  const [checkinHistory, setCheckinHistory] = useState<ClientCheckin[]>([]);
  const [coachComment, setCoachComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("checkin");

  // Progress data
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [workoutStats, setWorkoutStats] = useState({ completed7d: 0, completed30d: 0, streakDays: 0 });
  const [planAssignment, setPlanAssignment] = useState<any>(null);

  // Billing data
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [billingStats, setBillingStats] = useState({ outstanding: 0, lastPayment: null as string | null, totalRevenue: 0 });

  // Appointment data
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [compareCheckinId, setCompareCheckinId] = useState<string | null>(null);
  const [compareCheckin, setCompareCheckin] = useState<ClientCheckin | null>(null);

  useEffect(() => {
    if (coach?.id && clientId) {
      fetchData();
    }
  }, [coach?.id, clientId, checkinId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch client with profile and service
      const { data: clientData, error: clientError } = await supabase
        .from("coach_clients")
        .select("*, service:service_id(name)")
        .eq("id", clientId)
        .eq("coach_id", coach.id)
        .single();

      if (clientError) throw clientError;

      // Fetch profile separately
      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, user_id")
        .eq("user_id", clientData.client_user_id)
        .single();

      setClient({ ...clientData, profile: profileData });

      // Fetch the specific check-in or latest
      if (checkinId) {
        const { data: checkinData } = await supabase
          .from("client_checkins")
          .select("*, template:checkin_templates(name, questions)")
          .eq("id", checkinId)
          .single();
        
        setCheckin(checkinData as unknown as ClientCheckin);
        setCoachComment(checkinData?.coach_comments || "");
      } else {
        // Get latest check-in for this client
        const { data: latestCheckin } = await supabase
          .from("client_checkins")
          .select("*, template:checkin_templates(name, questions)")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (latestCheckin) {
          setCheckin(latestCheckin as unknown as ClientCheckin);
          setCoachComment(latestCheckin?.coach_comments || "");
        }
      }

      // Fetch check-in history
      const { data: historyData } = await supabase
        .from("client_checkins")
        .select("*, template:checkin_templates(name, questions)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(20);

      setCheckinHistory((historyData as unknown as ClientCheckin[]) || []);

      // Fetch workout sessions
      const thirtyDaysAgo = subDays(new Date(), 30);
      const { data: sessions } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", clientData.client_user_id)
        .gte("started_at", thirtyDaysAgo.toISOString())
        .order("started_at", { ascending: false });

      setRecentSessions((sessions || []).slice(0, 5) as WorkoutSession[]);

      const completed = (sessions || []).filter((s: any) => s.status === "completed");
      const sevenDaysAgo = subDays(new Date(), 7);
      const completed7d = completed.filter((s: any) => new Date(s.started_at) >= sevenDaysAgo).length;

      setWorkoutStats({
        completed7d,
        completed30d: completed.length,
        streakDays: 0, // Would need more complex calculation
      });

      // Fetch plan assignment
      const { data: assignment } = await supabase
        .from("client_plan_assignments")
        .select("*, training_plans(name, duration_weeks)")
        .eq("client_id", clientId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setPlanAssignment(assignment);

      // Fetch invoices
      const { data: invoicesData } = await supabase
        .from("coach_invoices")
        .select("*")
        .eq("coach_id", coach.id)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(10);

      setInvoices((invoicesData || []) as Invoice[]);

      const outstanding = (invoicesData || [])
        .filter((i: any) => i.status === "sent" || i.status === "draft")
        .reduce((sum: number, i: any) => sum + (i.amount || 0), 0);

      const paidInvoices = (invoicesData || []).filter((i: any) => i.status === "paid");
      const lastPayment = paidInvoices.length > 0 ? paidInvoices[0].paid_at : null;
      const totalRevenue = paidInvoices.reduce((sum: number, i: any) => sum + (i.amount || 0), 0);

      setBillingStats({ outstanding, lastPayment, totalRevenue });

      // Fetch next appointment
      const { data: nextApt } = await supabase
        .from("coach_appointments")
        .select("*")
        .eq("coach_id", coach.id)
        .eq("client_id", clientId)
        .eq("status", "scheduled")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(1)
        .single();

      setNextAppointment(nextApt as Appointment | null);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load check-in data");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveComment = async () => {
    if (!checkin) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("client_checkins")
        .update({ 
          coach_comments: coachComment || null,
          status: "reviewed",
          reviewed_at: new Date().toISOString()
        })
        .eq("id", checkin.id);

      if (error) throw error;

      toast.success("Check-in reviewed!");
      fetchData();
    } catch (error) {
      console.error("Error saving comment:", error);
      toast.error("Failed to save comment");
    } finally {
      setSaving(false);
    }
  };

  const handleCompareSelect = async (id: string) => {
    if (id === checkin?.id) return;
    setCompareCheckinId(id);

    const { data } = await supabase
      .from("client_checkins")
      .select("*, template:checkin_templates(name, questions)")
      .eq("id", id)
      .single();

    setCompareCheckin(data as unknown as ClientCheckin);
  };

  const openMessaging = () => {
    navigate(`/coach-portal/inbox?client=${client?.client_user_id}`);
  };

  const joinMeeting = () => {
    if (nextAppointment?.meeting_link) {
      window.open(nextAppointment.meeting_link, "_blank");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "reviewed": return <Badge className="bg-green-500/10 text-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Reviewed</Badge>;
      case "submitted": return <Badge className="bg-blue-500/10 text-blue-500">Submitted</Badge>;
      default: return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const renderAnswerValue = (type: string, value: unknown) => {
    if (value === null || value === undefined) return <span className="text-muted-foreground italic">No answer</span>;
    
    if (type === "scale") {
      const num = Number(value);
      return (
        <div className="flex items-center gap-2">
          <Progress value={num * 10} className="w-24 h-2" />
          <span className="font-medium">{num}/10</span>
        </div>
      );
    }
    if (type === "yes_no") {
      return value === true || value === "yes" 
        ? <Badge className="bg-green-500/10 text-green-500">Yes</Badge>
        : <Badge variant="secondary">No</Badge>;
    }
    return <span>{String(value)}</span>;
  };

  const renderCompareValue = (questionId: string, type: string) => {
    if (!compareCheckin?.responses) return null;
    const value = compareCheckin.responses[questionId];
    return renderAnswerValue(type, value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Client not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/coach-portal/checkins")}>
          <ChevronLeft className="w-4 h-4 mr-2" /> Back to Check-ins
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/coach-portal/checkins")}>
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Check-ins
      </Button>

      {/* Client Context Header */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={client.profile?.avatar_url || undefined} />
                <AvatarFallback>{(client.profile?.display_name || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{client.profile?.display_name || "Unknown"}</h2>
                  <Badge variant={client.status === "active" ? "default" : "secondary"}>
                    {client.status}
                  </Badge>
                </div>
                {client.service && (
                  <p className="text-sm text-muted-foreground">{client.service.name}</p>
                )}
                {nextAppointment && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    Next: {format(new Date(nextAppointment.start_time), "MMM d, h:mm a")}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={openMessaging}>
                <MessageSquare className="w-4 h-4 mr-2" /> Message
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/coach-portal/plans`)}>
                <FileText className="w-4 h-4 mr-2" /> Plans
              </Button>
              {nextAppointment?.meeting_link ? (
                <Button size="sm" onClick={joinMeeting}>
                  <Video className="w-4 h-4 mr-2" /> Join Meeting
                </Button>
              ) : nextAppointment ? (
                <Button size="sm" variant="secondary" disabled>
                  <Video className="w-4 h-4 mr-2" /> No Meeting Link
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="checkin">Check-in</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Check-in Tab */}
        <TabsContent value="checkin" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main Check-in Panel */}
            <div className="lg:col-span-2 space-y-4">
              {checkin ? (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{checkin.template?.name || "Check-in"}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {checkin.due_date && `Due: ${format(new Date(checkin.due_date), "MMM d, yyyy")}`}
                          {checkin.submitted_at && ` • Submitted: ${format(new Date(checkin.submitted_at), "MMM d, h:mm a")}`}
                        </p>
                      </div>
                      {getStatusBadge(checkin.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Toggle compare mode */}
                    <div className="flex items-center justify-between">
                      <Button 
                        variant={compareMode ? "default" : "outline"} 
                        size="sm"
                        onClick={() => setCompareMode(!compareMode)}
                      >
                        <ArrowLeftRight className="w-4 h-4 mr-2" />
                        {compareMode ? "Exit Compare" : "Compare"}
                      </Button>
                      {compareMode && (
                        <select 
                          className="text-sm border rounded px-2 py-1 bg-background"
                          value={compareCheckinId || ""}
                          onChange={e => handleCompareSelect(e.target.value)}
                        >
                          <option value="">Select to compare...</option>
                          {checkinHistory
                            .filter(h => h.id !== checkin.id && h.status === "submitted" || h.status === "reviewed")
                            .map(h => (
                              <option key={h.id} value={h.id}>
                                {format(new Date(h.created_at), "MMM d, yyyy")} - {h.template?.name || "Check-in"}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>

                    <Separator />

                    {/* Questions and Answers */}
                    <div className="space-y-4">
                      {(checkin.template?.questions || []).map((q, idx) => (
                        <div key={q.id} className="space-y-2">
                          <p className="font-medium text-sm">{idx + 1}. {q.question}</p>
                          <div className={compareMode && compareCheckin ? "grid grid-cols-2 gap-4" : ""}>
                            <div>
                              {compareMode && <p className="text-xs text-muted-foreground mb-1">Current</p>}
                              {renderAnswerValue(q.type, checkin.responses?.[q.id])}
                            </div>
                            {compareMode && compareCheckin && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">
                                  {format(new Date(compareCheckin.created_at), "MMM d")}
                                </p>
                                {renderCompareValue(q.id, q.type)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Coach Comments */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Coach Comments</label>
                      <Textarea
                        value={coachComment}
                        onChange={e => setCoachComment(e.target.value)}
                        placeholder="Add your feedback for the client..."
                        rows={4}
                      />
                      <Button onClick={handleSaveComment} disabled={saving} className="w-full md:w-auto">
                        <Send className="w-4 h-4 mr-2" />
                        {saving ? "Saving..." : checkin.status === "reviewed" ? "Update Review" : "Mark as Reviewed"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No check-in found for this client</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* History Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="w-4 h-4" /> Check-in History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {checkinHistory.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No history</p>
                      ) : (
                        checkinHistory.map(h => (
                          <div
                            key={h.id}
                            className={`p-2 rounded-lg cursor-pointer transition-colors ${
                              h.id === checkin?.id ? "bg-primary/10 border border-primary" : "hover:bg-muted"
                            }`}
                            onClick={() => navigate(`/coach-portal/checkins/${clientId}/${h.id}`)}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium truncate">{h.template?.name || "Check-in"}</p>
                              {getStatusBadge(h.status)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(h.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Dumbbell className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{workoutStats.completed7d}</p>
                    <p className="text-sm text-muted-foreground">Workouts (7d)</p>
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
                    <p className="text-2xl font-bold">{workoutStats.completed30d}</p>
                    <p className="text-sm text-muted-foreground">Workouts (30d)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{planAssignment?.progress_percentage || 0}%</p>
                    <p className="text-sm text-muted-foreground">Plan Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Plan Assignment */}
          {planAssignment && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Active Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{planAssignment.training_plans?.name}</span>
                  <span className="text-sm text-muted-foreground">
                    Week {planAssignment.current_week || 1} / {planAssignment.training_plans?.duration_weeks || "?"}
                  </span>
                </div>
                <Progress value={planAssignment.progress_percentage || 0} className="h-2" />
              </CardContent>
            </Card>
          )}

          {/* Recent Workouts */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent Workouts</CardTitle>
            </CardHeader>
            <CardContent>
              {recentSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No recent workouts</p>
              ) : (
                <div className="space-y-2">
                  {recentSessions.map(session => (
                    <div key={session.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Dumbbell className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{session.workout_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(session.started_at), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                      <Badge variant={session.status === "completed" ? "default" : "secondary"}>
                        {session.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(billingStats.outstanding)}</p>
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(billingStats.totalRevenue)}</p>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {billingStats.lastPayment ? format(new Date(billingStats.lastPayment), "MMM d") : "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">Last Payment</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Service Info */}
          {client.service && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Current Service</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{client.service.name}</p>
              </CardContent>
            </Card>
          )}

          {/* Invoices */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No invoices</p>
              ) : (
                <div className="space-y-2">
                  {invoices.map(invoice => (
                    <div key={invoice.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div>
                        <p className="font-medium text-sm">{invoice.invoice_number || "Invoice"}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(invoice.created_at), "MMM d, yyyy")}
                          {invoice.due_date && ` • Due: ${format(new Date(invoice.due_date), "MMM d")}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                        <Badge 
                          variant={invoice.status === "paid" ? "default" : invoice.status === "void" ? "destructive" : "secondary"}
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
