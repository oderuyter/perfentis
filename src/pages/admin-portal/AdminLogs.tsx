import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Search, Download, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  created_at: string;
  severity: string;
  category: string;
  action: string;
  actor_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  message: string;
  metadata: Record<string, unknown>;
}

const CATEGORIES = [
  "admin",
  "system",
  "security",
  "notification",
  "billing",
  "event",
  "import",
  "moderation",
];

const SEVERITIES = ["info", "warn", "error"];

const DATE_RANGES = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

export default function AdminLogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(
    searchParams.get("category") || "all"
  );
  const [severityFilter, setSeverityFilter] = useState(
    searchParams.get("severity") || "all"
  );
  const [dateRange, setDateRange] = useState(7);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    fetchLogs();
  }, [categoryFilter, severityFilter, dateRange, page]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const startDate = startOfDay(subDays(new Date(), dateRange));
      const endDate = endOfDay(new Date());

      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      if (severityFilter !== "all") {
        query = query.eq("severity", severityFilter);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setLogs((data || []) as AuditLog[]);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching logs:", error);
      toast.error("Failed to load logs");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(
    (log) =>
      !searchQuery ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportLogs = () => {
    const csvData = filteredLogs.map((log) => ({
      timestamp: log.created_at,
      severity: log.severity,
      category: log.category,
      action: log.action,
      message: `"${log.message.replace(/"/g, '""')}"`,
      entity_type: log.entity_type || "",
      entity_id: log.entity_id || "",
      actor_id: log.actor_id || "",
    }));

    const headers = Object.keys(csvData[0] || {}).join(",");
    const rows = csvData.map((row) => Object.values(row).join(",")).join("\n");
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case "error":
        return "destructive";
      case "warn":
        return "secondary";
      default:
        return "outline";
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Logs & Audit</h1>
          <p className="text-muted-foreground">
            View and search platform audit logs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLogs} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                {SEVERITIES.map((sev) => (
                  <SelectItem key={sev} value={sev}>
                    {sev.charAt(0).toUpperCase() + sev.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(dateRange)}
              onValueChange={(v) => setDateRange(Number(v))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((range) => (
                  <SelectItem key={range.days} value={String(range.days)}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            Logs ({totalCount.toLocaleString()})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="min-w-[300px]">Message</TableHead>
                    <TableHead>Entity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedLog(log)}
                    >
                      <TableCell className="text-sm font-mono">
                        {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeverityVariant(log.severity) as any}>
                          {log.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.category}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.action}
                      </TableCell>
                      <TableCell className="max-w-[400px] truncate">
                        {log.message}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.entity_type && (
                          <span>
                            {log.entity_type}
                            {log.entity_id && (
                              <span className="font-mono">
                                :{log.entity_id.slice(0, 8)}
                              </span>
                            )}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Sheet */}
      <Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Log Details</SheetTitle>
            <SheetDescription>
              {selectedLog &&
                format(new Date(selectedLog.created_at), "PPP 'at' HH:mm:ss")}
            </SheetDescription>
          </SheetHeader>
          {selectedLog && (
            <div className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Severity</Label>
                  <p className="mt-1">
                    <Badge variant={getSeverityVariant(selectedLog.severity) as any}>
                      {selectedLog.severity}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <p className="mt-1">
                    <Badge variant="outline">{selectedLog.category}</Badge>
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Action</Label>
                <p className="mt-1 font-mono text-sm bg-muted px-2 py-1 rounded">
                  {selectedLog.action}
                </p>
              </div>

              <div>
                <Label className="text-muted-foreground">Message</Label>
                <p className="mt-1">{selectedLog.message}</p>
              </div>

              {selectedLog.entity_type && (
                <div>
                  <Label className="text-muted-foreground">Entity</Label>
                  <p className="mt-1">
                    <span className="font-medium">{selectedLog.entity_type}</span>
                    {selectedLog.entity_id && (
                      <span className="ml-2 font-mono text-sm text-muted-foreground">
                        {selectedLog.entity_id}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {selectedLog.actor_id && (
                <div>
                  <Label className="text-muted-foreground">Actor</Label>
                  <p className="mt-1 font-mono text-sm">{selectedLog.actor_id}</p>
                </div>
              )}

              {selectedLog.metadata &&
                Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Metadata</Label>
                    <pre className="mt-1 p-3 bg-muted rounded-lg overflow-x-auto text-xs">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
