import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types
export interface ApiRegistryEntry {
  id: string;
  name: string;
  provider: string | null;
  category: string;
  status: string;
  auth_type: string;
  base_urls: string[];
  description: string | null;
  pii_level: string;
  rate_limit_notes: string | null;
  docs_url: string | null;
  required_env_vars: string[];
  env_var_presence: Record<string, Record<string, boolean>>;
  owner_maintainer: string | null;
  environment: string | null;
  reference_count: number;
  health_status: string;
  last_scanned_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiReference {
  id: string;
  api_registry_id: string | null;
  discovery_status: string;
  discovered_name: string;
  reference_type: string;
  reference_key: string;
  reference_snippet: string | null;
  confidence_score: number;
  scan_session_id: string | null;
  created_at: string;
}

export interface ApiCallLog {
  id: string;
  api_registry_id: string | null;
  environment: string;
  timestamp: string;
  request_method: string | null;
  request_host: string | null;
  request_path: string | null;
  status_code: number | null;
  latency_ms: number | null;
  error_type: string | null;
  correlation_id: string | null;
  user_id: string | null;
  raw_meta: Record<string, unknown>;
  created_at: string;
}

export interface ApiChangelog {
  id: string;
  api_registry_id: string | null;
  actor_user_id: string | null;
  action_type: string;
  before_json: Record<string, unknown> | null;
  after_json: Record<string, unknown> | null;
  created_at: string;
}

export function useApiRegistry() {
  return useQuery({
    queryKey: ["api-registry"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_registry" as any)
        .select("*")
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as ApiRegistryEntry[];
    },
  });
}

export function useApiRegistryEntry(id: string | undefined) {
  return useQuery({
    queryKey: ["api-registry", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_registry" as any)
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as unknown as ApiRegistryEntry;
    },
  });
}

export function useApiReferences(apiRegistryId?: string) {
  return useQuery({
    queryKey: ["api-references", apiRegistryId],
    queryFn: async () => {
      let q = supabase.from("api_registry_references" as any).select("*").order("created_at", { ascending: false });
      if (apiRegistryId) q = q.eq("api_registry_id", apiRegistryId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as ApiReference[];
    },
  });
}

export function useUnreviewedDiscoveries() {
  return useQuery({
    queryKey: ["api-discoveries-unreviewed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_registry_references" as any)
        .select("*")
        .eq("discovery_status", "unreviewed")
        .order("confidence_score", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ApiReference[];
    },
  });
}

export function useApiCallLogs(apiRegistryId?: string, limit = 100) {
  return useQuery({
    queryKey: ["api-call-logs", apiRegistryId, limit],
    queryFn: async () => {
      let q = supabase
        .from("api_call_logs" as any)
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(limit);
      if (apiRegistryId) q = q.eq("api_registry_id", apiRegistryId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as ApiCallLog[];
    },
  });
}

export function useApiChangelog(apiRegistryId?: string) {
  return useQuery({
    queryKey: ["api-changelog", apiRegistryId],
    queryFn: async () => {
      let q = supabase
        .from("api_registry_changelog" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (apiRegistryId) q = q.eq("api_registry_id", apiRegistryId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as ApiChangelog[];
    },
  });
}

export function useCreateApiEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Partial<ApiRegistryEntry>) => {
      const { data, error } = await supabase
        .from("api_registry" as any)
        .insert(entry as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ApiRegistryEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-registry"] });
      toast.success("API entry created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateApiEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ApiRegistryEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from("api_registry" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ApiRegistryEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-registry"] });
      toast.success("API entry updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteApiEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("api_registry" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-registry"] });
      toast.success("API entry deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateDiscoveryStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, apiRegistryId }: { id: string; status: string; apiRegistryId?: string }) => {
      const updates: any = { discovery_status: status };
      if (apiRegistryId) updates.api_registry_id = apiRegistryId;
      const { error } = await supabase
        .from("api_registry_references" as any)
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-discoveries-unreviewed"] });
      qc.invalidateQueries({ queryKey: ["api-references"] });
      toast.success("Discovery updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRunScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (codeContent: string) => {
      const { data, error } = await supabase.functions.invoke("api-scanner", {
        body: { code_content: codeContent },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-discoveries-unreviewed"] });
      qc.invalidateQueries({ queryKey: ["api-references"] });
      qc.invalidateQueries({ queryKey: ["api-registry"] });
      toast.success("Scan complete");
    },
    onError: (e: Error) => toast.error("Scan failed: " + e.message),
  });
}

export function useApiGovernanceSettings() {
  return useQuery({
    queryKey: ["api-governance-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_governance_settings" as any)
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useUpdateGovernanceSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { block_unregistered_in_prod?: boolean; auto_discover_enabled?: boolean }) => {
      const { error } = await supabase
        .from("api_governance_settings" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .not("id", "is", null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-governance-settings"] });
      toast.success("Governance settings updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// CSV helpers
export function exportRegistryToCsv(entries: ApiRegistryEntry[]): string {
  const headers = "name,provider,category,status,auth_type,base_urls,required_env_vars,pii_level,docs_url,description";
  const rows = entries.map(e =>
    [
      csvEscape(e.name),
      csvEscape(e.provider || ""),
      csvEscape(e.category),
      csvEscape(e.status),
      csvEscape(e.auth_type),
      csvEscape(JSON.stringify(e.base_urls || [])),
      csvEscape(JSON.stringify(e.required_env_vars || [])),
      csvEscape(e.pii_level),
      csvEscape(e.docs_url || ""),
      csvEscape(e.description || ""),
    ].join(",")
  );
  return [headers, ...rows].join("\n");
}

export function exportReferencesToCsv(refs: ApiReference[]): string {
  const headers = "discovered_name,reference_type,reference_key,confidence_score,discovery_status";
  const rows = refs.map(r =>
    [
      csvEscape(r.discovered_name),
      csvEscape(r.reference_type),
      csvEscape(r.reference_key),
      r.confidence_score.toString(),
      csvEscape(r.discovery_status),
    ].join(",")
  );
  return [headers, ...rows].join("\n");
}

function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseCsvToEntries(csvText: string): Partial<ApiRegistryEntry>[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const entry: any = {};
    headers.forEach((h, i) => {
      const val = values[i] || "";
      if (h === "base_urls" || h === "required_env_vars") {
        try { entry[h] = JSON.parse(val); } catch { entry[h] = []; }
      } else {
        entry[h] = val;
      }
    });
    return entry as Partial<ApiRegistryEntry>;
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { current += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ",") { result.push(current); current = ""; }
      else { current += c; }
    }
  }
  result.push(current);
  return result;
}
