import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useApiRegistry, useCreateApiEntry, useUpdateApiEntry,
  exportRegistryToCsv, downloadCsv,
  type ApiRegistryEntry,
} from "@/hooks/useApiConsole";
import {
  Search, Plus, Download, CheckCircle, AlertTriangle, XCircle,
  Eye, Edit, Archive, ArrowLeft,
} from "lucide-react";

const CATEGORIES = ["email","payments","weather","maps","health","fitness_devices","messaging","storage","ai","analytics","auth","other"];
const STATUSES = ["active","planned","deprecated","unknown"];
const AUTH_TYPES = ["api_key","oauth","jwt","none","other"];
const PII_LEVELS = ["none","low","high","health","payments"];

export default function ApiConsoleRegistry() {
  const navigate = useNavigate();
  const { data: apis = [], isLoading } = useApiRegistry();
  const createApi = useCreateApiEntry();
  const updateApi = useUpdateApiEntry();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);

  // New entry form
  const [form, setForm] = useState({
    name: "", provider: "", category: "other", status: "active",
    auth_type: "api_key", description: "", pii_level: "none",
    base_urls: "", required_env_vars: "", docs_url: "", rate_limit_notes: "",
    owner_maintainer: "",
  });

  const filtered = useMemo(() => {
    return apis.filter(a => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return a.name.toLowerCase().includes(q) ||
          (a.provider || "").toLowerCase().includes(q) ||
          (a.description || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [apis, search, statusFilter, categoryFilter]);

  const handleCreate = () => {
    createApi.mutate({
      name: form.name,
      provider: form.provider || null,
      category: form.category,
      status: form.status,
      auth_type: form.auth_type,
      description: form.description || null,
      pii_level: form.pii_level,
      base_urls: form.base_urls ? form.base_urls.split(",").map(s => s.trim()) : [],
      required_env_vars: form.required_env_vars ? form.required_env_vars.split(",").map(s => s.trim()) : [],
      docs_url: form.docs_url || null,
      rate_limit_notes: form.rate_limit_notes || null,
      owner_maintainer: form.owner_maintainer || null,
    } as any, {
      onSuccess: () => {
        setShowCreate(false);
        setForm({ name: "", provider: "", category: "other", status: "active", auth_type: "api_key", description: "", pii_level: "none", base_urls: "", required_env_vars: "", docs_url: "", rate_limit_notes: "", owner_maintainer: "" });
      }
    });
  };

  const handleDeprecate = (api: ApiRegistryEntry) => {
    updateApi.mutate({ id: api.id, status: "deprecated" } as any);
  };

  const healthIcon = (status: string) => {
    if (status === "ok") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === "warning") return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    if (status === "down") return <XCircle className="h-4 w-4 text-destructive" />;
    return <span className="h-4 w-4 text-muted-foreground">—</span>;
  };

  const envVarStatus = (api: ApiRegistryEntry) => {
    const vars = api.required_env_vars || [];
    if (vars.length === 0) return <Badge variant="secondary">N/A</Badge>;
    const presence = api.env_var_presence || {};
    const allPresent = vars.every((v: string) => (presence as any)?.prod?.[v]);
    if (allPresent) return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Yes</Badge>;
    const somePresent = vars.some((v: string) => (presence as any)?.prod?.[v]);
    if (somePresent) return <Badge variant="outline" className="text-orange-500 border-orange-500/30">Partial</Badge>;
    return <Badge variant="destructive">No</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin-portal/api-console")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">API Registry</h1>
          <p className="text-muted-foreground">{apis.length} APIs registered</p>
        </div>
        <Button variant="outline" onClick={() => downloadCsv(exportRegistryToCsv(apis), "api-registry.csv")}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add API</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Register New API</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Resend Email API" /></div>
              <div><Label>Provider</Label><Input value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} placeholder="e.g. Resend" /></div>
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Auth Type</Label>
                  <Select value={form.auth_type} onValueChange={v => setForm(f => ({ ...f, auth_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{AUTH_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>PII Level</Label>
                  <Select value={form.pii_level} onValueChange={v => setForm(f => ({ ...f, pii_level: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PII_LEVELS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div><Label>Base URLs (comma-separated)</Label><Input value={form.base_urls} onChange={e => setForm(f => ({ ...f, base_urls: e.target.value }))} placeholder="https://api.resend.com" /></div>
              <div><Label>Required Env Vars (comma-separated)</Label><Input value={form.required_env_vars} onChange={e => setForm(f => ({ ...f, required_env_vars: e.target.value }))} placeholder="RESEND_API_KEY" /></div>
              <div><Label>Docs URL</Label><Input value={form.docs_url} onChange={e => setForm(f => ({ ...f, docs_url: e.target.value }))} /></div>
              <div><Label>Rate Limit Notes</Label><Input value={form.rate_limit_notes} onChange={e => setForm(f => ({ ...f, rate_limit_notes: e.target.value }))} /></div>
              <div><Label>Owner / Maintainer</Label><Input value={form.owner_maintainer} onChange={e => setForm(f => ({ ...f, owner_maintainer: e.target.value }))} /></div>
              <Button onClick={handleCreate} disabled={!form.name || createApi.isPending} className="w-full">
                {createApi.isPending ? "Creating..." : "Create API Entry"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search APIs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Provider</TableHead>
                <TableHead className="hidden lg:table-cell">Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Auth</TableHead>
                <TableHead className="hidden lg:table-cell">Secrets</TableHead>
                <TableHead className="hidden xl:table-cell">Refs</TableHead>
                <TableHead>Health</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No APIs found</TableCell></TableRow>
              ) : filtered.map(api => (
                <TableRow key={api.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin-portal/api-console/registry/${api.id}`)}>
                  <TableCell className="font-medium">{api.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{api.provider}</TableCell>
                  <TableCell className="hidden lg:table-cell"><Badge variant="outline">{api.category}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={api.status === "active" ? "default" : api.status === "deprecated" ? "destructive" : "secondary"}>
                      {api.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{api.auth_type}</TableCell>
                  <TableCell className="hidden lg:table-cell">{envVarStatus(api)}</TableCell>
                  <TableCell className="hidden xl:table-cell text-muted-foreground">{api.reference_count}</TableCell>
                  <TableCell>{healthIcon(api.health_status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/admin-portal/api-console/registry/${api.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {api.status !== "deprecated" && (
                        <Button variant="ghost" size="icon" onClick={() => handleDeprecate(api)}>
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
