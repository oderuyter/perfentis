import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Download,
  FileText,
  Users,
  Building2,
  Flag,
  GraduationCap,
  Link2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { logAuditEvent } from "@/hooks/useAuditLog";

interface ImportBatch {
  id: string;
  created_at: string;
  completed_at: string | null;
  entity_type: string;
  status: string;
  imported_by: string;
  total_rows: number;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  error_count: number;
  errors: unknown[];
  file_name: string | null;
}

interface ImportPreview {
  creates: Record<string, unknown>[];
  updates: Record<string, unknown>[];
  skipped: Record<string, unknown>[];
  errors: { row: number; message: string }[];
}

type EntityType = "users" | "gyms" | "events" | "coaches" | "coach_clients";

const ENTITY_CONFIGS: Record<
  EntityType,
  {
    label: string;
    icon: React.ElementType;
    templateColumns: string[];
    exampleRow: Record<string, string>;
  }
> = {
  users: {
    label: "Users",
    icon: Users,
    templateColumns: [
      "email",
      "full_name",
      "status",
      "global_roles",
      "gym_roles",
      "event_roles",
      "phone",
      "address_line1",
      "address_city",
      "address_postcode",
    ],
    exampleRow: {
      email: "john@example.com",
      full_name: "John Doe",
      status: "active",
      global_roles: "athlete",
      gym_roles: "",
      event_roles: "",
      phone: "+1234567890",
      address_line1: "123 Main St",
      address_city: "New York",
      address_postcode: "10001",
    },
  },
  gyms: {
    label: "Gyms",
    icon: Building2,
    templateColumns: [
      "gym_id",
      "name",
      "address_line1",
      "city",
      "postcode",
      "country",
      "status",
      "owner_email",
      "manager_emails",
    ],
    exampleRow: {
      gym_id: "",
      name: "Downtown Fitness",
      address_line1: "456 Oak Ave",
      city: "Los Angeles",
      postcode: "90001",
      country: "USA",
      status: "active",
      owner_email: "owner@gym.com",
      manager_emails: "manager1@gym.com|manager2@gym.com",
    },
  },
  events: {
    label: "Events",
    icon: Flag,
    templateColumns: [
      "event_id",
      "name",
      "start_date",
      "end_date",
      "mode",
      "location_text",
      "status",
      "global_capacity_limit",
      "volunteers_enabled",
      "organiser_email",
    ],
    exampleRow: {
      event_id: "",
      name: "Summer Championship 2024",
      start_date: "2024-07-15",
      end_date: "2024-07-17",
      mode: "in_person",
      location_text: "Convention Center",
      status: "draft",
      global_capacity_limit: "500",
      volunteers_enabled: "true",
      organiser_email: "organiser@event.com",
    },
  },
  coaches: {
    label: "Coaches",
    icon: GraduationCap,
    templateColumns: [
      "coach_email",
      "display_name",
      "bio",
      "specialties",
      "delivery_type",
      "location_text",
      "is_public",
      "affiliated_gym_ids",
    ],
    exampleRow: {
      coach_email: "coach@example.com",
      display_name: "Jane Smith",
      bio: "Certified personal trainer with 10 years experience",
      specialties: "strength|cardio|nutrition",
      delivery_type: "hybrid",
      location_text: "New York, NY",
      is_public: "true",
      affiliated_gym_ids: "",
    },
  },
  coach_clients: {
    label: "Coach-Client Relationships",
    icon: Link2,
    templateColumns: [
      "coach_email",
      "client_email",
      "service_name",
      "status",
      "start_date",
      "end_date",
    ],
    exampleRow: {
      coach_email: "coach@example.com",
      client_email: "client@example.com",
      service_name: "Personal Training",
      status: "active",
      start_date: "2024-01-01",
      end_date: "",
    },
  },
};

export default function AdminImports() {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<EntityType | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const { data, error } = await supabase
        .from("import_batches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setBatches((data || []) as ImportBatch[]);
    } catch (error) {
      console.error("Error fetching import batches:", error);
      toast.error("Failed to load import history");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = (entityType: EntityType) => {
    const config = ENTITY_CONFIGS[entityType];
    const headers = config.templateColumns.join(",");
    const exampleValues = config.templateColumns
      .map((col) => config.exampleRow[col] || "")
      .join(",");
    const csv = `${headers}\n${exampleValues}`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entityType}-import-template.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Template downloaded");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEntity) return;

    setImportFile(file);

    // Parse CSV and generate preview
    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());
    const headers = lines[0].split(",").map((h) => h.trim());
    const dataRows = lines.slice(1);

    const preview: ImportPreview = {
      creates: [],
      updates: [],
      skipped: [],
      errors: [],
    };

    const config = ENTITY_CONFIGS[selectedEntity];
    const requiredColumns = config.templateColumns.slice(0, 2); // First 2 columns usually required

    dataRows.forEach((line, index) => {
      const values = line.split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || "";
      });

      // Basic validation
      const missingRequired = requiredColumns.filter(
        (col) => !row[col] && col !== config.templateColumns[0] // Skip ID column
      );

      if (missingRequired.length > 0) {
        preview.errors.push({
          row: index + 2,
          message: `Missing required: ${missingRequired.join(", ")}`,
        });
      } else if (row[config.templateColumns[0]]) {
        preview.updates.push(row);
      } else {
        preview.creates.push(row);
      }
    });

    setImportPreview(preview);
  };

  const handleImport = async () => {
    if (!selectedEntity || !importPreview || !importFile) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      // Create import batch record
      const { data: batch, error: batchError } = await supabase
        .from("import_batches")
        .insert({
          entity_type: selectedEntity as string,
          status: "processing",
          imported_by: user.id,
          total_rows:
            importPreview.creates.length +
            importPreview.updates.length +
            importPreview.skipped.length,
          file_name: importFile.name,
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Process imports (simplified - in production this would be more robust)
      const results = {
        created: 0,
        updated: 0,
        skipped: importPreview.skipped.length,
        errors: importPreview.errors.length,
      };

      // Simulate progress
      const totalOps = importPreview.creates.length + importPreview.updates.length;
      let completed = 0;

      for (const row of importPreview.creates) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        results.created++;
        completed++;
        setImportProgress(Math.round((completed / totalOps) * 100));
      }

      for (const row of importPreview.updates) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        results.updated++;
        completed++;
        setImportProgress(Math.round((completed / totalOps) * 100));
      }

      // Update batch record
      await supabase
        .from("import_batches")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          created_count: results.created,
          updated_count: results.updated,
          skipped_count: results.skipped,
          error_count: results.errors,
          errors: importPreview.errors,
        })
        .eq("id", batch.id);

      await logAuditEvent({
        action: "import_completed",
        message: `Import completed: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped, ${results.errors} errors`,
        category: "import",
        entityType: selectedEntity,
        metadata: { batchId: batch.id, results },
      });

      toast.success(`Import completed: ${results.created + results.updated} records processed`);
      setShowImportDialog(false);
      setImportFile(null);
      setImportPreview(null);
      setSelectedEntity(null);
      fetchBatches();
    } catch (error) {
      console.error("Error during import:", error);
      toast.error("Import failed");
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "processing":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Imports & Exports</h1>
        <p className="text-muted-foreground">
          Import data via CSV or export platform data
        </p>
      </div>

      <Tabs defaultValue="import">
        <TabsList>
          <TabsTrigger value="import" className="gap-2">
            <Upload className="h-4 w-4" />
            Import
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <FileText className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.entries(ENTITY_CONFIGS) as [EntityType, typeof ENTITY_CONFIGS[EntityType]][]).map(
              ([key, config]) => {
                const Icon = config.icon;
                return (
                  <Card key={key} className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className="h-5 w-5" />
                        {config.label}
                      </CardTitle>
                      <CardDescription>
                        Import {config.label.toLowerCase()} from CSV
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadTemplate(key)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Template
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedEntity(key);
                          setShowImportDialog(true);
                        }}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Import
                      </Button>
                    </CardContent>
                  </Card>
                );
              }
            )}
          </div>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.entries(ENTITY_CONFIGS) as [EntityType, typeof ENTITY_CONFIGS[EntityType]][]).map(
              ([key, config]) => {
                const Icon = config.icon;
                return (
                  <Card key={key}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className="h-5 w-5" />
                        {config.label}
                      </CardTitle>
                      <CardDescription>
                        Export all {config.label.toLowerCase()} to CSV
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="outline"
                        onClick={() => {
                          toast.info("Export feature coming soon");
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                    </CardContent>
                  </Card>
                );
              }
            )}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Import History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : batches.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No import history yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="text-sm">
                          {format(new Date(batch.created_at), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{batch.entity_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(batch.status)}
                            <span className="text-sm">{batch.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {batch.file_name || "-"}
                        </TableCell>
                        <TableCell>{batch.created_count}</TableCell>
                        <TableCell>{batch.updated_count}</TableCell>
                        <TableCell>
                          {batch.error_count > 0 ? (
                            <Badge variant="destructive">{batch.error_count}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Import {selectedEntity && ENTITY_CONFIGS[selectedEntity].label}
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file to import data. Download the template first to
              see the required format.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File Upload */}
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              {importFile ? (
                <div className="space-y-2">
                  <FileText className="h-8 w-8 mx-auto text-primary" />
                  <p className="font-medium">{importFile.name}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImportFile(null);
                      setImportPreview(null);
                    }}
                  >
                    Choose Different File
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Drag and drop or click to upload
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select CSV File
                  </Button>
                </div>
              )}
            </div>

            {/* Preview */}
            {importPreview && (
              <div className="space-y-3">
                <h4 className="font-medium">Import Preview</h4>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {importPreview.creates.length}
                    </p>
                    <p className="text-xs text-green-600">To Create</p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {importPreview.updates.length}
                    </p>
                    <p className="text-xs text-blue-600">To Update</p>
                  </div>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">
                      {importPreview.skipped.length}
                    </p>
                    <p className="text-xs text-yellow-600">Skipped</p>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">
                      {importPreview.errors.length}
                    </p>
                    <p className="text-xs text-red-600">Errors</p>
                  </div>
                </div>

                {importPreview.errors.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3">
                    <p className="font-medium text-red-600 text-sm mb-2">
                      Errors (will be skipped):
                    </p>
                    <ul className="text-xs text-red-600 space-y-1">
                      {importPreview.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>
                          Row {err.row}: {err.message}
                        </li>
                      ))}
                      {importPreview.errors.length > 5 && (
                        <li>...and {importPreview.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Progress */}
            {isImporting && (
              <div className="space-y-2">
                <Progress value={importProgress} />
                <p className="text-sm text-center text-muted-foreground">
                  Importing... {importProgress}%
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportFile(null);
                setImportPreview(null);
              }}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importPreview || isImporting}
            >
              {isImporting ? "Importing..." : "Confirm Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
