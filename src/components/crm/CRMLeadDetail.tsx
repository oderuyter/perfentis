import { useState, useEffect } from "react";
import { 
  X, 
  Mail, 
  Phone, 
  User, 
  Calendar, 
  Clock, 
  MessageSquare,
  Plus,
  Check,
  ChevronDown,
  Edit2,
  Send,
  ExternalLink,
  Globe,
  Instagram,
  MapPin,
  Building2,
  Trash2,
  FileText
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  CRMLead, 
  PipelineStage, 
  CRMNote, 
  CRMTask, 
  CRMActivity,
  CRMTaskTemplate,
  useCRMLeadDetail,
  useCRMTaskTemplates
} from "@/hooks/useCRM";
import { useMessages } from "@/hooks/useMessages";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface CRMLeadDetailProps {
  lead: CRMLead | null;
  stages: PipelineStage[];
  open: boolean;
  onClose: () => void;
  onUpdate: (leadId: string, updates: Partial<CRMLead>) => Promise<void>;
  onMoveToStage: (leadId: string, stageId: string) => Promise<void>;
  onConvert: (leadId: string, status: 'won' | 'lost') => Promise<void>;
  staffMembers?: Array<{ user_id: string; display_name: string | null }>;
  contextType?: 'gym' | 'coach' | 'event';
  contextId?: string;
}

export function CRMLeadDetail({
  lead,
  stages,
  open,
  onClose,
  onUpdate,
  onMoveToStage,
  onConvert,
  staffMembers = [],
  contextType = 'gym',
  contextId,
}: CRMLeadDetailProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [newNote, setNewNote] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);

  const {
    notes,
    tasks,
    activities,
    addNote,
    createTask,
    completeTask,
    deleteTask,
    applyTaskTemplate,
    refetchNotes,
    refetchTasks,
    refetchActivities,
  } = useCRMLeadDetail(lead?.id || null);

  const { templates } = useCRMTaskTemplates(contextType, contextId || null);

  const {
    messages,
    sendMessage,
    isSending,
  } = useMessages(lead?.conversation_id || null);

  const handleAddNote = async () => {
    if (!newNote.trim() || !lead) return;
    
    setIsAddingNote(true);
    try {
      await addNote(newNote.trim());
      setNewNote("");
      toast.success("Note added");
    } catch (error) {
      toast.error("Failed to add note");
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !lead?.conversation_id) return;
    
    try {
      await sendMessage(messageInput.trim());
      setMessageInput("");
      
      // Update last_contacted_at
      await onUpdate(lead.id, { last_contacted_at: new Date().toISOString() });
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTask(taskId);
      toast.success("Task completed");
    } catch (error) {
      toast.error("Failed to complete task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast.success("Task deleted");
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  const handleApplyTemplate = async (template: CRMTaskTemplate) => {
    try {
      await applyTaskTemplate(template);
      toast.success(`Template "${template.name}" applied`);
    } catch (error) {
      toast.error("Failed to apply template");
    }
  };

  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 border-b">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <SheetTitle className="flex items-center gap-2">
                {lead.lead_name}
                {lead.is_registered_user && (
                  <Badge variant="secondary" className="text-xs">
                    <User className="h-3 w-3 mr-1" />
                    Registered
                  </Badge>
                )}
              </SheetTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-primary">
                    <Mail className="h-3 w-3" />
                    {lead.email}
                  </a>
                )}
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-primary">
                    <Phone className="h-3 w-3" />
                    {lead.phone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Stage & Status Controls */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Select
              value={lead.stage_id || ""}
              onValueChange={(value) => onMoveToStage(lead.id, value)}
            >
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.stage_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={lead.assigned_to_user_id || "unassigned"}
              onValueChange={(value) => onUpdate(lead.id, { 
                assigned_to_user_id: value === "unassigned" ? null : value 
              })}
            >
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue placeholder="Assign to" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {staffMembers.map((staff) => (
                  <SelectItem key={staff.user_id} value={staff.user_id}>
                    {staff.display_name || 'Staff Member'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {lead.status === 'open' && (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => onConvert(lead.id, 'won')}
                >
                  Mark Won
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onConvert(lead.id, 'lost')}
                >
                  Mark Lost
                </Button>
              </>
            )}

            {lead.status !== 'open' && (
              <Badge 
                variant={lead.status === 'won' ? 'default' : 'destructive'}
                className={cn(
                  lead.status === 'won' && "bg-green-500"
                )}
              >
                {lead.status.toUpperCase()}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-5 mx-4 mt-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="messages">
              Messages
              {lead.conversation_id && messages.length > 0 && (
                <span className="ml-1 text-xs">({messages.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tasks">
              Tasks
              {tasks.filter(t => t.status === 'open').length > 0 && (
                <span className="ml-1 text-xs">({tasks.filter(t => t.status === 'open').length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            {/* Overview Tab */}
            <TabsContent value="overview" className="h-full m-0 p-4 overflow-y-auto">
              <div className="space-y-6">
                {/* Contact Info */}
                <div>
                  <h3 className="font-medium mb-3">Contact Information</h3>
                  <div className="grid gap-3 text-sm">
                    {lead.contact_telephone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{lead.contact_telephone}</span>
                      </div>
                    )}
                    {lead.contact_website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a href={lead.contact_website} target="_blank" rel="noopener" className="text-primary hover:underline">
                          {lead.contact_website}
                        </a>
                      </div>
                    )}
                    {lead.contact_instagram && (
                      <div className="flex items-center gap-2">
                        <Instagram className="h-4 w-4 text-muted-foreground" />
                        <span>@{lead.contact_instagram}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Addresses */}
                {(lead.home_address_line1 || lead.work_address_line1) && (
                  <div>
                    <h3 className="font-medium mb-3">Addresses</h3>
                    <div className="grid gap-4 text-sm">
                      {lead.home_address_line1 && (
                        <div>
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <MapPin className="h-4 w-4" />
                            <span className="font-medium">Home</span>
                          </div>
                          <p>{lead.home_address_line1}</p>
                          {lead.home_address_line2 && <p>{lead.home_address_line2}</p>}
                          <p>
                            {[lead.home_address_city, lead.home_address_postcode, lead.home_address_country]
                              .filter(Boolean).join(", ")}
                          </p>
                        </div>
                      )}
                      {lead.work_address_line1 && (
                        <div>
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Building2 className="h-4 w-4" />
                            <span className="font-medium">
                              Work {lead.work_company && `- ${lead.work_company}`}
                            </span>
                          </div>
                          <p>{lead.work_address_line1}</p>
                          {lead.work_address_line2 && <p>{lead.work_address_line2}</p>}
                          <p>
                            {[lead.work_address_city, lead.work_address_postcode, lead.work_address_country]
                              .filter(Boolean).join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Lead Details */}
                <div>
                  <h3 className="font-medium mb-3">Lead Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Source</span>
                      <p className="capitalize">{lead.source}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created</span>
                      <p>{format(new Date(lead.created_at), "PPP")}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last Contacted</span>
                      <p>
                        {lead.last_contacted_at 
                          ? formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true })
                          : "Never"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status</span>
                      <p className="capitalize">{lead.status}</p>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {lead.tags && lead.tags.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {lead.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Messages Tab */}
            <TabsContent value="messages" className="h-full m-0 flex flex-col overflow-hidden">
              {lead.conversation_id ? (
                <>
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isMe = message.sender_user_id === user?.id;
                        return (
                          <div
                            key={message.id}
                            className={cn(
                              "flex",
                              isMe ? "justify-end" : "justify-start"
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-[80%] rounded-lg px-3 py-2",
                                isMe 
                                  ? "bg-primary text-primary-foreground" 
                                  : "bg-muted",
                                message.is_system_message && "bg-muted/50 italic text-center w-full text-sm text-muted-foreground"
                              )}
                            >
                              {!message.is_system_message && !isMe && (
                                <p className="text-xs font-medium mb-1">
                                  {message.sender?.display_name || 'User'}
                                </p>
                              )}
                              <p className="text-sm">{message.body_text}</p>
                              <p className={cn(
                                "text-xs mt-1",
                                isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}>
                                {format(new Date(message.created_at), "p")}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        disabled={isSending}
                      />
                      <Button onClick={handleSendMessage} disabled={isSending || !messageInput.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No conversation linked to this lead</p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="h-full m-0 p-4 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex justify-between items-center gap-2">
                  <h3 className="font-medium">Tasks & Follow-ups</h3>
                  <div className="flex gap-2">
                    {templates.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-1" />
                            Templates
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {templates.map((template) => (
                            <DropdownMenuItem
                              key={template.id}
                              onClick={() => handleApplyTemplate(template)}
                            >
                              {template.name} ({template.tasks.length} tasks)
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <CreateTaskDialog 
                      leadId={lead.id} 
                      onCreate={createTask}
                      staffMembers={staffMembers}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {tasks.filter(t => t.status === 'open').map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 border rounded-lg group"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 mt-0.5"
                        onClick={() => handleCompleteTask(task.id)}
                      >
                        <div className="h-4 w-4 border rounded-full" />
                      </Button>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{task.title}</p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs capitalize">
                            {task.task_type}
                          </Badge>
                          {task.due_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(task.due_at), "PPp")}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {tasks.filter(t => t.status === 'open').length === 0 && (
                    <p className="text-center py-8 text-muted-foreground text-sm">
                      No open tasks
                    </p>
                  )}

                  {/* Completed tasks */}
                  {tasks.filter(t => t.status === 'done').length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <h4 className="text-sm text-muted-foreground mb-2">Completed</h4>
                      {tasks.filter(t => t.status === 'done').map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 p-3 border rounded-lg opacity-60"
                        >
                          <Check className="h-4 w-4 text-green-500 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm line-through">{task.title}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="h-full m-0 p-4 overflow-y-auto">
              <div className="space-y-4">
                {/* Add note */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add an internal note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                  />
                  <Button 
                    size="sm" 
                    onClick={handleAddNote}
                    disabled={isAddingNote || !newNote.trim()}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Note
                  </Button>
                </div>

                <Separator />

                {/* Notes list */}
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {note.author?.display_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {note.author?.display_name || 'Staff'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                    </div>
                  ))}

                  {notes.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground text-sm">
                      No notes yet
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="h-full m-0 p-4 overflow-y-auto">
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div>
                      <p>{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.actor?.display_name || 'System'} • {" "}
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}

                {activities.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground text-sm">
                    No activity yet
                  </p>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// Create Task Dialog
function CreateTaskDialog({ 
  leadId, 
  onCreate,
  staffMembers,
}: { 
  leadId: string;
  onCreate: (data: {
    title: string;
    task_type: 'call' | 'message' | 'follow-up' | 'meeting' | 'other';
    description?: string;
    due_at?: string;
    assigned_to_user_id?: string;
  }) => Promise<void>;
  staffMembers: Array<{ user_id: string; display_name: string | null }>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState<'call' | 'message' | 'follow-up' | 'meeting' | 'other'>('follow-up');
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    
    setIsCreating(true);
    try {
      await onCreate({
        title: title.trim(),
        task_type: taskType,
        description: description.trim() || undefined,
        due_at: dueDate || undefined,
        assigned_to_user_id: assignee || undefined,
      });
      setOpen(false);
      setTitle("");
      setDescription("");
      setDueDate("");
      setAssignee("");
      toast.success("Task created");
    } catch (error) {
      toast.error("Failed to create task");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select value={taskType} onValueChange={(v) => setTaskType(v as typeof taskType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="follow-up">Follow-up</SelectItem>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="message">Message</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Due Date (optional)</label>
            <Input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Assign To (optional)</label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {staffMembers.map((staff) => (
                  <SelectItem key={staff.user_id} value={staff.user_id}>
                    {staff.display_name || 'Staff Member'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isCreating || !title.trim()}>
            Create Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
