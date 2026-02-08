import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Globe,
  Key,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Settings2,
  FileJson,
  TestTube,
  Fingerprint,
  Shield,
} from "lucide-react";

interface ApiProvider {
  id: string;
  provider_key: string;
  display_name: string;
  is_enabled: boolean;
  priority: number;
  api_key_encrypted: string | null;
  base_url: string | null;
  rate_limit_per_min: number;
  last_ok_at: string | null;
  last_error: string | null;
  call_count_24h: number;
}

interface MappingRule {
  id: string;
  provider_key: string;
  rule_version: string;
  mapping_json: any;
  is_active: boolean;
}

interface MatchingRule {
  id: string;
  rule_version: string;
  settings_json: any;
  is_active: boolean;
}

interface FingerprintSetting {
  id: string;
  rule_version: string;
  settings_json: any;
  is_active: boolean;
}

export default function AdminNutrition() {
  const [tab, setTab] = useState("providers");
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [mappingRules, setMappingRules] = useState<MappingRule[]>([]);
  const [matchingRules, setMatchingRules] = useState<MatchingRule[]>([]);
  const [fingerprintSettings, setFingerprintSettings] = useState<FingerprintSetting[]>([]);
  const [loading, setLoading] = useState(true);

  // Editing states
  const [editingMapping, setEditingMapping] = useState<string | null>(null);
  const [editingMappingJson, setEditingMappingJson] = useState("");
  const [editingMatching, setEditingMatching] = useState<string | null>(null);
  const [editingMatchingJson, setEditingMatchingJson] = useState("");
  const [editingFingerprint, setEditingFingerprint] = useState<string | null>(null);
  const [editingFingerprintJson, setEditingFingerprintJson] = useState("");

  // Test states
  const [testMappingPayload, setTestMappingPayload] = useState("");
  const [testMappingResult, setTestMappingResult] = useState<string | null>(null);
  const [testMatchPayloadA, setTestMatchPayloadA] = useState("");
  const [testMatchPayloadB, setTestMatchPayloadB] = useState("");
  const [testMatchResult, setTestMatchResult] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [p, m, mr, fs] = await Promise.all([
      supabase.from("nutrition_api_providers").select("*").order("priority"),
      supabase.from("nutrition_mapping_rules").select("*").order("created_at"),
      supabase.from("nutrition_matching_rules").select("*").order("created_at"),
      supabase.from("nutrition_fingerprint_settings").select("*").order("created_at"),
    ]);

    setProviders((p.data || []) as unknown as ApiProvider[]);
    setMappingRules((m.data || []) as unknown as MappingRule[]);
    setMatchingRules((mr.data || []) as unknown as MatchingRule[]);
    setFingerprintSettings((fs.data || []) as unknown as FingerprintSetting[]);
    setLoading(false);
  };

  const toggleProvider = async (id: string, enabled: boolean) => {
    const { error } = await supabase
      .from("nutrition_api_providers")
      .update({ is_enabled: enabled })
      .eq("id", id);
    if (error) toast.error("Failed to update");
    else {
      toast.success("Provider updated");
      fetchAll();
    }
  };

  const updateProviderPriority = async (id: string, priority: number) => {
    await supabase.from("nutrition_api_providers").update({ priority }).eq("id", id);
    fetchAll();
  };

  const saveMappingJson = async (id: string) => {
    try {
      const parsed = JSON.parse(editingMappingJson);
      const { error } = await supabase
        .from("nutrition_mapping_rules")
        .update({ mapping_json: parsed })
        .eq("id", id);
      if (error) throw error;
      toast.success("Mapping rules saved");
      setEditingMapping(null);
      fetchAll();
    } catch (e: any) {
      toast.error(`Invalid JSON: ${e.message}`);
    }
  };

  const saveMatchingJson = async (id: string) => {
    try {
      const parsed = JSON.parse(editingMatchingJson);
      const { error } = await supabase
        .from("nutrition_matching_rules")
        .update({ settings_json: parsed })
        .eq("id", id);
      if (error) throw error;
      toast.success("Matching rules saved");
      setEditingMatching(null);
      fetchAll();
    } catch (e: any) {
      toast.error(`Invalid JSON: ${e.message}`);
    }
  };

  const saveFingerprintJson = async (id: string) => {
    try {
      const parsed = JSON.parse(editingFingerprintJson);
      const { error } = await supabase
        .from("nutrition_fingerprint_settings")
        .update({ settings_json: parsed })
        .eq("id", id);
      if (error) throw error;
      toast.success("Fingerprint settings saved");
      setEditingFingerprint(null);
      fetchAll();
    } catch (e: any) {
      toast.error(`Invalid JSON: ${e.message}`);
    }
  };

  const validateJson = (json: string): boolean => {
    try {
      JSON.parse(json);
      return true;
    } catch {
      return false;
    }
  };

  const testMapping = () => {
    try {
      const payload = JSON.parse(testMappingPayload);
      // Simple extraction based on first active mapping rule
      const activeRule = mappingRules.find((r) => r.is_active);
      if (!activeRule) {
        setTestMappingResult(JSON.stringify({ error: "No active mapping rule" }, null, 2));
        return;
      }
      const fields = activeRule.mapping_json?.fields || {};
      const result: Record<string, any> = {};

      for (const [key, config] of Object.entries(fields) as any) {
        const paths = config.paths || config.basis_paths?.per_100g || [];
        for (const path of paths) {
          const parts = path.replace(/^\$\./, "").split(".");
          let val = payload;
          for (const p of parts) {
            if (val && typeof val === "object") val = val[p];
            else { val = undefined; break; }
          }
          if (val !== undefined) {
            result[key] = val;
            break;
          }
        }
      }

      setTestMappingResult(JSON.stringify(result, null, 2));
    } catch (e: any) {
      setTestMappingResult(`Error: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nutrition Management</h1>
        <p className="text-muted-foreground text-sm">
          Manage food APIs, mapping rules, matching and fingerprint settings
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="providers" className="text-xs">
            <Globe className="h-3.5 w-3.5 mr-1" />
            APIs
          </TabsTrigger>
          <TabsTrigger value="mapping" className="text-xs">
            <FileJson className="h-3.5 w-3.5 mr-1" />
            Mapping
          </TabsTrigger>
          <TabsTrigger value="matching" className="text-xs">
            <Settings2 className="h-3.5 w-3.5 mr-1" />
            Matching
          </TabsTrigger>
          <TabsTrigger value="fingerprint" className="text-xs">
            <Fingerprint className="h-3.5 w-3.5 mr-1" />
            Fingerprint
          </TabsTrigger>
          <TabsTrigger value="moderation" className="text-xs">
            <Shield className="h-3.5 w-3.5 mr-1" />
            Moderation
          </TabsTrigger>
        </TabsList>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-4 mt-4">
          {providers.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{p.display_name}</CardTitle>
                    <CardDescription className="text-xs">{p.provider_key}</CardDescription>
                  </div>
                  <Switch
                    checked={p.is_enabled}
                    onCheckedChange={(v) => toggleProvider(p.id, v)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Priority</Label>
                    <Input
                      type="number"
                      value={p.priority}
                      onChange={(e) =>
                        updateProviderPriority(p.id, Number(e.target.value))
                      }
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Rate Limit/min</Label>
                    <Input value={p.rate_limit_per_min} readOnly className="h-9" />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {p.last_ok_at ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-[hsl(var(--status-success))]" />
                      Last OK: {new Date(p.last_ok_at).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-muted-foreground" />
                      Never connected
                    </span>
                  )}
                  <span>Calls (24h): {p.call_count_24h}</span>
                </div>
                {p.last_error && (
                  <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-lg">
                    {p.last_error}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Mapping Tab */}
        <TabsContent value="mapping" className="space-y-4 mt-4">
          {mappingRules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {rule.provider_key} — v{rule.rule_version}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {rule.is_active ? (
                        <Badge variant="default" className="text-[10px] h-5">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] h-5">Inactive</Badge>
                      )}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingMapping(rule.id);
                      setEditingMappingJson(JSON.stringify(rule.mapping_json, null, 2));
                    }}
                  >
                    Edit JSON
                  </Button>
                </div>
              </CardHeader>
              {editingMapping === rule.id && (
                <CardContent className="space-y-3">
                  <textarea
                    className="w-full h-64 text-xs font-mono bg-muted/30 p-3 rounded-lg border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={editingMappingJson}
                    onChange={(e) => setEditingMappingJson(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <Badge variant={validateJson(editingMappingJson) ? "default" : "destructive"}>
                      {validateJson(editingMappingJson) ? "Valid JSON" : "Invalid JSON"}
                    </Badge>
                    <div className="flex-1" />
                    <Button variant="outline" size="sm" onClick={() => setEditingMapping(null)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={!validateJson(editingMappingJson)}
                      onClick={() => saveMappingJson(rule.id)}
                    >
                      Save
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}

          {/* Test Mapping */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Test Mapping
              </CardTitle>
              <CardDescription className="text-xs">
                Paste a sample provider payload to see extracted fields
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                className="w-full h-32 text-xs font-mono bg-muted/30 p-3 rounded-lg border border-border/50"
                placeholder='{"product": {"product_name": "Example", ...}}'
                value={testMappingPayload}
                onChange={(e) => setTestMappingPayload(e.target.value)}
              />
              <Button size="sm" onClick={testMapping} disabled={!testMappingPayload}>
                Test
              </Button>
              {testMappingResult && (
                <pre className="text-xs font-mono bg-muted/20 p-3 rounded-lg whitespace-pre-wrap">
                  {testMappingResult}
                </pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Matching Tab */}
        <TabsContent value="matching" className="space-y-4 mt-4">
          {matchingRules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    v{rule.rule_version}{" "}
                    {rule.is_active && <Badge className="text-[10px] h-5 ml-2">Active</Badge>}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingMatching(rule.id);
                      setEditingMatchingJson(JSON.stringify(rule.settings_json, null, 2));
                    }}
                  >
                    Edit JSON
                  </Button>
                </div>
              </CardHeader>
              {editingMatching === rule.id && (
                <CardContent className="space-y-3">
                  <textarea
                    className="w-full h-64 text-xs font-mono bg-muted/30 p-3 rounded-lg border border-border/50 focus:outline-none"
                    value={editingMatchingJson}
                    onChange={(e) => setEditingMatchingJson(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <Badge variant={validateJson(editingMatchingJson) ? "default" : "destructive"}>
                      {validateJson(editingMatchingJson) ? "Valid JSON" : "Invalid JSON"}
                    </Badge>
                    <div className="flex-1" />
                    <Button variant="outline" size="sm" onClick={() => setEditingMatching(null)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={!validateJson(editingMatchingJson)}
                      onClick={() => saveMatchingJson(rule.id)}
                    >
                      Save
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}

          {/* Test Match */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Test Match
              </CardTitle>
              <CardDescription className="text-xs">
                Compare two food items to see similarity score
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Food A (JSON)</Label>
                  <textarea
                    className="w-full h-24 text-xs font-mono bg-muted/30 p-2 rounded-lg border border-border/50"
                    placeholder='{"name":"...", "brand":"...", "calories_per_100g": 100}'
                    value={testMatchPayloadA}
                    onChange={(e) => setTestMatchPayloadA(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Food B (JSON)</Label>
                  <textarea
                    className="w-full h-24 text-xs font-mono bg-muted/30 p-2 rounded-lg border border-border/50"
                    placeholder='{"name":"...", "brand":"...", "calories_per_100g": 102}'
                    value={testMatchPayloadB}
                    onChange={(e) => setTestMatchPayloadB(e.target.value)}
                  />
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  try {
                    const a = JSON.parse(testMatchPayloadA);
                    const b = JSON.parse(testMatchPayloadB);
                    // Simple similarity calculation
                    const nameSim = a.name && b.name
                      ? (a.name.toLowerCase() === b.name.toLowerCase() ? 1 : 0.5)
                      : 0;
                    const brandSim = a.brand && b.brand
                      ? (a.brand.toLowerCase() === b.brand.toLowerCase() ? 1 : 0)
                      : 0;
                    const macroSim = 1 - Math.min(
                      Math.abs((a.calories_per_100g || 0) - (b.calories_per_100g || 0)) / 100,
                      1
                    );
                    const score = nameSim * 0.65 + brandSim * 0.15 + macroSim * 0.2;
                    setTestMatchResult(JSON.stringify({
                      overall_score: score.toFixed(3),
                      name_similarity: nameSim.toFixed(3),
                      brand_similarity: brandSim.toFixed(3),
                      macro_similarity: macroSim.toFixed(3),
                      suggestion: score >= 0.82 ? "Suggest merge" : "No match",
                    }, null, 2));
                  } catch (e: any) {
                    setTestMatchResult(`Error: ${e.message}`);
                  }
                }}
              >
                Compare
              </Button>
              {testMatchResult && (
                <pre className="text-xs font-mono bg-muted/20 p-3 rounded-lg whitespace-pre-wrap">
                  {testMatchResult}
                </pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fingerprint Tab */}
        <TabsContent value="fingerprint" className="space-y-4 mt-4">
          {fingerprintSettings.map((fs) => (
            <Card key={fs.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    v{fs.rule_version}{" "}
                    {fs.is_active && <Badge className="text-[10px] h-5 ml-2">Active</Badge>}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingFingerprint(fs.id);
                      setEditingFingerprintJson(JSON.stringify(fs.settings_json, null, 2));
                    }}
                  >
                    Edit JSON
                  </Button>
                </div>
              </CardHeader>
              {editingFingerprint === fs.id && (
                <CardContent className="space-y-3">
                  <textarea
                    className="w-full h-48 text-xs font-mono bg-muted/30 p-3 rounded-lg border border-border/50 focus:outline-none"
                    value={editingFingerprintJson}
                    onChange={(e) => setEditingFingerprintJson(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <Badge variant={validateJson(editingFingerprintJson) ? "default" : "destructive"}>
                      {validateJson(editingFingerprintJson) ? "Valid JSON" : "Invalid JSON"}
                    </Badge>
                    <div className="flex-1" />
                    <Button variant="outline" size="sm" onClick={() => setEditingFingerprint(null)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={!validateJson(editingFingerprintJson)}
                      onClick={() => saveFingerprintJson(fs.id)}
                    >
                      Save
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </TabsContent>

        {/* Moderation Tab */}
        <TabsContent value="moderation" className="mt-4">
          <AdminNutritionModeration />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Moderation sub-component
function AdminNutritionModeration() {
  const [subTab, setSubTab] = useState("foods");
  const [pendingFoods, setPendingFoods] = useState<any[]>([]);
  const [pendingTemplates, setPendingTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    const [foods, templates] = await Promise.all([
      supabase.from("nutrition_submissions").select("*").eq("type", "food").eq("status", "pending").order("created_at"),
      supabase.from("nutrition_submissions").select("*").eq("type", "meal_template").eq("status", "pending").order("created_at"),
    ]);
    setPendingFoods((foods.data || []) as any[]);
    setPendingTemplates((templates.data || []) as any[]);
    setLoading(false);
  };

  const handleAction = async (id: string, status: "approved" | "rejected", notes?: string) => {
    const { error } = await supabase
      .from("nutrition_submissions")
      .update({
        status,
        reviewer_notes: notes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) toast.error("Failed to update submission");
    else {
      toast.success(`Submission ${status}`);
      fetchSubmissions();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="foods" className="text-xs">
            Pending Foods ({pendingFoods.length})
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs">
            Pending Templates ({pendingTemplates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="foods" className="space-y-3 mt-3">
          {pendingFoods.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No pending food submissions
            </p>
          ) : (
            pendingFoods.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-4">
                  <pre className="text-xs font-mono bg-muted/20 p-2 rounded-lg mb-3 max-h-32 overflow-auto">
                    {JSON.stringify(s.payload, null, 2)}
                  </pre>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAction(s.id, "approved")}>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(s.id, "rejected", "Does not meet criteria")}
                    >
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-3 mt-3">
          {pendingTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No pending template submissions
            </p>
          ) : (
            pendingTemplates.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-4">
                  <pre className="text-xs font-mono bg-muted/20 p-2 rounded-lg mb-3 max-h-32 overflow-auto">
                    {JSON.stringify(s.payload, null, 2)}
                  </pre>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAction(s.id, "approved")}>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(s.id, "rejected", "Does not meet criteria")}
                    >
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
