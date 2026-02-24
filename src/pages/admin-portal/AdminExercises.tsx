import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, MoreHorizontal, Download, Upload, Eye, Edit, Archive, Plus, Check, X, Loader2 } from "lucide-react";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { toast } from "sonner";
import { useMuscleTaxonomy } from "@/hooks/useMuscleTaxonomy";
import { RECORD_TYPE_LABELS } from "@/types/exercise";

export default function AdminExercises() {
  const queryClient = useQueryClient();
  const { muscleGroups, getGroupName } = useMuscleTaxonomy();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [reviewExercise, setReviewExercise] = useState<any | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: exercises = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-exercises"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filteredExercises = exercises.filter((ex: any) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || ex.type === typeFilter;
    const matchesStatus = statusFilter === "all" || ex.status === statusFilter;
    const matchesSource = sourceFilter === "all" || ex.source === sourceFilter;
    return matchesSearch && matchesType && matchesStatus && matchesSource;
  });

  const pendingCount = exercises.filter((ex: any) => ex.status === 'pending').length;

  const approveMutation = useMutation({
    mutationFn: async (exercise: any) => {
      const { error } = await supabase
        .from("exercises")
        .update({ 
          status: 'approved',
          source: 'system',
          admin_notes: adminNotes || null,
        })
        .eq("id", exercise.id);
      if (error) throw error;
      await logAuditEvent({
        action: "exercise.approved",
        message: `Exercise "${exercise.name}" approved`,
        category: "moderation",
        entityType: "exercise",
        entityId: exercise.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exercises"] });
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      toast.success("Exercise approved");
      setReviewExercise(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (exercise: any) => {
      const { error } = await supabase
        .from("exercises")
        .update({ 
          status: 'rejected',
          admin_notes: adminNotes || null,
        })
        .eq("id", exercise.id);
      if (error) throw error;
      await logAuditEvent({
        action: "exercise.rejected",
        message: `Exercise "${exercise.name}" rejected: ${adminNotes}`,
        category: "moderation",
        severity: "warn",
        entityType: "exercise",
        entityId: exercise.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exercises"] });
      toast.success("Exercise rejected");
      setReviewExercise(null);
    },
  });

  const handleDeprecate = async (exerciseId: string, name: string) => {
    const { error } = await supabase
      .from("exercises")
      .update({ is_active: false })
      .eq("id", exerciseId);
    if (error) { toast.error("Failed"); return; }
    await logAuditEvent({
      action: "exercise.deprecated",
      message: `Exercise "${name}" was deprecated`,
      category: "admin",
      severity: "warn",
      entityType: "exercise",
      entityId: exerciseId,
    });
    toast.success("Exercise deprecated");
    refetch();
  };

  const handleExportCSV = () => {
    const headers = ["name", "type", "record_type", "primary_muscle", "status", "source", "is_active"];
    const csvContent = [
      headers.join(","),
      ...exercises.map((ex: any) =>
        [
          `"${ex.name}"`,
          ex.type,
          ex.record_type || '',
          ex.primary_muscle || "",
          ex.status || 'approved',
          ex.source,
          ex.is_active,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "exercises_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge variant="default">Approved</Badge>;
      case 'pending': return <Badge variant="secondary">Pending</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Exercise Library</h1>
          <p className="text-muted-foreground">
            Manage exercises, approvals, and metadata
            {pendingCount > 0 && <Badge variant="secondary" className="ml-2">{pendingCount} pending</Badge>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" /> Add Exercise
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search exercises..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="strength">Strength</SelectItem>
                <SelectItem value="cardio">Cardio</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Record Type</TableHead>
                  <TableHead>Muscle</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExercises.map((exercise: any) => (
                  <TableRow key={exercise.id}>
                    <TableCell className="font-medium">{exercise.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{exercise.type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {RECORD_TYPE_LABELS[exercise.record_type as keyof typeof RECORD_TYPE_LABELS] || exercise.record_type || '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {exercise.primary_muscle_group_id
                        ? getGroupName(exercise.primary_muscle_group_id)
                        : exercise.primary_muscle?.replace(/_/g, " ") || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{exercise.source}</Badge>
                    </TableCell>
                    <TableCell>{statusBadge(exercise.status || 'approved')}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {exercise.status === 'pending' && (
                            <DropdownMenuItem onClick={() => { setReviewExercise(exercise); setAdminNotes(""); }}>
                              <Eye className="h-4 w-4 mr-2" /> Review
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                          {exercise.is_active && (
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeprecate(exercise.id, exercise.name)}>
                              <Archive className="h-4 w-4 mr-2" /> Deprecate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!reviewExercise} onOpenChange={() => setReviewExercise(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Review Exercise</DialogTitle></DialogHeader>
          {reviewExercise && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{reviewExercise.name}</p></div>
                <div><p className="text-xs text-muted-foreground">Type</p><p className="capitalize">{reviewExercise.type}</p></div>
                <div><p className="text-xs text-muted-foreground">Record Type</p><p>{RECORD_TYPE_LABELS[reviewExercise.record_type as keyof typeof RECORD_TYPE_LABELS] || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Source</p><p className="capitalize">{reviewExercise.source}</p></div>
              </div>
              {reviewExercise.instructions && (
                <div><p className="text-xs text-muted-foreground">Instructions</p><p className="text-sm">{reviewExercise.instructions}</p></div>
              )}
              <div>
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Notes for approval/rejection..." />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="destructive" onClick={() => reviewExercise && rejectMutation.mutate(reviewExercise)} disabled={rejectMutation.isPending}>
              <X className="h-4 w-4 mr-1" /> Reject
            </Button>
            <Button onClick={() => reviewExercise && approveMutation.mutate(reviewExercise)} disabled={approveMutation.isPending}>
              <Check className="h-4 w-4 mr-1" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
