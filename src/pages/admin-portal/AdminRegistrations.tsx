import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Building2,
  GraduationCap,
  Flag,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { createNotification } from "@/lib/notifications";

interface RegistrationRequest {
  id: string;
  request_type: string;
  user_id: string;
  status: string;
  name: string;
  description: string | null;
  reason: string | null;
  // Gym fields
  gym_address_line1: string | null;
  gym_address_city: string | null;
  gym_email: string | null;
  is_owner_or_manager: boolean | null;
  // Coach fields
  coach_bio: string | null;
  coach_specialties: string[] | null;
  coach_hourly_rate: number | null;
  coach_location: string | null;
  coach_delivery_type: string | null;
  // Event fields
  event_start_date: string | null;
  event_end_date: string | null;
  event_location: string | null;
  event_type: string | null;
  event_mode: string | null;
  // Review fields
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_entity_id: string | null;
  created_at: string;
  // Joined data
  user_email?: string;
  user_name?: string;
}

export default function AdminRegistrations() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data: requestsData, error } = await supabase
        .from("registration_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user emails
      const userIds = [...new Set((requestsData || []).map((r) => r.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const profileMap = new Map<string, string>();
      (profilesData || []).forEach((p) => {
        profileMap.set(p.user_id, p.display_name || "Unknown");
      });

      const enrichedRequests = (requestsData || []).map((r) => ({
        ...r,
        user_name: profileMap.get(r.user_id) || "Unknown",
      }));

      setRequests(enrichedRequests);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load registration requests");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (request: RegistrationRequest) => {
    if (!user) return;
    setIsProcessing(true);

    try {
      let createdEntityId: string | null = null;

      // Create the entity based on request type
      if (request.request_type === "gym") {
        const addressParts = [
          request.gym_address_line1,
          request.gym_address_city,
        ].filter(Boolean);
        
        const { data: gymData, error: gymError } = await supabase
          .from("gyms")
          .insert({
            name: request.name,
            description: request.description,
            address: addressParts.join(", ") || null,
            address_line1: request.gym_address_line1,
            address_city: request.gym_address_city,
            email: request.gym_email,
            owner_id: request.is_owner_or_manager ? request.user_id : null,
            status: "active",
            approval_status: "approved",
          })
          .select()
          .single();

        if (gymError) throw gymError;
        createdEntityId = gymData.id;

        // Assign gym_manager role if owner/manager
        if (request.is_owner_or_manager) {
          await supabase.from("user_roles").insert([
            {
              user_id: request.user_id,
              role: "gym_manager",
              scope_type: "gym",
              scope_id: gymData.id,
              is_active: true,
            },
            {
              user_id: request.user_id,
              role: "event_organiser",
              scope_type: "global",
              is_active: true,
            },
          ]);

          // Add to gym_staff
          await supabase.from("gym_staff").insert({
            gym_id: gymData.id,
            user_id: request.user_id,
            position: "owner",
            is_active: true,
          });
        }
      } else if (request.request_type === "coach") {
        const { data: coachData, error: coachError } = await supabase
          .from("coaches")
          .insert({
            user_id: request.user_id,
            display_name: request.name,
            bio: request.coach_bio,
            specialties: request.coach_specialties,
            hourly_rate: request.coach_hourly_rate,
            location: request.coach_location,
            delivery_type: request.coach_delivery_type,
            is_public: true,
          })
          .select()
          .single();

        if (coachError) throw coachError;
        createdEntityId = coachData.id;

        // Coach role is auto-assigned by the ensure_coach_role trigger
      } else if (request.request_type === "event") {
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .insert({
            title: request.name,
            description: request.description,
            organiser_id: request.user_id,
            start_date: request.event_start_date,
            end_date: request.event_end_date,
            location: request.event_location,
            event_type: request.event_type,
            event_mode: request.event_mode,
            status: "draft",
          })
          .select()
          .single();

        if (eventError) throw eventError;
        createdEntityId = eventData.id;

        // Assign event_organiser role
        await supabase.from("user_roles").insert({
          user_id: request.user_id,
          role: "event_organiser",
          scope_type: "event",
          scope_id: eventData.id,
          is_active: true,
        });

        // Notify submitter to complete setup
        await createNotification({
          userId: request.user_id,
          title: "Event approved",
          body: `Your event "${request.name}" has been approved. Please review and complete the details before publishing.`,
          type: "event",
          entityType: "event",
          entityId: eventData.id,
          actionUrl: "/event-portal/events",
        });
      }

      // Update the request
      const { error: updateError } = await supabase
        .from("registration_requests")
        .update({
          status: "approved",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          created_entity_id: createdEntityId,
        })
        .eq("id", request.id);

      if (updateError) throw updateError;

      await logAuditEvent({
        action: "registration_approved",
        message: `Approved ${request.request_type} registration: ${request.name}`,
        category: "admin",
        entityType: request.request_type,
        entityId: createdEntityId || request.id,
      });

      toast.success(`${request.request_type} registration approved!`);
      fetchRequests();
      setShowDetailDialog(false);
    } catch (error: any) {
      console.error("Error approving request:", error);
      toast.error(error.message || "Failed to approve request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!user || !selectedRequest) return;
    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from("registration_requests")
        .update({
          status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason.trim() || null,
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      await logAuditEvent({
        action: "registration_rejected",
        message: `Rejected ${selectedRequest.request_type} registration: ${selectedRequest.name}`,
        category: "admin",
        entityType: selectedRequest.request_type,
        entityId: selectedRequest.id,
      });

      toast.success("Registration rejected");
      fetchRequests();
      setShowRejectDialog(false);
      setShowDetailDialog(false);
      setRejectionReason("");
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      toast.error(error.message || "Failed to reject request");
    } finally {
      setIsProcessing(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "gym":
        return <Building2 className="h-4 w-4" />;
      case "coach":
        return <GraduationCap className="h-4 w-4" />;
      case "event":
        return <Flag className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 gap-1"><CheckCircle className="h-3 w-3" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesTab = r.status === activeTab;
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.user_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Registration Requests</h1>
          <p className="text-muted-foreground">
            Review and approve gym, coach, and event registrations
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-lg px-3 py-1">
            {pendingCount} pending
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Gym Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {requests.filter((r) => r.request_type === "gym" && r.status === "pending").length}
            </p>
            <p className="text-xs text-muted-foreground">pending review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Coach Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {requests.filter((r) => r.request_type === "coach" && r.status === "pending").length}
            </p>
            <p className="text-xs text-muted-foreground">pending review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Event Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {requests.filter((r) => r.request_type === "event" && r.status === "pending").length}
            </p>
            <p className="text-xs text-muted-foreground">pending review</p>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Requests</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList>
              <TabsTrigger value="pending" className="gap-2">
                Pending
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-1">{pendingCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No {activeTab} requests found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Submitted By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(request.request_type)}
                            <span className="capitalize">{request.request_type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{request.name}</TableCell>
                        <TableCell>{request.user_name}</TableCell>
                        <TableCell>
                          {format(new Date(request.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowDetailDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRequest && getTypeIcon(selectedRequest.request_type)}
              {selectedRequest?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.request_type.charAt(0).toUpperCase() + selectedRequest?.request_type.slice(1)} Registration Request
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Submitted By</Label>
                  <p className="font-medium">{selectedRequest.user_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-medium">
                    {format(new Date(selectedRequest.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>

              {selectedRequest.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p>{selectedRequest.description}</p>
                </div>
              )}

              {selectedRequest.reason && (
                <div>
                  <Label className="text-muted-foreground">Reason for Registration</Label>
                  <p className="p-3 bg-muted rounded-lg">{selectedRequest.reason}</p>
                </div>
              )}

              {/* Type-specific fields */}
              {selectedRequest.request_type === "gym" && (
                <div className="space-y-3 border-t pt-3">
                  <h4 className="font-medium">Gym Details</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedRequest.gym_address_line1 && (
                      <div>
                        <Label className="text-muted-foreground">Address</Label>
                        <p>{selectedRequest.gym_address_line1}</p>
                      </div>
                    )}
                    {selectedRequest.gym_address_city && (
                      <div>
                        <Label className="text-muted-foreground">City</Label>
                        <p>{selectedRequest.gym_address_city}</p>
                      </div>
                    )}
                    {selectedRequest.gym_email && (
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <p>{selectedRequest.gym_email}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-muted-foreground">Owner/Manager?</Label>
                      <p>{selectedRequest.is_owner_or_manager ? "Yes" : "No (just adding to directory)"}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedRequest.request_type === "coach" && (
                <div className="space-y-3 border-t pt-3">
                  <h4 className="font-medium">Coach Details</h4>
                  {selectedRequest.coach_bio && (
                    <div>
                      <Label className="text-muted-foreground">Bio</Label>
                      <p className="text-sm">{selectedRequest.coach_bio}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedRequest.coach_specialties && (
                      <div>
                        <Label className="text-muted-foreground">Specialties</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedRequest.coach_specialties.map((s) => (
                            <Badge key={s} variant="secondary" className="text-xs">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedRequest.coach_hourly_rate && (
                      <div>
                        <Label className="text-muted-foreground">Hourly Rate</Label>
                        <p>£{selectedRequest.coach_hourly_rate}</p>
                      </div>
                    )}
                    {selectedRequest.coach_location && (
                      <div>
                        <Label className="text-muted-foreground">Location</Label>
                        <p>{selectedRequest.coach_location}</p>
                      </div>
                    )}
                    {selectedRequest.coach_delivery_type && (
                      <div>
                        <Label className="text-muted-foreground">Delivery Type</Label>
                        <p className="capitalize">{selectedRequest.coach_delivery_type}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedRequest.request_type === "event" && (
                <div className="space-y-3 border-t pt-3">
                  <h4 className="font-medium">Event Details</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedRequest.event_type && (
                      <div>
                        <Label className="text-muted-foreground">Type</Label>
                        <p className="capitalize">{selectedRequest.event_type}</p>
                      </div>
                    )}
                    {selectedRequest.event_mode && (
                      <div>
                        <Label className="text-muted-foreground">Mode</Label>
                        <p className="capitalize">{selectedRequest.event_mode}</p>
                      </div>
                    )}
                    {selectedRequest.event_start_date && (
                      <div>
                        <Label className="text-muted-foreground">Start Date</Label>
                        <p>{format(new Date(selectedRequest.event_start_date), "MMM d, yyyy")}</p>
                      </div>
                    )}
                    {selectedRequest.event_end_date && (
                      <div>
                        <Label className="text-muted-foreground">End Date</Label>
                        <p>{format(new Date(selectedRequest.event_end_date), "MMM d, yyyy")}</p>
                      </div>
                    )}
                    {selectedRequest.event_location && (
                      <div className="col-span-2">
                        <Label className="text-muted-foreground">Location</Label>
                        <p>{selectedRequest.event_location}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedRequest.status === "rejected" && selectedRequest.rejection_reason && (
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <Label className="text-destructive">Rejection Reason</Label>
                  <p className="text-sm">{selectedRequest.rejection_reason}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedRequest?.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectDialog(true);
                  }}
                  disabled={isProcessing}
                >
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprove(selectedRequest)}
                  disabled={isProcessing}
                >
                  {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Approve
                </Button>
              </>
            )}
            {selectedRequest?.status !== "pending" && (
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Registration</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this registration. This will be visible to the applicant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rejection Reason (Optional)</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this registration is being rejected..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing}>
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
