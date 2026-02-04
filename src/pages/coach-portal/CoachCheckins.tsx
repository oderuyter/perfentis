import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, Plus, Eye, MessageSquare, Clock, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format, isPast, isToday, differenceInDays } from "date-fns";

interface Coach {
  id: string;
  user_id: string;
  display_name: string;
}

interface CheckinTemplate {
  id: string;
  coach_id: string;
  name: string;
  description: string | null;
  questions: QuestionItem[];
  frequency: string | null;
  is_active: boolean;
  created_at: string;
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
  client?: {
    id: string;
    profiles?: {
      display_name: string | null;
    };
  };
  template?: {
    name: string;
  };
}

interface Client {
  id: string;
  client_user_id: string;
  status: string;
  profiles?: {
    display_name: string | null;
  };
}

export default function CoachCheckins() {
  const { coach } = useOutletContext<{ coach: Coach }>();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<CheckinTemplate[]>([]);
  const [checkins, setCheckins] = useState<ClientCheckin[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedCheckin, setSelectedCheckin] = useState<ClientCheckin | null>(null);
  const [coachComment, setCoachComment] = useState("");
  
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    frequency: "weekly",
    questions: [{ id: crypto.randomUUID(), type: "text" as const, question: "" }]
  });

  const [assignForm, setAssignForm] = useState({
    client_id: "",
    template_id: "",
    due_date: ""
  });

  useEffect(() => {
    if (coach?.id) {
      fetchData();
    }
  }, [coach?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch templates
      const { data: templatesData } = await supabase
        .from("checkin_templates")
        .select("*")
        .eq("coach_id", coach.id)
        .order("created_at", { ascending: false });

      // Fetch clients
      const { data: clientsData } = await supabase
        .from("coach_clients")
        .select("id, client_user_id, status")
        .eq("coach_id", coach.id)
        .eq("status", "active");

      // Fetch client profiles
      if (clientsData && clientsData.length > 0) {
        const clientUserIds = clientsData.map(c => c.client_user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", clientUserIds);

        const clientsWithProfiles = clientsData.map(client => ({
          ...client,
          profiles: profilesData?.find(p => p.user_id === client.client_user_id)
        }));
        setClients(clientsWithProfiles);
      }

      // Fetch check-ins
      const { data: checkinsData } = await supabase
        .from("client_checkins")
        .select(`
          *,
          template:checkin_templates(name)
        `)
        .in("client_id", clientsData?.map(c => c.id) || [])
        .order("created_at", { ascending: false });

      // Add client info to checkins
      if (checkinsData && clientsData) {
        const checkinsWithClients = checkinsData.map(checkin => ({
          ...checkin,
          client: clientsData.find(c => c.id === checkin.client_id)
        }));
        
        // Fetch profiles for checkin clients
        const clientUserIds = clientsData.map(c => c.client_user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", clientUserIds);

        const checkinsWithProfiles = checkinsWithClients.map(checkin => ({
          ...checkin,
          client: {
            ...checkin.client,
            profiles: profilesData?.find(p => p.user_id === checkin.client?.client_user_id)
          }
        }));
        
        setCheckins(checkinsWithProfiles as ClientCheckin[]);
      }

      setTemplates((templatesData as unknown as CheckinTemplate[]) || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateForm.name.trim() || templateForm.questions.every(q => !q.question.trim())) {
      toast.error("Please fill in template name and at least one question");
      return;
    }

    try {
      const { error } = await supabase.from("checkin_templates").insert({
        coach_id: coach.id,
        name: templateForm.name,
        description: templateForm.description || null,
        frequency: templateForm.frequency,
        questions: templateForm.questions.filter(q => q.question.trim())
      });

      if (error) throw error;
      
      toast.success("Template created!");
      setTemplateDialogOpen(false);
      setTemplateForm({
        name: "",
        description: "",
        frequency: "weekly",
        questions: [{ id: crypto.randomUUID(), type: "text", question: "" }]
      });
      fetchData();
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error("Failed to create template");
    }
  };

  const handleAssignCheckin = async () => {
    if (!assignForm.client_id || !assignForm.template_id) {
      toast.error("Please select a client and template");
      return;
    }

    try {
      const { error } = await supabase.from("client_checkins").insert({
        client_id: assignForm.client_id,
        template_id: assignForm.template_id,
        due_date: assignForm.due_date || null,
        status: "pending"
      });

      if (error) throw error;
      
      toast.success("Check-in assigned!");
      setAssignDialogOpen(false);
      setAssignForm({ client_id: "", template_id: "", due_date: "" });
      fetchData();
    } catch (error) {
      console.error("Error assigning check-in:", error);
      toast.error("Failed to assign check-in");
    }
  };

  const handleReviewCheckin = async (status: "reviewed" | "pending") => {
    if (!selectedCheckin) return;

    try {
      const { error } = await supabase
        .from("client_checkins")
        .update({
          status,
          coach_comments: coachComment || null,
          reviewed_at: status === "reviewed" ? new Date().toISOString() : null
        })
        .eq("id", selectedCheckin.id);

      if (error) throw error;
      
      toast.success(status === "reviewed" ? "Check-in reviewed!" : "Marked as pending");
      setReviewDialogOpen(false);
      setSelectedCheckin(null);
      setCoachComment("");
      fetchData();
    } catch (error) {
      console.error("Error reviewing check-in:", error);
      toast.error("Failed to update check-in");
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from("checkin_templates")
        .update({ is_active: false })
        .eq("id", templateId);

      if (error) throw error;
      toast.success("Template deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const addQuestion = () => {
    setTemplateForm(prev => ({
      ...prev,
      questions: [...prev.questions, { id: crypto.randomUUID(), type: "text", question: "" }]
    }));
  };

  const updateQuestion = (id: string, field: string, value: string) => {
    setTemplateForm(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === id ? { ...q, [field]: value } : q
      )
    }));
  };

  const removeQuestion = (id: string) => {
    setTemplateForm(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id)
    }));
  };

  const getStatusBadge = (checkin: ClientCheckin) => {
    if (checkin.status === "reviewed") {
      return <Badge className="bg-green-500/10 text-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Reviewed</Badge>;
    }
    if (checkin.status === "submitted") {
      return <Badge className="bg-blue-500/10 text-blue-500"><Eye className="w-3 h-3 mr-1" />Submitted</Badge>;
    }
    if (checkin.due_date && isPast(new Date(checkin.due_date)) && !isToday(new Date(checkin.due_date))) {
      const daysOverdue = differenceInDays(new Date(), new Date(checkin.due_date));
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />{daysOverdue}d overdue</Badge>;
    }
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  const pendingCheckins = checkins.filter(c => c.status === "pending" || c.status === "submitted");
  const reviewedCheckins = checkins.filter(c => c.status === "reviewed");
  const overdueCheckins = checkins.filter(c => 
    c.status === "pending" && c.due_date && isPast(new Date(c.due_date)) && !isToday(new Date(c.due_date))
  );

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Check-ins</h2>
        <div className="flex gap-2">
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={clients.length === 0 || templates.filter(t => t.is_active).length === 0}>
                <ClipboardCheck className="w-4 h-4 mr-2" />Assign Check-in
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Check-in</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select value={assignForm.client_id} onValueChange={v => setAssignForm(p => ({ ...p, client_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.profiles?.display_name || "Unknown Client"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select value={assignForm.template_id} onValueChange={v => setAssignForm(p => ({ ...p, template_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                    <SelectContent>
                      {templates.filter(t => t.is_active).map(template => (
                        <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date (optional)</Label>
                  <Input type="date" value={assignForm.due_date} onChange={e => setAssignForm(p => ({ ...p, due_date: e.target.value }))} />
                </div>
                <Button onClick={handleAssignCheckin} className="w-full">Assign Check-in</Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />New Template</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Check-in Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input value={templateForm.name} onChange={e => setTemplateForm(p => ({ ...p, name: e.target.value }))} placeholder="Weekly Progress Check-in" />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea value={templateForm.description} onChange={e => setTemplateForm(p => ({ ...p, description: e.target.value }))} placeholder="What this check-in is for..." />
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={templateForm.frequency} onValueChange={v => setTemplateForm(p => ({ ...p, frequency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>Questions</Label>
                  {templateForm.questions.map((q, idx) => (
                    <div key={q.id} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-2">
                        <Input value={q.question} onChange={e => updateQuestion(q.id, "question", e.target.value)} placeholder={`Question ${idx + 1}`} />
                        <Select value={q.type} onValueChange={v => updateQuestion(q.id, "type", v)}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="scale">Scale (1-10)</SelectItem>
                            <SelectItem value="yes_no">Yes/No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {templateForm.questions.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" onClick={addQuestion} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />Add Question
                  </Button>
                </div>
                <Button onClick={handleCreateTemplate} className="w-full">Create Template</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{pendingCheckins.length}</div>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{overdueCheckins.length}</div>
            <p className="text-sm text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{reviewedCheckins.length}</div>
            <p className="text-sm text-muted-foreground">Reviewed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{templates.filter(t => t.is_active).length}</div>
            <p className="text-sm text-muted-foreground">Active Templates</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingCheckins.length})</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed ({reviewedCheckins.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({templates.filter(t => t.is_active).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingCheckins.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-1">No pending check-ins</h3>
                <p className="text-sm text-muted-foreground">Assign check-ins to your clients to get started</p>
              </CardContent>
            </Card>
          ) : (
            pendingCheckins.map(checkin => (
              <Card key={checkin.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{checkin.client?.profiles?.display_name || "Unknown Client"}</p>
                    <p className="text-sm text-muted-foreground">{checkin.template?.name || "Custom Check-in"}</p>
                    {checkin.due_date && (
                      <p className="text-xs text-muted-foreground mt-1">Due: {format(new Date(checkin.due_date), "MMM d, yyyy")}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(checkin)}
                    <Button variant="outline" size="sm" onClick={() => navigate(`/coach-portal/checkins/${checkin.client_id}/${checkin.id}`)}>
                      <Eye className="w-4 h-4 mr-1" />Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="reviewed" className="space-y-4">
          {reviewedCheckins.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">No reviewed check-ins yet</p>
              </CardContent>
            </Card>
          ) : (
            reviewedCheckins.map(checkin => (
              <Card 
                key={checkin.id} 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/coach-portal/checkins/${checkin.client_id}/${checkin.id}`)}
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{checkin.client?.profiles?.display_name || "Unknown Client"}</p>
                    <p className="text-sm text-muted-foreground">{checkin.template?.name || "Custom Check-in"}</p>
                    {checkin.reviewed_at && (
                      <p className="text-xs text-muted-foreground mt-1">Reviewed: {format(new Date(checkin.reviewed_at), "MMM d, yyyy")}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(checkin)}
                    {checkin.coach_comments && <MessageSquare className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          {templates.filter(t => t.is_active).length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-1">No templates yet</h3>
                <p className="text-sm text-muted-foreground">Create a check-in template to get started</p>
              </CardContent>
            </Card>
          ) : (
            templates.filter(t => t.is_active).map(template => (
              <Card key={template.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{template.frequency}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => deleteTemplate(template.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {template.description && <p className="text-sm text-muted-foreground mb-2">{template.description}</p>}
                  <p className="text-sm">{template.questions?.length || 0} questions</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Check-in</DialogTitle>
          </DialogHeader>
          {selectedCheckin && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{selectedCheckin.client?.profiles?.display_name}</p>
                <p className="text-sm text-muted-foreground">{selectedCheckin.template?.name}</p>
              </div>
              
              {selectedCheckin.responses && (
                <div className="space-y-2 p-3 bg-muted rounded-lg">
                  <p className="font-medium text-sm">Client Responses:</p>
                  <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(selectedCheckin.responses, null, 2)}</pre>
                </div>
              )}

              <div className="space-y-2">
                <Label>Coach Comments</Label>
                <Textarea 
                  value={coachComment} 
                  onChange={e => setCoachComment(e.target.value)} 
                  placeholder="Add feedback for your client..."
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={() => handleReviewCheckin("reviewed")} className="flex-1">
                  <CheckCircle2 className="w-4 h-4 mr-2" />Mark Reviewed
                </Button>
                {selectedCheckin.status === "reviewed" && (
                  <Button variant="outline" onClick={() => handleReviewCheckin("pending")}>
                    Reopen
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
