import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useApiRegistryEntry, useUpdateApiEntry, useApiReferences,
  useApiCallLogs, useApiChangelog, type ApiRegistryEntry,
} from "@/hooks/useApiConsole";
import {
  ArrowLeft, CheckCircle, XCircle, ExternalLink, Save,
  AlertTriangle, Clock, FileText, Activity, History, Settings2,
} from "lucide-react";
import { format } from "date-fns";

const CATEGORIES = ["email","payments","weather","maps","health","fitness_devices","messaging","storage","ai","analytics","auth","other"];
const STATUSES = ["active","planned","deprecated","unknown"];
const AUTH_TYPES = ["api_key","oauth","jwt","none","other"];
const PII_LEVELS = ["none","low","high","health","payments"];

export default function ApiConsoleDetail() {
  const { apiId } = useParams();
  const navigate = useNavigate();
  const { data: api, isLoading } = useApiRegistryEntry(apiId);
  const updateApi = useUpdateApiEntry();
  const { data: references = [] } = useApiReferences(apiId);
  const { data: logs = [] } = useApiCallLogs(apiId, 200);
  const { data: changelog = [] } = useApiChangelog(apiId);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<ApiRegistryEntry>>({});
  const [logSearch, setLogSearch] = useState("");

  if (isLoading) return <div className="flex justify-center py-12"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!api) return <div className="text-center py-12 text-muted-foreground">API not found</div>;

  const startEdit = () => {
    setForm({
      name: api.name, provider: api.provider, category: api.category,
      status: api.status, auth_type: api.auth_type, description: api.description,
      pii_level: api.pii_level, rate_limit_notes: api.rate_limit_notes,
      docs_url: api.docs_url, owner_maintainer: api.owner_maintainer,
      base_urls: api.base_urls, required_env_vars: api.required_env_vars,
    });
    setEditing(true);
  };

  const saveEdit = () => {
    updateApi.mutate({ id: api.id, ...form } as any, {
      onSuccess: () => setEditing(false),
    });
  };

  const filteredLogs = logSearch
    ? logs.filter(l =>
        (l.request_path || "").includes(logSearch) ||
        String(l.status_code || "").includes(logSearch) ||
        (l.error_type || "").includes(logSearch) ||
        (l.correlation_id || "").includes(logSearch)
      )
    : logs;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin-portal/api-console/registry")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{api.name}</h1>
          <p className="text-muted-foreground">{api.provider} · {api.category}</p>
        </div>
        <Badge variant={api.status === "active" ? "default" : api.status === "deprecated" ? "destructive" : "secondary"}>
          {api.status}
        </Badge>
        {!editing && <Button variant="outline" onClick={startEdit}>Edit</Button>}
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary"><FileText className="h-4 w-4 mr-1" /> Summary</TabsTrigger>
          <TabsTrigger value="config"><Settings2 className="h-4 w-4 mr-1" /> Configuration</TabsTrigger>
          <TabsTrigger value="refs"><FileText className="h-4 w-4 mr-1" /> References ({references.length})</TabsTrigger>
          <TabsTrigger value="usage"><Activity className="h-4 w-4 mr-1" /> Usage & Errors</TabsTrigger>
          <TabsTrigger value="changelog"><History className="h-4 w-4 mr-1" /> Change Log</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Name</Label><Input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                    <div><Label>Provider</Label><Input value={form.provider || ""} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label>Category</Label>
                      <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Status</Label>
                      <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Auth Type</Label>
                      <Select value={form.auth_type} onValueChange={v => setForm(f => ({ ...f, auth_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{AUTH_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Description</Label><Textarea value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>PII Level</Label>
                      <Select value={form.pii_level} onValueChange={v => setForm(f => ({ ...f, pii_level: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{PII_LEVELS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Owner / Maintainer</Label><Input value={form.owner_maintainer || ""} onChange={e => setForm(f => ({ ...f, owner_maintainer: e.target.value }))} /></div>
                  </div>
                  <div><Label>Rate Limit Notes</Label><Input value={form.rate_limit_notes || ""} onChange={e => setForm(f => ({ ...f, rate_limit_notes: e.target.value }))} /></div>
                  <div><Label>Docs URL</Label><Input value={form.docs_url || ""} onChange={e => setForm(f => ({ ...f, docs_url: e.target.value }))} /></div>
                  <div className="flex gap-2">
                    <Button onClick={saveEdit} disabled={updateApi.isPending}><Save className="h-4 w-4 mr-2" /> Save</Button>
                    <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InfoField label="Provider" value={api.provider} />
                    <InfoField label="Category" value={api.category} />
                    <InfoField label="Auth Type" value={api.auth_type} />
                    <InfoField label="PII Level" value={api.pii_level} />
                    <InfoField label="Owner" value={api.owner_maintainer} />
                    <InfoField label="Health" value={api.health_status} />
                  </div>
                  {api.description && <div><Label className="text-muted-foreground">Description</Label><p className="text-sm mt-1">{api.description}</p></div>}
                  {(api.base_urls as string[])?.length > 0 && (
                    <div><Label className="text-muted-foreground">Base URLs</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(api.base_urls as string[]).map((u, i) => <Badge key={i} variant="outline" className="font-mono text-xs">{u}</Badge>)}
                      </div>
                    </div>
                  )}
                  {api.rate_limit_notes && <InfoField label="Rate Limits" value={api.rate_limit_notes} />}
                  {api.docs_url && (
                    <div><Label className="text-muted-foreground">Documentation</Label>
                      <a href={api.docs_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center gap-1 mt-1">
                        {api.docs_url} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config">
          <Card>
            <CardHeader><CardTitle className="text-base">Required Environment Variables</CardTitle></CardHeader>
            <CardContent>
              {(api.required_env_vars as string[])?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No env vars configured for this API.</p>
              ) : (
                <div className="space-y-3">
                  {(api.required_env_vars as string[]).map((v, i) => {
                    const presence = api.env_var_presence as any;
                    const prodPresent = presence?.prod?.[v];
                    const devPresent = presence?.dev?.[v];
                    return (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                        <code className="font-mono text-sm font-medium flex-1">{v}</code>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Dev:</span>
                          {devPresent ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Prod:</span>
                          {prodPresent ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* References Tab */}
        <TabsContent value="refs">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>File / Module</TableHead>
                    <TableHead className="hidden md:table-cell">Snippet</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Found</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {references.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No references found. Run a scan.</TableCell></TableRow>
                  ) : references.map(ref => (
                    <TableRow key={ref.id}>
                      <TableCell><Badge variant="outline">{ref.reference_type}</Badge></TableCell>
                      <TableCell className="font-mono text-xs max-w-[300px] truncate">{ref.reference_key}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[300px] truncate">{ref.reference_snippet}</TableCell>
                      <TableCell>
                        <Badge variant={ref.confidence_score >= 0.8 ? "default" : "secondary"}>
                          {Math.round(ref.confidence_score * 100)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(ref.created_at), "MMM d, HH:mm")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage & Errors Tab */}
        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <CardTitle className="text-base flex-1">Call Logs</CardTitle>
                <Input placeholder="Search logs..." value={logSearch} onChange={e => setLogSearch(e.target.value)} className="max-w-xs" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead className="hidden md:table-cell">Path</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Latency</TableHead>
                    <TableHead className="hidden lg:table-cell">Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No logs available</TableCell></TableRow>
                  ) : filteredLogs.slice(0, 50).map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{format(new Date(log.timestamp), "MMM d HH:mm:ss")}</TableCell>
                      <TableCell><Badge variant="outline">{log.request_method}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{log.request_host}</TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs max-w-[200px] truncate">{log.request_path}</TableCell>
                      <TableCell>
                        <Badge variant={!log.status_code ? "secondary" : log.status_code < 400 ? "default" : "destructive"}>
                          {log.status_code || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{log.latency_ms ? `${log.latency_ms}ms` : "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{log.error_type || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Changelog Tab */}
        <TabsContent value="changelog">
          <Card>
            <CardContent className="pt-6">
              {changelog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {changelog.map(entry => (
                    <div key={entry.id} className="flex gap-3 border-b pb-3 last:border-0">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{entry.action_type}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(entry.created_at), "MMM d, yyyy HH:mm")}</p>
                        {entry.after_json && (
                          <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto max-h-32">
                            {JSON.stringify(entry.after_json, null, 2)}
                          </pre>
                        )}
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

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <p className="text-sm font-medium mt-0.5">{value || "—"}</p>
    </div>
  );
}
