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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Flag, Trash2, UserX, Eye, AlertTriangle, EyeOff, CheckCircle } from "lucide-react";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { useAdminSocialData, useAdminModerationAction, useHidePost, useDeletePost } from "@/hooks/useSocial";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  inappropriate_content: "Inappropriate",
  other: "Other",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  open: "destructive",
  reviewed: "secondary",
  actioned: "default",
};

export default function AdminSocial() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [banTarget, setBanTarget] = useState<{ userId: string; displayName: string } | null>(null);
  const [banType, setBanType] = useState<"warn" | "temp" | "permanent">("warn");
  const [banReason, setBanReason] = useState("");
  const [resolveTarget, setResolveTarget] = useState<string | null>(null);

  const { data, isLoading, refetch } = useAdminSocialData();
  const moderationAction = useAdminModerationAction();
  const hidePost = useHidePost();
  const deletePost = useDeletePost();

  const reports = data?.reports || [];
  const openReports = reports.filter((r) => r.status === "open");
  const reviewedReports = reports.filter((r) => r.status !== "open");

  const removedPosts = data?.allPosts?.filter((p) => p.deleted_at)?.length || 0;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const removedToday = data?.allPosts?.filter(
    (p) => p.deleted_at && new Date(p.deleted_at) >= todayStart
  )?.length || 0;

  const filteredReports = openReports.filter((r) =>
    searchQuery === "" ||
    r.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.target_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRemoveContent = async (postId: string) => {
    await deletePost.mutateAsync(postId);
    await logAuditEvent({
      action: "social.content_removed",
      message: `Social post ${postId} was removed by admin`,
      category: "moderation",
      severity: "warn",
      entityType: "social_post",
      entityId: postId,
    });
    refetch();
  };

  const handleHideContent = async (postId: string) => {
    await hidePost.mutateAsync({ postId, hide: true });
    await moderationAction.mutateAsync({
      action_type: "hide",
      target_type: "post",
      target_id: postId,
      reason: "Admin moderation",
    });
    refetch();
  };

  const handleResolveReport = async (reportId: string) => {
    const { error } = await supabase
      .from("social_reports")
      .update({ status: "actioned", reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
      .eq("id", reportId);
    if (error) { toast.error("Failed to resolve report"); return; }
    toast.success("Report resolved");
    refetch();
    setResolveTarget(null);
  };

  const handleBanUser = async () => {
    if (!banTarget || !user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("social_user_bans") as any).insert({
      user_id: banTarget.userId,
      ban_type: banType,
      reason: banReason || null,
      created_by: user.id,
      expires_at: banType === "temp" ? new Date(Date.now() + 7 * 86400_000).toISOString() : null,
    });

    if (error) { toast.error("Failed to apply sanction"); return; }
    await logAuditEvent({
      action: "user.social_sanction",
      message: `User sanctioned: ${banType} ban for ${banTarget.displayName}`,
      category: "moderation",
      severity: banType === "permanent" ? "error" : "warn",
      entityType: "user",
      entityId: banTarget.userId,
    });
    await moderationAction.mutateAsync({
      action_type: banType === "permanent" ? "perm_ban" : banType === "temp" ? "temp_ban" : "warn_user",
      target_type: "user",
      target_id: banTarget.userId,
      reason: banReason,
    });
    toast.success(`Sanction applied: ${banType}`);
    setBanTarget(null);
    setBanReason("");
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Social Moderation</h1>
          <p className="text-muted-foreground">Review and moderate community content</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Reports</CardTitle>
            <Flag className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openReports.length}</div>
            <p className="text-xs text-muted-foreground">Pending review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewedReports.length}</div>
            <p className="text-xs text-muted-foreground">Reports actioned</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Removed Today</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{removedToday}</div>
            <p className="text-xs text-muted-foreground">Posts removed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Removed</CardTitle>
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{removedPosts}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="flagged" className="space-y-4">
        <TabsList>
          <TabsTrigger value="flagged" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Reports Queue
            {openReports.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                {openReports.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        <TabsContent value="flagged">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <CardTitle>Flagged Content</CardTitle>
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter reports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No open reports. All clear!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[180px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {report.target_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {REASON_LABELS[report.reason] || report.reason}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                          {report.details || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANTS[report.status] || "secondary"}>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(report.created_at), "d MMM")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {/* View */}
                            <Button variant="ghost" size="icon" title="View content">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {/* Hide */}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Hide content"
                              onClick={() => {
                                if (report.target_type === "post") handleHideContent(report.target_id);
                              }}
                              disabled={report.target_type !== "post"}
                            >
                              <EyeOff className="h-4 w-4" />
                            </Button>
                            {/* Remove */}
                            <AlertDialog>
                              <AlertDialogAction
                                asChild
                                className="bg-transparent border-0 p-0"
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  title="Remove content"
                                  onClick={() => {
                                    if (report.target_type === "post") handleRemoveContent(report.target_id);
                                  }}
                                  disabled={report.target_type !== "post"}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogAction>
                            </AlertDialog>
                            {/* Sanction user */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              title="Sanction user"
                              onClick={() => setBanTarget({ userId: report.reporter_user_id, displayName: "User" })}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                            {/* Resolve */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-primary"
                              title="Mark resolved"
                              onClick={() => setResolveTarget(report.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolved">
          <Card>
            <CardHeader>
              <CardTitle>Resolved Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {reviewedReports.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">No resolved reports yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reported</TableHead>
                      <TableHead>Resolved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviewedReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{report.target_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{REASON_LABELS[report.reason] || report.reason}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANTS[report.status] || "secondary"}>{report.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(report.created_at), "d MMM")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {report.reviewed_at ? format(new Date(report.reviewed_at), "d MMM") : "—"}
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

      {/* Resolve report dialog */}
      <AlertDialog open={!!resolveTarget} onOpenChange={() => setResolveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Resolved?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the report as actioned and remove it from the open queue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => resolveTarget && handleResolveReport(resolveTarget)}>
              Resolve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ban / sanction dialog */}
      <AlertDialog open={!!banTarget} onOpenChange={() => setBanTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply User Sanction</AlertDialogTitle>
            <AlertDialogDescription>
              Choose the type of sanction to apply to this user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 my-2">
            <Select value={banType} onValueChange={(v) => setBanType(v as typeof banType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="temp">Temporary Ban (7 days)</SelectItem>
                <SelectItem value="permanent">Permanent Ban</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Reason (optional)"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBanUser}
              className="bg-destructive text-destructive-foreground"
            >
              Apply Sanction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
