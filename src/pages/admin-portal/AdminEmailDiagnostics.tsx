import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Mail, Send, CheckCircle, XCircle, AlertTriangle, RefreshCw, 
  Search, Clock, ArrowRight, ExternalLink, Activity, Shield, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendTestEmail, checkEmailHealth, retryEmail, EmailHealthCheck } from "@/lib/emailService";
import { format, formatDistanceToNow } from "date-fns";

interface EmailLog {
  id: string;
  to_email: string;
  template_key: string;
  subject: string;
  context_type: string | null;
  context_id: string | null;
  resend_message_id: string | null;
  status: string;
  error_code: string | null;
  error_message: string | null;
  attempt_count: number;
  last_attempt_at: string;
  created_at: string;
}

interface DeliveryEvent {
  id: string;
  email_log_id: string;
  event_type: string;
  occurred_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  sent: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  bounced: "bg-red-100 text-red-800",
  complained: "bg-orange-100 text-orange-800",
};

const TEMPLATE_OPTIONS = [
  { value: "test_email", label: "Test Email" },
  { value: "gym_invite", label: "Gym Invitation" },
  { value: "coach_invite", label: "Coach Invitation" },
  { value: "event_invite", label: "Event Invitation" },
  { value: "notification_coach", label: "Coach Notification" },
  { value: "notification_event", label: "Event Notification" },
  { value: "notification_gym", label: "Gym Notification" },
  { value: "notification_system", label: "System Notification" },
];

export default function AdminEmailDiagnostics() {
  const [health, setHealth] = useState<EmailHealthCheck | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [deliveryEvents, setDeliveryEvents] = useState<DeliveryEvent[]>([]);
  
  // Test email form
  const [testTo, setTestTo] = useState("");
  const [testTemplate, setTestTemplate] = useState("test_email");
  const [testSubject, setTestSubject] = useState("");
  const [testBody, setTestBody] = useState("");
  const [sending, setSending] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<any>(null);

  // Search/filter
  const [searchEmail, setSearchEmail] = useState("");
  const [searchMessageId, setSearchMessageId] = useState("");
  const [filterTemplate, setFilterTemplate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    loadHealth();
    loadLogs();
  }, []);

  const loadHealth = async () => {
    setHealthLoading(true);
    const result = await checkEmailHealth();
    setHealth(result);
    setHealthLoading(false);
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      let query = supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (searchEmail) {
        query = query.ilike("to_email", `%${searchEmail}%`);
      }
      if (searchMessageId) {
        query = query.ilike("resend_message_id", `%${searchMessageId}%`);
      }
      if (filterTemplate && filterTemplate !== "all") {
        query = query.eq("template_key", filterTemplate);
      }
      if (filterStatus && filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data || []) as EmailLog[]);
    } catch (err) {
      console.error("Failed to load logs:", err);
      toast.error("Failed to load email logs");
    } finally {
      setLogsLoading(false);
    }
  };

  const loadDeliveryEvents = async (logId: string) => {
    try {
      const { data, error } = await supabase
        .from("email_delivery_events")
        .select("*")
        .eq("email_log_id", logId)
        .order("occurred_at", { ascending: true });

      if (error) throw error;
      setDeliveryEvents((data || []) as DeliveryEvent[]);
    } catch (err) {
      console.error("Failed to load delivery events:", err);
    }
  };

  const handleSendTest = async () => {
    if (!testTo) {
      toast.error("Please enter a recipient email");
      return;
    }

    setSending(true);
    setLastTestResult(null);

    try {
      const result = await sendTestEmail(testTo, testSubject || undefined, testBody || undefined);
      setLastTestResult(result);

      if (result.success) {
        toast.success("Test email sent successfully!");
        loadLogs();
      } else {
        toast.error(result.error || "Failed to send test email");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send test email");
      setLastTestResult({ success: false, error: err.message });
    } finally {
      setSending(false);
    }
  };

  const handleRetry = async (logId: string) => {
    try {
      const result = await retryEmail(logId);
      if (result.success) {
        toast.success("Email resent successfully!");
        loadLogs();
      } else {
        toast.error(result.error || "Failed to resend email");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to resend email");
    }
  };

  const handleSelectLog = (log: EmailLog) => {
    setSelectedLog(log);
    loadDeliveryEvents(log.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Diagnostics</h1>
          <p className="text-muted-foreground">Test and debug email delivery</p>
        </div>
        <Button onClick={loadHealth} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Status
        </Button>
      </div>

      {/* Health Checklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <CardTitle>Health Checklist</CardTitle>
          </div>
          <CardDescription>Email service configuration status</CardDescription>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking health...
            </div>
          ) : health ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                {health.resendConfigured ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium text-sm">Resend API Key</p>
                  <p className="text-xs text-muted-foreground">
                    {health.resendConfigured ? "Configured" : "Missing"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                {health.fromEmailConfigured ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium text-sm">From Email</p>
                  <p className="text-xs text-muted-foreground">onboarding@resend.dev</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-sm">Domain Verification</p>
                  <p className="text-xs text-muted-foreground">
                    Using test mode (onboarding@resend.dev). To send to any email, 
                    <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-primary underline ml-1">
                      verify your domain
                    </a>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Last Check</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(health.timestamp), "HH:mm:ss")}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-500">
              <XCircle className="h-5 w-5" />
              Failed to check email service health
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="test" className="space-y-4">
        <TabsList>
          <TabsTrigger value="test">Send Test Email</TabsTrigger>
          <TabsTrigger value="logs">Email Logs</TabsTrigger>
          <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
        </TabsList>

        <TabsContent value="test">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  <CardTitle>Send Test Email</CardTitle>
                </div>
                <CardDescription>
                  Send a test email to verify delivery is working
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testTo">Recipient Email *</Label>
                  <Input
                    id="testTo"
                    type="email"
                    placeholder="recipient@example.com"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testTemplate">Template</Label>
                  <Select value={testTemplate} onValueChange={setTestTemplate}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_OPTIONS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testSubject">Custom Subject (optional)</Label>
                  <Input
                    id="testSubject"
                    placeholder="Override template subject..."
                    value={testSubject}
                    onChange={(e) => setTestSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testBody">Custom Body (optional)</Label>
                  <Textarea
                    id="testBody"
                    placeholder="Override template body..."
                    value={testBody}
                    onChange={(e) => setTestBody(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button 
                  onClick={handleSendTest} 
                  disabled={sending || !testTo}
                  className="w-full"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Send Test Email
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Last Test Result</CardTitle>
              </CardHeader>
              <CardContent>
                {lastTestResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      {lastTestResult.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-medium">
                        {lastTestResult.success ? "Email Sent" : "Send Failed"}
                      </span>
                    </div>
                    
                    {lastTestResult.success && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Resend Message ID:</span>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {lastTestResult.resendMessageId}
                          </code>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Email Log ID:</span>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {lastTestResult.emailLogId}
                          </code>
                        </div>
                      </div>
                    )}

                    {!lastTestResult.success && (
                      <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
                        <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                          Error: {lastTestResult.error}
                        </p>
                        {lastTestResult.errorCode && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            Code: {lastTestResult.errorCode}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No test email sent yet. Use the form to send a test.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Email Logs</CardTitle>
              <CardDescription>View and search email send history</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search by email..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search by Resend ID..."
                    value={searchMessageId}
                    onChange={(e) => setSearchMessageId(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={filterTemplate} onValueChange={setFilterTemplate}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All templates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All templates</SelectItem>
                    {TEMPLATE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="bounced">Bounced</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={loadLogs} variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {/* Logs Table */}
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No email logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow 
                          key={log.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSelectLog(log)}
                        >
                          <TableCell className="text-sm">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{log.to_email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.template_key}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">
                            {log.subject}
                          </TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLORS[log.status] || ""}>
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.status === "failed" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRetry(log.id);
                                }}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Retry
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Selected Log Details */}
              {selectedLog && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Email Details</h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedLog(null)}
                    >
                      Close
                    </Button>
                  </div>
                  <div className="grid gap-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-muted-foreground">To:</span>{" "}
                        <span className="font-mono">{selectedLog.to_email}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Template:</span>{" "}
                        {selectedLog.template_key}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Subject:</span>{" "}
                        {selectedLog.subject}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>{" "}
                        <Badge className={STATUS_COLORS[selectedLog.status] || ""}>
                          {selectedLog.status}
                        </Badge>
                      </div>
                      {selectedLog.resend_message_id && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Resend ID:</span>{" "}
                          <code className="bg-muted px-1 rounded text-xs">
                            {selectedLog.resend_message_id}
                          </code>
                        </div>
                      )}
                      {selectedLog.error_message && (
                        <div className="col-span-2 text-red-600">
                          <span className="text-muted-foreground">Error:</span>{" "}
                          {selectedLog.error_message}
                        </div>
                      )}
                    </div>

                    {deliveryEvents.length > 0 && (
                      <div className="mt-2">
                        <p className="text-muted-foreground mb-2">Delivery Events:</p>
                        <div className="flex gap-2 flex-wrap">
                          {deliveryEvents.map((event) => (
                            <Badge key={event.id} variant="secondary">
                              {event.event_type} @ {format(new Date(event.occurred_at), "HH:mm")}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="troubleshooting">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <CardTitle>Troubleshooting Guide</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">Common Issues</h4>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium text-sm">Emails not being received</p>
                    <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside">
                      <li>Check spam/junk folder</li>
                      <li>Verify domain is validated in Resend dashboard</li>
                      <li>Check if recipient email is on suppression list</li>
                      <li>Use a custom domain instead of @resend.dev for better deliverability</li>
                    </ul>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium text-sm">API Key Issues</p>
                    <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside">
                      <li>Verify RESEND_API_KEY is set in Supabase secrets</li>
                      <li>Check API key hasn't expired or been revoked</li>
                      <li>Ensure API key has proper permissions</li>
                    </ul>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium text-sm">Bounces & Complaints</p>
                    <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside">
                      <li>Check Resend dashboard for suppression list</li>
                      <li>Remove invalid addresses from mailing</li>
                      <li>Contact Resend support for unsuppression</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">External Resources</h4>
                <div className="flex flex-col gap-2">
                  <a 
                    href="https://resend.com/domains" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Resend Domain Management
                  </a>
                  <a 
                    href="https://resend.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Resend API Keys
                  </a>
                  <a 
                    href="https://resend.com/docs" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Resend Documentation
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}