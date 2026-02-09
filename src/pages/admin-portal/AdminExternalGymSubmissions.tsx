import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Check,
  X,
  Edit,
  Search,
  Loader2,
  Building2,
  Users,
  RefreshCw,
} from "lucide-react";

interface Submission {
  id: string;
  submitted_by_user_id: string;
  gym_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  website: string | null;
  status: string;
  admin_reason: string | null;
  gym_directory_id: string | null;
  created_at: string;
  submitter_count: number;
}

export default function AdminExternalGymSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Dialog states
  const [rejectDialog, setRejectDialog] = useState<{ sub: Submission } | null>(null);
  const [editDialog, setEditDialog] = useState<{ sub: Submission } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [editFields, setEditFields] = useState({ gym_name: "", contact_email: "", contact_phone: "", address: "", website: "" });
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("external_gym_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Count submitters per gym_name
      const nameCounts: Record<string, number> = {};
      (data || []).forEach((s: any) => {
        const key = s.gym_name.toLowerCase();
        nameCounts[key] = (nameCounts[key] || 0) + 1;
      });

      // Deduplicate: show one entry per unique gym_name, prefer pending
      const seen = new Set<string>();
      const deduped: Submission[] = [];

      // Sort: pending first
      const sorted = [...(data || [])].sort((a: any, b: any) => {
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (b.status === "pending" && a.status !== "pending") return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      sorted.forEach((s: any) => {
        const key = s.gym_name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push({
            ...s,
            submitter_count: nameCounts[key],
          });
        }
      });

      setSubmissions(deduped);
    } catch (err) {
      console.error("Error fetching submissions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleApprove = async (sub: Submission) => {
    setIsProcessing(true);
    try {
      // Create gym directory entry with is_enrolled = false
      const { data: newGym, error: gymError } = await supabase
        .from("gyms")
        .insert({
          name: sub.gym_name,
          contact_email: sub.contact_email,
          phone: sub.contact_phone,
          address: sub.address,
          website: sub.website,
          status: "active",
          is_enrolled: false,
        })
        .select()
        .single();

      if (gymError) throw gymError;

      // Update all matching submissions
      const { error: updateError } = await supabase
        .from("external_gym_submissions")
        .update({
          status: "approved",
          gym_directory_id: newGym.id,
        })
        .ilike("gym_name", sub.gym_name);

      if (updateError) throw updateError;

      // Link external cards to directory entry
      await supabase
        .from("external_gym_membership_cards")
        .update({ gym_directory_id: newGym.id })
        .ilike("gym_name", sub.gym_name);

      await logAuditEvent({
        action: "external_gym_submission_approved",
        message: `Approved external gym "${sub.gym_name}" and created directory entry`,
        category: "admin",
        severity: "info",
        entityType: "external_gym_submission",
        entityId: sub.id,
        metadata: { gym_directory_id: newGym.id },
      });

      toast.success(`"${sub.gym_name}" approved and added to directory`);
      fetchSubmissions();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("external_gym_submissions")
        .update({
          status: "rejected",
          admin_reason: rejectReason.trim() || null,
        })
        .eq("id", rejectDialog.sub.id);

      if (error) throw error;

      await logAuditEvent({
        action: "external_gym_submission_rejected",
        message: `Rejected external gym submission "${rejectDialog.sub.gym_name}"`,
        category: "admin",
        severity: "info",
        entityType: "external_gym_submission",
        entityId: rejectDialog.sub.id,
        metadata: { reason: rejectReason },
      });

      toast.success("Submission rejected");
      setRejectDialog(null);
      setRejectReason("");
      fetchSubmissions();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditSave = async () => {
    if (!editDialog) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("external_gym_submissions")
        .update({
          gym_name: editFields.gym_name.trim(),
          contact_email: editFields.contact_email.trim() || null,
          contact_phone: editFields.contact_phone.trim() || null,
          address: editFields.address.trim() || null,
          website: editFields.website.trim() || null,
        })
        .eq("id", editDialog.sub.id);

      if (error) throw error;

      toast.success("Submission updated");
      setEditDialog(null);
      fetchSubmissions();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setIsProcessing(false);
    }
  };

  const openEditDialog = (sub: Submission) => {
    setEditFields({
      gym_name: sub.gym_name,
      contact_email: sub.contact_email || "",
      contact_phone: sub.contact_phone || "",
      address: sub.address || "",
      website: sub.website || "",
    });
    setEditDialog({ sub });
  };

  const filtered = submissions.filter((s) => {
    const matchesSearch =
      s.gym_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusColor = (status: string) => {
    switch (status) {
      case "pending": return "secondary";
      case "approved": return "default";
      case "rejected": return "destructive";
      default: return "outline" as const;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            External Gym Submissions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve user-submitted external gym details
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSubmissions}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, email, or address..." className="pl-10" />
        </div>
        <div className="flex gap-1">
          {["all", "pending", "approved", "rejected"].map((s) => (
            <Button
              key={s}
              variant={filterStatus === s ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(s)}
              className="capitalize"
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No submissions found</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gym Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-center">
                  <Users className="h-4 w-4 inline mr-1" />
                  Submitters
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.gym_name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {sub.contact_email && <p>{sub.contact_email}</p>}
                      {sub.contact_phone && <p className="text-muted-foreground">{sub.contact_phone}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {sub.address || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{sub.submitter_count}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColor(sub.status) as any} className="capitalize">
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(sub.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    {sub.status === "pending" && (
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEditDialog(sub)} title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700" onClick={() => handleApprove(sub)} disabled={isProcessing} title="Approve">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { setRejectDialog({ sub }); setRejectReason(""); }} title="Reject">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {sub.status !== "pending" && (
                      <span className="text-xs text-muted-foreground">
                        {sub.admin_reason ? `Reason: ${sub.admin_reason}` : "—"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(o) => !o && setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Rejecting <strong>{rejectDialog?.sub.gym_name}</strong>. The user's card will remain but be marked as unverified.
            </p>
            <div>
              <Label>Reason (optional)</Label>
              <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Why is this submission being rejected?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing}>
              {isProcessing ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={(o) => !o && setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Submission Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Gym Name</Label>
              <Input value={editFields.gym_name} onChange={(e) => setEditFields((p) => ({ ...p, gym_name: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={editFields.contact_email} onChange={(e) => setEditFields((p) => ({ ...p, contact_email: e.target.value }))} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={editFields.contact_phone} onChange={(e) => setEditFields((p) => ({ ...p, contact_phone: e.target.value }))} />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={editFields.address} onChange={(e) => setEditFields((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={editFields.website} onChange={(e) => setEditFields((p) => ({ ...p, website: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={isProcessing}>
              {isProcessing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
