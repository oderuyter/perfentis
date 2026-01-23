import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  Users, 
  Search,
  MoreVertical,
  UserPlus,
  Check,
  X,
  Loader2,
  Clock,
  AlertCircle,
  Flame,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RunClub, useRunClubManagement } from "@/hooks/useRunClubs";
import { useMemberAttendanceStats } from "@/hooks/useRunClubAttendance";
import { MemberAttendanceHistory } from "@/components/run-clubs/MemberAttendanceHistory";
import { toast } from "sonner";

interface RunClubPortalContext {
  selectedClubId: string | null;
  selectedClub: RunClub | null;
}

export default function RunClubMembers() {
  const { selectedClubId } = useOutletContext<RunClubPortalContext>();
  const { 
    members, 
    applications, 
    isLoading,
    approveApplication,
    rejectApplication,
    suspendMember,
    reinstateMember
  } = useRunClubManagement(selectedClubId);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("members");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [memberDetailSheet, setMemberDetailSheet] = useState<{
    open: boolean;
    userId: string | null;
    displayName: string | null;
  }>({ open: false, userId: null, displayName: null });

  if (!selectedClubId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a run club</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingApplications = applications.filter(a => a.status === 'pending');
  const activeMembers = members.filter(m => m.status === 'active');
  const suspendedMembers = members.filter(m => m.status === 'suspended');

  const filteredMembers = activeMembers.filter(m => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    const name = ((m as any).profile?.display_name || '').toLowerCase();
    return name.includes(search);
  });

  const handleApprove = async (applicationId: string) => {
    setProcessing(applicationId);
    try {
      await approveApplication(applicationId);
      toast.success("Application approved!");
    } catch (error) {
      console.error("Error approving application:", error);
      toast.error("Failed to approve application");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedItem) return;
    setProcessing(selectedItem);
    try {
      await rejectApplication(selectedItem, reason || undefined);
      toast.success("Application rejected");
      setRejectDialogOpen(false);
      setReason("");
      setSelectedItem(null);
    } catch (error) {
      console.error("Error rejecting application:", error);
      toast.error("Failed to reject application");
    } finally {
      setProcessing(null);
    }
  };

  const handleSuspend = async () => {
    if (!selectedItem) return;
    setProcessing(selectedItem);
    try {
      await suspendMember(selectedItem, reason || undefined);
      toast.success("Member suspended");
      setSuspendDialogOpen(false);
      setReason("");
      setSelectedItem(null);
    } catch (error) {
      console.error("Error suspending member:", error);
      toast.error("Failed to suspend member");
    } finally {
      setProcessing(null);
    }
  };

  const handleReinstate = async (memberId: string) => {
    setProcessing(memberId);
    try {
      await reinstateMember(memberId);
      toast.success("Member reinstated");
    } catch (error) {
      console.error("Error reinstating member:", error);
      toast.error("Failed to reinstate member");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Members</h2>
        <p className="text-muted-foreground">
          Manage your club members and applications
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members ({activeMembers.length})
          </TabsTrigger>
          <TabsTrigger value="applications" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Applications
            {pendingApplications.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingApplications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="suspended" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Suspended ({suspendedMembers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Members List */}
          <div className="space-y-2">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No members found</p>
              </div>
            ) : (
              filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setMemberDetailSheet({
                    open: true,
                    userId: member.user_id,
                    displayName: (member as any).profile?.display_name || 'Unknown Member'
                  })}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={(member as any).profile?.avatar_url} />
                      <AvatarFallback>
                        {((member as any).profile?.display_name || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {(member as any).profile?.display_name || 'Unknown Member'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(member.id);
                            setSuspendDialogOpen(true);
                          }}
                          className="text-destructive"
                        >
                          Suspend Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="applications" className="mt-4 space-y-4">
          {pendingApplications.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No pending applications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApplications.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-4 bg-card border border-border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={(app as any).profile?.avatar_url} />
                      <AvatarFallback>
                        {((app as any).profile?.display_name || app.applicant_name || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {(app as any).profile?.display_name || app.applicant_name || 'Unknown'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Applied {new Date(app.applied_at).toLocaleDateString()}
                      </p>
                      {app.message && (
                        <p className="text-sm text-muted-foreground mt-1 italic">
                          "{app.message}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(app.id)}
                      disabled={processing === app.id}
                    >
                      {processing === app.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedItem(app.id);
                        setRejectDialogOpen(true);
                      }}
                      disabled={processing === app.id}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="suspended" className="mt-4 space-y-4">
          {suspendedMembers.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No suspended members</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suspendedMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-card border border-border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={(member as any).profile?.avatar_url} />
                      <AvatarFallback>
                        {((member as any).profile?.display_name || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {(member as any).profile?.display_name || 'Unknown'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Suspended {member.suspended_at && new Date(member.suspended_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReinstate(member.id)}
                    disabled={processing === member.id}
                  >
                    {processing === member.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Reinstate"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Optionally provide a reason for rejection
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason (optional)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Member</DialogTitle>
            <DialogDescription>
              This will temporarily remove the member's access
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason (optional)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSuspend}>
              Suspend Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Detail Sheet with Attendance */}
      <MemberAttendanceSheet
        open={memberDetailSheet.open}
        onOpenChange={(open) => setMemberDetailSheet({ ...memberDetailSheet, open })}
        clubId={selectedClubId}
        userId={memberDetailSheet.userId}
        displayName={memberDetailSheet.displayName}
      />
    </div>
  );
}

// Separate component to use the hook properly
function MemberAttendanceSheet({
  open,
  onOpenChange,
  clubId,
  userId,
  displayName
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: string | null;
  userId: string | null;
  displayName: string | null;
}) {
  const { stats, history, isLoading } = useMemberAttendanceStats(
    open ? clubId : null,
    userId || undefined
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {displayName || 'Member'}
          </SheetTitle>
        </SheetHeader>
        <div className="py-4">
          <MemberAttendanceHistory
            stats={stats}
            history={history}
            isLoading={isLoading}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
