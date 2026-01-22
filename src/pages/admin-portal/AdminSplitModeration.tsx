import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, MoreHorizontal, Check, X, Eye, Star, Calendar, Layers } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import type { TrainingSplit, WorkoutTemplateStatus } from "@/types/workout-templates";

const STATUS_COLORS: Record<WorkoutTemplateStatus, string> = {
  private: "bg-muted text-muted-foreground",
  submitted: "bg-yellow-500/20 text-yellow-600",
  approved: "bg-green-500/20 text-green-600",
  rejected: "bg-red-500/20 text-red-600",
};

export default function AdminSplitModeration() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [selectedSplit, setSelectedSplit] = useState<TrainingSplit | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch splits based on tab
  const { data: splits = [], isLoading } = useQuery({
    queryKey: ['admin-training-splits', activeTab],
    queryFn: async () => {
      let query = supabase
        .from('training_splits')
        .select(`
          *,
          split_weeks (
            id,
            split_workouts (id)
          )
        `)
        .order('created_at', { ascending: false });

      switch (activeTab) {
        case 'pending':
          query = query.eq('status', 'submitted');
          break;
        case 'approved':
          query = query.eq('status', 'approved');
          break;
        case 'rejected':
          query = query.eq('status', 'rejected');
          break;
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TrainingSplit[];
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (splitId: string) => {
      const { error } = await supabase
        .from('training_splits')
        .update({ status: 'approved', rejection_reason: null })
        .eq('id', splitId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-training-splits'] });
      toast.success('Split approved');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ splitId, reason }: { splitId: string; reason: string }) => {
      const { error } = await supabase
        .from('training_splits')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', splitId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-training-splits'] });
      setShowRejectDialog(false);
      setRejectionReason("");
      toast.success('Split rejected');
    },
  });

  // Feature as curated
  const featureMutation = useMutation({
    mutationFn: async (splitId: string) => {
      const { error } = await supabase
        .from('training_splits')
        .update({ is_curated: true })
        .eq('id', splitId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-training-splits'] });
      toast.success('Split featured as curated');
    },
  });

  const filteredSplits = splits.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleReject = () => {
    if (selectedSplit && rejectionReason.trim()) {
      rejectMutation.mutate({ 
        splitId: selectedSplit.id, 
        reason: rejectionReason.trim() 
      });
    }
  };

  const getTotalWorkouts = (split: TrainingSplit) => {
    return split.split_weeks?.reduce(
      (sum, w) => sum + ((w as any).split_workouts?.length || 0),
      0
    ) || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Split Moderation</h1>
          <p className="text-muted-foreground">Review and approve community training split submissions</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search splits..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredSplits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No splits found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Split</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Workouts</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSplits.map((split) => (
                    <TableRow key={split.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{split.title}</p>
                          {split.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {split.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3.5 w-3.5" />
                          {split.weeks_count || '?'} weeks
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTotalWorkouts(split)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(split.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[split.status]}>
                          {split.status}
                        </Badge>
                        {split.is_curated && (
                          <Badge variant="secondary" className="ml-1">
                            <Star className="h-3 w-3 mr-1" />
                            Curated
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {split.status === 'submitted' && (
                              <>
                                <DropdownMenuItem 
                                  onClick={() => approveMutation.mutate(split.id)}
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedSplit(split);
                                    setShowRejectDialog(true);
                                  }}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            {split.status === 'approved' && !split.is_curated && (
                              <DropdownMenuItem 
                                onClick={() => featureMutation.mutate(split.id)}
                              >
                                <Star className="h-4 w-4 mr-2" />
                                Feature as Curated
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
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Split</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This will be visible to the submitter.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
