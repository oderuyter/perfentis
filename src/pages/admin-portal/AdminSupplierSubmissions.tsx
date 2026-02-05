import { useState } from "react";
import { Check, X, Mail, Eye, Plus, MessageCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useSupplierSubmissions, useUpdateSubmission, useCreateOffer, type SupplierSubmission } from "@/hooks/useOffers";
import { toast } from "sonner";

export default function AdminSupplierSubmissions() {
  const [statusFilter, setStatusFilter] = useState<string>("new");
  const [selectedSubmission, setSelectedSubmission] = useState<SupplierSubmission | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  
  const { data: submissions, isLoading } = useSupplierSubmissions(statusFilter === "all" ? undefined : statusFilter);
  const { mutate: updateSubmission, isPending: isUpdating } = useUpdateSubmission();
  const { mutate: createOffer, isPending: isCreating } = useCreateOffer();
  
  const handleReview = (submission: SupplierSubmission) => {
    setSelectedSubmission(submission);
    setAdminNotes(submission.admin_notes || "");
    setShowReviewDialog(true);
  };
  
  const handleUpdateStatus = (status: 'new' | 'contacted' | 'approved' | 'rejected') => {
    if (!selectedSubmission) return;
    updateSubmission({ 
      id: selectedSubmission.id, 
      status, 
      admin_notes: adminNotes 
    }, {
      onSuccess: () => {
        setShowReviewDialog(false);
        setSelectedSubmission(null);
      }
    });
  };
  
  const handleCreateOfferFromSubmission = () => {
    if (!selectedSubmission) return;
    
    createOffer({
      title: selectedSubmission.description.slice(0, 50) + (selectedSubmission.description.length > 50 ? '...' : ''),
      brand_name: selectedSubmission.company_name,
      description_full: selectedSubmission.description,
      offer_type: selectedSubmission.proposed_code && selectedSubmission.proposed_affiliate_url 
        ? 'both' 
        : selectedSubmission.proposed_code 
          ? 'code' 
          : 'affiliate',
      discount_code: selectedSubmission.proposed_code || null,
      affiliate_url: selectedSubmission.proposed_affiliate_url || null,
      category_id: selectedSubmission.category_id,
      regions: selectedSubmission.regions,
      expires_at: selectedSubmission.expires_at,
      scope: 'global',
      featured: false
    }, {
      onSuccess: () => {
        // Mark submission as approved
        updateSubmission({ 
          id: selectedSubmission.id, 
          status: 'approved' as const, 
          admin_notes: adminNotes 
        });
        setShowReviewDialog(false);
        setSelectedSubmission(null);
        toast.success('Offer created from submission!');
      }
    });
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'default';
      case 'contacted': return 'secondary';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Supplier Submissions</h1>
        <p className="text-muted-foreground">Review partner offer submissions</p>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{submissions?.filter(s => s.status === 'new').length || 0}</div>
            <p className="text-sm text-muted-foreground">New</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{submissions?.filter(s => s.status === 'contacted').length || 0}</div>
            <p className="text-sm text-muted-foreground">Contacted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{submissions?.filter(s => s.status === 'approved').length || 0}</div>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{submissions?.filter(s => s.status === 'rejected').length || 0}</div>
            <p className="text-sm text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="contacted">Contacted</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-12 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : submissions && submissions.length > 0 ? (
              submissions.map((submission) => (
                <TableRow key={submission.id} className="cursor-pointer" onClick={() => handleReview(submission)}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{submission.company_name}</p>
                      {submission.website && (
                        <a 
                          href={submission.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {submission.website}
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{submission.contact_name}</p>
                      <p className="text-xs text-muted-foreground">{submission.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{submission.category?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(submission.status) as "default" | "secondary" | "destructive" | "outline"}>
                      {submission.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(submission.created_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No submissions found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      
      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
            <DialogDescription>
              {selectedSubmission?.company_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Contact</p>
                  <p className="font-medium">{selectedSubmission.contact_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <a href={`mailto:${selectedSubmission.email}`} className="font-medium text-primary hover:underline">
                    {selectedSubmission.email}
                  </a>
                </div>
                {selectedSubmission.phone && (
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedSubmission.phone}</p>
                  </div>
                )}
                {selectedSubmission.website && (
                  <div>
                    <p className="text-muted-foreground">Website</p>
                    <a href={selectedSubmission.website} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                      Visit
                    </a>
                  </div>
                )}
              </div>
              
              <div>
                <p className="text-muted-foreground text-sm mb-1">Description</p>
                <p className="text-sm">{selectedSubmission.description}</p>
              </div>
              
              {selectedSubmission.proposed_code && (
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Proposed Code</p>
                  <code className="bg-muted px-2 py-1 rounded text-sm">{selectedSubmission.proposed_code}</code>
                </div>
              )}
              
              {selectedSubmission.proposed_affiliate_url && (
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Proposed Affiliate URL</p>
                  <a href={selectedSubmission.proposed_affiliate_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    {selectedSubmission.proposed_affiliate_url}
                  </a>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes..."
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleUpdateStatus('contacted')}
              disabled={isUpdating}
            >
              <Mail className="h-4 w-4 mr-2" />
              Mark Contacted
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleUpdateStatus('rejected')}
              disabled={isUpdating}
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button 
              onClick={handleCreateOfferFromSubmission}
              disabled={isCreating || isUpdating}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
