import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail, Send, CheckCircle, XCircle, RefreshCw, Settings, Save,
  Loader2, Activity, Shield, Eye, EyeOff, Plug
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  from_name: string;
  from_email: string;
  reply_to: string | null;
  enabled: boolean;
  updated_at: string;
  updated_by: string | null;
}

export default function AdminEmailDiagnostics() {
  const [config, setConfig] = useState<SmtpConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [secure, setSecure] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fromName, setFromName] = useState("Flow Fitness");
  const [fromEmail, setFromEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [enabled, setEnabled] = useState(false);

  // Test email state
  const [testTo, setTestTo] = useState("");
  const [testSubject, setTestSubject] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Connection test state
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; error?: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("smtp-config", { method: "GET" });
      if (error) throw error;
      const cfg = data?.config;
      setConfig(cfg);
      if (cfg) {
        setHost(cfg.host || "");
        setPort(cfg.port || 587);
        setSecure(cfg.secure || false);
        setUsername(cfg.username || "");
        setFromName(cfg.from_name || "Flow Fitness");
        setFromEmail(cfg.from_email || "");
        setReplyTo(cfg.reply_to || "");
        setEnabled(cfg.enabled || false);
      }
    } catch (err: any) {
      console.error("Failed to load SMTP config:", err);
      toast.error("Failed to load SMTP configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (enabled && !host) { toast.error("Host is required when SMTP is enabled"); return; }
    if (port < 1 || port > 65535) { toast.error("Port must be 1-65535"); return; }
    if (fromEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) { toast.error("Invalid From Email"); return; }
    if (enabled && !username) { toast.error("Username is required when SMTP is enabled"); return; }

    setSaving(true);
    try {
      const body: Record<string, unknown> = { host, port, secure, username, from_name: fromName, from_email: fromEmail, reply_to: replyTo || null, enabled };
      if (password) body.password = password;

      const { data, error } = await supabase.functions.invoke("smtp-config", {
        method: "PUT",
        body,
      });
      if (error) throw error;
      if (!data?.success) throw new Error("Save failed");

      toast.success("SMTP settings saved successfully");
      setPassword("");
      loadConfig();
    } catch (err: any) {
      toast.error(err.message || "Failed to save SMTP settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testTo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testTo)) {
      toast.error("Enter a valid recipient email");
      return;
    }
    setSending(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("smtp-config", {
        method: "POST",
        body: { action: "test-email", to: testTo, subject: testSubject || undefined, message: testMessage || undefined },
      });
      if (error) throw error;
      setTestResult(data);
      if (data?.success) {
        toast.success("Test email sent successfully!");
      } else {
        toast.error(data?.error || "Failed to send test email");
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
      toast.error(err.message || "Failed to send test email");
    } finally {
      setSending(false);
    }
  };

  const handleConnectionTest = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("smtp-config", {
        method: "POST",
        body: { action: "connection-test" },
      });
      if (error) throw error;
      setConnectionResult(data);
      if (data?.success) {
        toast.success("SMTP connection successful!");
      } else {
        toast.error(data?.error || "Connection test failed");
      }
    } catch (err: any) {
      setConnectionResult({ success: false, error: err.message });
      toast.error(err.message || "Connection test failed");
    } finally {
      setTestingConnection(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email (SMTP) Configuration</h1>
          <p className="text-muted-foreground">Configure SMTP settings and test email delivery</p>
        </div>
        <Button onClick={loadConfig} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">SMTP Settings</TabsTrigger>
          <TabsTrigger value="test">Send Test Email</TabsTrigger>
          <TabsTrigger value="health">Health & Diagnostics</TabsTrigger>
        </TabsList>

        {/* Section 1: SMTP Settings */}
        <TabsContent value="settings">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  <CardTitle>SMTP Server</CardTitle>
                </div>
                <CardDescription>Configure your SMTP server connection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="host">Host *</Label>
                  <Input id="host" placeholder="smtp.example.com" value={host} onChange={(e) => setHost(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="port">Port *</Label>
                    <Input id="port" type="number" min={1} max={65535} value={port} onChange={(e) => setPort(parseInt(e.target.value) || 587)} />
                    <p className="text-xs text-muted-foreground">Use 2525 for cloud-hosted environments</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Secure (TLS)</Label>
                    <div className="flex items-center gap-2 pt-2">
                      <Switch checked={secure} onCheckedChange={setSecure} />
                      <span className="text-sm text-muted-foreground">{secure ? "TLS on connect (465)" : "STARTTLS / Plain"}</span>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input id="username" placeholder="your-smtp-username" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={config ? "••••••••  (leave blank to keep current)" : "Enter SMTP password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Password is encrypted at rest. Leave blank to keep existing password.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  <CardTitle>Sender Settings</CardTitle>
                </div>
                <CardDescription>Configure default sender information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fromName">From Name</Label>
                  <Input id="fromName" placeholder="Your App Name" value={fromName} onChange={(e) => setFromName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">From Email *</Label>
                  <Input id="fromEmail" type="email" placeholder="noreply@yourdomain.com" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="replyTo">Reply-To (optional)</Label>
                  <Input id="replyTo" type="email" placeholder="support@yourdomain.com" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} />
                </div>
                <Separator />
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Enable SMTP</p>
                    <p className="text-xs text-muted-foreground">Toggle email sending on/off</p>
                  </div>
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Section 2: Send Test Email */}
        <TabsContent value="test">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  <CardTitle>Send Test Email</CardTitle>
                </div>
                <CardDescription>Verify SMTP delivery is working (rate limited: 1/min, 30/day)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testTo">Recipient Email *</Label>
                  <Input id="testTo" type="email" placeholder="recipient@example.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testSubject">Subject (optional)</Label>
                  <Input id="testSubject" placeholder="Test Email" value={testSubject} onChange={(e) => setTestSubject(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testMessage">Message (optional)</Label>
                  <Input id="testMessage" placeholder="Custom message body..." value={testMessage} onChange={(e) => setTestMessage(e.target.value)} />
                </div>
                <Button onClick={handleTestEmail} disabled={sending || !testTo} className="w-full">
                  {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                  Send Test Email
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Test Result</CardTitle></CardHeader>
              <CardContent>
                {testResult ? (
                  <div className="flex items-center gap-3">
                    {testResult.success ? (
                      <><CheckCircle className="h-5 w-5 text-green-500" /><div><p className="font-medium">Email Sent</p><p className="text-xs text-muted-foreground">{new Date().toISOString()}</p></div></>
                    ) : (
                      <><XCircle className="h-5 w-5 text-red-500" /><div><p className="font-medium text-red-600">Send Failed</p><p className="text-sm text-muted-foreground mt-1">{testResult.error}</p></div></>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No test email sent yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Section 3: Health & Diagnostics */}
        <TabsContent value="health">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                <CardTitle>SMTP Health</CardTitle>
              </div>
              <CardDescription>Status and connection diagnostics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  {enabled ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
                  <div>
                    <p className="font-medium text-sm">Enabled</p>
                    <p className="text-xs text-muted-foreground">{enabled ? "Yes" : "No"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  {host ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                  <div>
                    <p className="font-medium text-sm">Host</p>
                    <p className="text-xs text-muted-foreground">{host || "Not configured"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Last Updated</p>
                    <p className="text-xs text-muted-foreground">
                      {config?.updated_at ? format(new Date(config.updated_at), "PPp") : "Never"}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Connection Test</p>
                  <p className="text-sm text-muted-foreground">Test SMTP server connectivity (handshake only, no email sent)</p>
                </div>
                <Button onClick={handleConnectionTest} disabled={testingConnection || !host} variant="outline">
                  {testingConnection ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plug className="h-4 w-4 mr-2" />}
                  Run Connection Test
                </Button>
              </div>

              {connectionResult && (
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${connectionResult.success ? "border-green-200 bg-green-50 dark:bg-green-950" : "border-red-200 bg-red-50 dark:bg-red-950"}`}>
                  {connectionResult.success ? (
                    <><CheckCircle className="h-5 w-5 text-green-500" /><p className="text-sm font-medium text-green-700 dark:text-green-300">Connection successful</p></>
                  ) : (
                    <><XCircle className="h-5 w-5 text-red-500" /><div><p className="text-sm font-medium text-red-700 dark:text-red-300">Connection failed</p><p className="text-xs text-red-600 dark:text-red-400 mt-1">{connectionResult.error}</p></div></>
                  )}
                </div>
              )}

              <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">⚠️ Port Restrictions</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Cloud-hosted environments may block standard SMTP ports (25, 465, 587).
                  Use port 2525 if your SMTP provider supports it (e.g., SendGrid, Mailgun, Postmark).
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
