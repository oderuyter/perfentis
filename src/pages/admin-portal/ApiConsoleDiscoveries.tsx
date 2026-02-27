import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useUnreviewedDiscoveries, useApiRegistry, useUpdateDiscoveryStatus,
  useRunScan, type ApiReference,
} from "@/hooks/useApiConsole";
import {
  ArrowLeft, Inbox, Link2, Plus, EyeOff, Scan, Upload, Loader2,
} from "lucide-react";
import { toast } from "sonner";

export default function ApiConsoleDiscoveries() {
  const navigate = useNavigate();
  const { data: discoveries = [], isLoading } = useUnreviewedDiscoveries();
  const { data: apis = [] } = useApiRegistry();
  const updateStatus = useUpdateDiscoveryStatus();
  const runScan = useRunScan();

  const [scanContent, setScanContent] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLink = (discovery: ApiReference, apiId: string) => {
    updateStatus.mutate({ id: discovery.id, status: "linked", apiRegistryId: apiId });
  };

  const handleIgnore = (discovery: ApiReference) => {
    updateStatus.mutate({ id: discovery.id, status: "ignored" });
  };

  const handleCreateFromDiscovery = (discovery: ApiReference) => {
    navigate(`/admin-portal/api-console/registry?create=${encodeURIComponent(discovery.discovered_name)}`);
  };

  const handleScan = () => {
    if (!scanContent.trim()) {
      toast.error("Paste or upload code content to scan");
      return;
    }
    runScan.mutate(scanContent);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const readers: Promise<string>[] = [];
    Array.from(files).forEach(f => {
      readers.push(new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(`// FILE: ${f.name}\n${reader.result as string}`);
        reader.readAsText(f);
      }));
    });
    Promise.all(readers).then(contents => {
      setScanContent(prev => prev + "\n" + contents.join("\n\n"));
      toast.success(`${files.length} file(s) loaded`);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin-portal/api-console")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Discoveries Inbox</h1>
          <p className="text-muted-foreground">{discoveries.length} unreviewed findings</p>
        </div>
        <Button variant="outline" onClick={() => setShowScanner(!showScanner)}>
          <Scan className="h-4 w-4 mr-2" /> {showScanner ? "Hide Scanner" : "Scan Code"}
        </Button>
      </div>

      {/* Scanner Panel */}
      {showScanner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Codebase Scanner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste code content or upload files to scan for API usage patterns (fetch calls, env vars, SDK imports, known API domains).
            </p>
            <Textarea
              value={scanContent}
              onChange={e => setScanContent(e.target.value)}
              placeholder="Paste code content here..."
              className="min-h-[200px] font-mono text-xs"
            />
            <div className="flex gap-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".ts,.tsx,.js,.jsx,.json,.toml,.env"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Upload Files
              </Button>
              <Button onClick={handleScan} disabled={runScan.isPending || !scanContent.trim()}>
                {runScan.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning...</> : <><Scan className="h-4 w-4 mr-2" /> Run Scan</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discoveries List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : discoveries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No unreviewed discoveries</p>
            <p className="text-sm text-muted-foreground mt-1">Run a scan to detect APIs in your codebase</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {discoveries.map(d => (
            <Card key={d.id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{d.discovered_name}</p>
                      <Badge variant="outline">{d.reference_type}</Badge>
                      <Badge variant={d.confidence_score >= 0.8 ? "default" : "secondary"}>
                        {Math.round(d.confidence_score * 100)}% conf.
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">{d.reference_key}</p>
                    {d.reference_snippet && (
                      <pre className="text-xs bg-muted p-2 rounded mt-2 max-h-20 overflow-hidden">{d.reference_snippet}</pre>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select onValueChange={(v) => handleLink(d, v)}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Link to API..." />
                      </SelectTrigger>
                      <SelectContent>
                        {apis.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => handleCreateFromDiscovery(d)}>
                      <Plus className="h-4 w-4 mr-1" /> New
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleIgnore(d)}>
                      <EyeOff className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
