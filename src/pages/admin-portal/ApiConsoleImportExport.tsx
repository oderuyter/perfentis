import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useApiRegistry, useApiReferences, useCreateApiEntry,
  exportRegistryToCsv, exportReferencesToCsv, downloadCsv, parseCsvToEntries,
  type ApiRegistryEntry,
} from "@/hooks/useApiConsole";
import { ArrowLeft, Download, Upload, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function ApiConsoleImportExport() {
  const navigate = useNavigate();
  const { data: apis = [] } = useApiRegistry();
  const { data: refs = [] } = useApiReferences();
  const createApi = useCreateApiEntry();

  const [importPreview, setImportPreview] = useState<Partial<ApiRegistryEntry>[] | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const entries = parseCsvToEntries(text);
      const errors: string[] = [];
      entries.forEach((entry, i) => {
        if (!entry.name) errors.push(`Row ${i + 2}: Missing name`);
        if (entry.status && !["active","planned","deprecated","unknown"].includes(entry.status)) {
          errors.push(`Row ${i + 2}: Invalid status "${entry.status}"`);
        }
      });
      setImportErrors(errors);
      setImportPreview(entries);
    };
    reader.readAsText(file);
  };

  const handleApplyImport = async () => {
    if (!importPreview) return;
    let success = 0;
    for (const entry of importPreview) {
      if (!entry.name) continue;
      try {
        await createApi.mutateAsync(entry as any);
        success++;
      } catch (err: any) {
        toast.error(`Failed to import "${entry.name}": ${err.message}`);
      }
    }
    toast.success(`Imported ${success} API entries`);
    setImportPreview(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin-portal/api-console")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Import / Export</h1>
          <p className="text-muted-foreground">CSV tools for the API registry</p>
        </div>
      </div>

      {/* Export Section */}
      <Card>
        <CardHeader><CardTitle className="text-base">Export</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={() => downloadCsv(exportRegistryToCsv(apis), "api-registry.csv")}>
              <Download className="h-4 w-4 mr-2" /> API Registry CSV ({apis.length} entries)
            </Button>
            <Button variant="outline" onClick={() => downloadCsv(exportReferencesToCsv(refs), "api-references.csv")}>
              <Download className="h-4 w-4 mr-2" /> References CSV ({refs.length} entries)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader><CardTitle className="text-base">Import Registry</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a CSV with columns: name, provider, category, status, auth_type, base_urls, required_env_vars, pii_level, docs_url, description
          </p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> Upload CSV
          </Button>

          {importPreview && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span className="font-medium">{importPreview.length} entries found</span>
                {importErrors.length > 0 && (
                  <Badge variant="destructive">{importErrors.length} errors</Badge>
                )}
              </div>

              {importErrors.length > 0 && (
                <div className="bg-destructive/10 p-3 rounded-lg space-y-1">
                  {importErrors.map((err, i) => (
                    <p key={i} className="text-sm text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3" /> {err}
                    </p>
                  ))}
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importPreview.slice(0, 20).map((entry, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{entry.name || "—"}</TableCell>
                      <TableCell>{entry.provider || "—"}</TableCell>
                      <TableCell>{entry.category || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{entry.status || "—"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex gap-3">
                <Button onClick={handleApplyImport} disabled={createApi.isPending}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Apply Import
                </Button>
                <Button variant="outline" onClick={() => setImportPreview(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
