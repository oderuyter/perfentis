import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bell, Send, Plus, Users, Building2, Calendar } from "lucide-react";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function AdminNotifications() {
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState("all");

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleSendNotification = async () => {
    if (!title || !body || !user) {
      toast.error("Please fill in all fields");
      return;
    }

    const { error } = await supabase.from("admin_notifications").insert({
      title,
      body,
      target_type: targetType,
      created_by: user.id,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    if (error) {
      toast.error("Failed to send notification");
      return;
    }

    await logAuditEvent({
      action: "notification.sent",
      message: `Admin notification "${title}" sent to ${targetType}`,
      category: "notification",
      severity: "info",
      metadata: { targetType, title },
    });

    toast.success("Notification sent successfully");
    setIsCreateOpen(false);
    setTitle("");
    setBody("");
    setTargetType("all");
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Send and manage platform notifications</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Send Notification
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Send Notification</DialogTitle>
              <DialogDescription>
                Send a notification to platform users
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        All Users
                      </div>
                    </SelectItem>
                    <SelectItem value="gym_members">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Gym Members
                      </div>
                    </SelectItem>
                    <SelectItem value="event_registrants">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Event Registrants
                      </div>
                    </SelectItem>
                    <SelectItem value="coaches">Coaches</SelectItem>
                    <SelectItem value="admins">Admins Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="Notification title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  placeholder="Notification message..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendNotification}>
                <Send className="h-4 w-4 mr-2" />
                Send Now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent Today</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.filter((n) => 
                new Date(n.created_at).toDateString() === new Date().toDateString()
              ).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.filter((n) => n.status === "scheduled").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="sent">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.filter((n) => n.status === "sent").map((notification) => (
                      <TableRow key={notification.id}>
                        <TableCell className="font-medium">{notification.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {notification.target_type.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">Sent</Badge>
                        </TableCell>
                        <TableCell>
                          {notification.sent_at
                            ? new Date(notification.sent_at).toLocaleString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {notifications.filter((n) => n.status === "sent").length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No notifications sent yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                Scheduled notifications coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                Notification templates coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
