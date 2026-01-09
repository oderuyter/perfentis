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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Search, Flag, Trash2, UserX, Eye, AlertTriangle } from "lucide-react";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { toast } from "sonner";

// Placeholder data
const mockPosts = [
  { id: "1", author: "John Doe", content: "Great workout today!", flags: 0, status: "active", createdAt: "2024-01-15" },
  { id: "2", author: "Jane Smith", content: "Check out my new PR!", flags: 2, status: "flagged", createdAt: "2024-01-14" },
  { id: "3", author: "Mike Johnson", content: "Looking for workout partners", flags: 0, status: "active", createdAt: "2024-01-13" },
];

const mockFlagged = [
  { id: "2", author: "Jane Smith", content: "Suspicious promotional content...", reason: "Spam", reportedBy: 2, createdAt: "2024-01-14" },
  { id: "4", author: "Anonymous", content: "Inappropriate language used...", reason: "Harassment", reportedBy: 3, createdAt: "2024-01-12" },
];

export default function AdminSocial() {
  const [searchQuery, setSearchQuery] = useState("");

  const handleRemoveContent = async (postId: string) => {
    await logAuditEvent({
      action: "social.content_removed",
      message: `Social post ${postId} was removed by admin`,
      category: "moderation",
      severity: "warn",
      entityType: "social_post",
      entityId: postId,
    });
    toast.success("Content removed");
  };

  const handleSuspendUser = async (userId: string, username: string) => {
    await logAuditEvent({
      action: "user.suspended",
      message: `User ${username} was suspended for social violations`,
      category: "moderation",
      severity: "error",
      entityType: "user",
      entityId: userId,
    });
    toast.success("User suspended");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Social Moderation</h1>
          <p className="text-muted-foreground">Review and moderate social content</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged Content</CardTitle>
            <Flag className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Pending review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Removed Today</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Posts removed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended Users</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="flagged" className="space-y-4">
        <TabsList>
          <TabsTrigger value="flagged" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Flagged Queue
          </TabsTrigger>
          <TabsTrigger value="all">All Posts</TabsTrigger>
        </TabsList>

        <TabsContent value="flagged">
          <Card>
            <CardHeader>
              <CardTitle>Flagged Content</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Author</TableHead>
                    <TableHead>Content Preview</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Reports</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockFlagged.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium">{post.author}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {post.content}
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{post.reason}</Badge>
                      </TableCell>
                      <TableCell>{post.reportedBy}</TableCell>
                      <TableCell>{new Date(post.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Content?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove this post. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveContent(post.id)}>
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <UserX className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Suspend User?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will suspend the user {post.author} from the platform.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleSuspendUser(post.id, post.author)}>
                                  Suspend
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Author</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockPosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium">{post.author}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{post.content}</TableCell>
                      <TableCell>{post.flags}</TableCell>
                      <TableCell>
                        <Badge variant={post.status === "active" ? "default" : "destructive"}>
                          {post.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(post.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
