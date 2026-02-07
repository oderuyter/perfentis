import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Check, X, Eye, Loader2 } from "lucide-react";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { toast } from "sonner";
import { MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS } from "@/types/exercise";

interface ExerciseSubmission {
  id: string;
  submitted_by: string;
  name: string;
  type: string;
  primary_muscle: string | null;
  secondary_muscles: string[];
  equipment: string[];
  modality: string | null;
  instructions: string | null;
  status: string;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export default function AdminExerciseSubmissions() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("submitted");
  const [reviewDialog, setReviewDialog] = useState<ExerciseSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("strength");
  const [editMuscle, setEditMuscle] = useState("");

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["admin-exercise-submissions", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("exercise_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ExerciseSubmission[];
    },
  });

  const filtered = submissions.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const approveMutation = useMutation({
    mutationFn: async (submission: ExerciseSubmission) => {
      // Create the exercise in the library
      const { data: newEx, error: exError } = await supabase
        .from("exercises")
        .insert({
          name: editName || submission.name,
          type: (editType || submission.type) as any,
          source: "system" as any,
          primary_muscle: (editMuscle || submission.primary_muscle || null) as any,
          secondary_muscles: (submission.secondary_muscles || []) as any,
          equipment: (submission.equipment || []) as any,
          supports_weight: (editType || submission.type) === "strength",
          supports_reps: (editType || submission.type) === "strength",
          supports_time: (editType || submission.type) === "cardio",
          supports_distance: (editType || submission.type) === "cardio",
        })
        .select("exercise_id")
        .single();

      if (exError) throw exError;

      // Update submission
      const { error } = await supabase
        .from("exercise_submissions")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          approved_exercise_id: newEx.exercise_id,
        })
        .eq("id", submission.id);

      if (error) throw error;

      await logAuditEvent({
        action: "exercise_submission.approved",
        message: `Approved exercise submission "${submission.name}"`,
        category: "moderation",
        entityType: "exercise_submission",
        entityId: submission.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exercise-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      toast.success("Exercise approved and added to library");
      setReviewDialog(null);
    },
    onError: () => toast.error("Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: async (submission: ExerciseSubmission) => {
      const { error } = await supabase
        .from("exercise_submissions")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason || "Does not meet library standards",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", submission.id);

      if (error) throw error;

      await logAuditEvent({
        action: "exercise_submission.rejected",
        message: `Rejected exercise submission "${submission.name}": ${rejectionReason}`,
        category: "moderation",
        severity: "warn",
        entityType: "exercise_submission",
        entityId: submission.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exercise-submissions"] });
      toast.success("Submission rejected");
      setReviewDialog(null);
      setRejectionReason("");
    },
    onError: () => toast.error("Failed to reject"),
  });

  const openReview = (s: ExerciseSubmission) => {
    setReviewDialog(s);
    setEditName(s.name);
    setEditType(s.type);
    setEditMuscle(s.primary_muscle || "");
    setRejectionReason("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exercise Submissions</h1>
        <p className="text-muted-foreground">Review exercises submitted by users and coaches</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No submissions found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Muscle</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{s.type}</Badge></TableCell>
                    <TableCell className="capitalize">{s.primary_muscle?.replace(/_/g, " ") || "—"}</TableCell>
                    <TableCell>{(s.equipment || []).join(", ") || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "approved" ? "default" : s.status === "rejected" ? "destructive" : "secondary"}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openReview(s)}>
                        <Eye className="h-4 w-4 mr-1" /> Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Exercise Submission</DialogTitle>
          </DialogHeader>
          {reviewDialog && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={editType} onValueChange={setEditType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="cardio">Cardio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Primary Muscle</label>
                <Select value={editMuscle} onValueChange={setEditMuscle}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MUSCLE_GROUP_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {reviewDialog.instructions && (
                <div>
                  <label className="text-sm font-medium">Instructions</label>
                  <p className="text-sm text-muted-foreground mt-1">{reviewDialog.instructions}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Rejection Reason (if rejecting)</label>
                <Textarea
                  placeholder="Reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => reviewDialog && rejectMutation.mutate(reviewDialog)}
              disabled={rejectMutation.isPending}
            >
              <X className="h-4 w-4 mr-1" /> Reject
            </Button>
            <Button
              onClick={() => reviewDialog && approveMutation.mutate(reviewDialog)}
              disabled={approveMutation.isPending}
            >
              <Check className="h-4 w-4 mr-1" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
