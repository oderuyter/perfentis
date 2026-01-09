import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  MoreHorizontal,
  Plus,
  Eye,
  Edit,
  Ban,
  CheckCircle,
  Users,
  Download,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { logAuditEvent } from "@/hooks/useAuditLog";

interface Gym {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  owner_id: string | null;
  created_at: string;
  member_count?: number;
  staff_count?: number;
}

export default function AdminGyms() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    fetchGyms();
  }, []);

  const fetchGyms = async () => {
    try {
      const [gymsRes, membershipsRes, staffRes] = await Promise.all([
        supabase.from("gyms").select("*").order("name"),
        supabase.from("memberships").select("gym_id"),
        supabase.from("gym_staff").select("gym_id").eq("is_active", true),
      ]);

      if (gymsRes.error) throw gymsRes.error;

      // Count members and staff per gym
      const memberCounts: Record<string, number> = {};
      const staffCounts: Record<string, number> = {};

      (membershipsRes.data || []).forEach((m) => {
        memberCounts[m.gym_id] = (memberCounts[m.gym_id] || 0) + 1;
      });

      (staffRes.data || []).forEach((s) => {
        staffCounts[s.gym_id] = (staffCounts[s.gym_id] || 0) + 1;
      });

      const gymsWithCounts = (gymsRes.data || []).map((gym) => ({
        ...gym,
        member_count: memberCounts[gym.id] || 0,
        staff_count: staffCounts[gym.id] || 0,
      }));

      setGyms(gymsWithCounts);
    } catch (error) {
      console.error("Error fetching gyms:", error);
      toast.error("Failed to load gyms");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGyms = gyms.filter((gym) => {
    const matchesSearch =
      !searchQuery ||
      gym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gym.address?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || gym.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCreateGym = async () => {
    if (!formData.name.trim()) {
      toast.error("Gym name is required");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("gyms")
        .insert({
          name: formData.name,
          description: formData.description || null,
          address: formData.address || null,
          email: formData.email || null,
          phone: formData.phone || null,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: "gym_created",
        message: `Gym '${formData.name}' created by admin`,
        category: "admin",
        entityType: "gym",
        entityId: data.id,
      });

      toast.success("Gym created successfully");
      setShowCreateDialog(false);
      setFormData({ name: "", description: "", address: "", email: "", phone: "" });
      fetchGyms();
    } catch (error) {
      console.error("Error creating gym:", error);
      toast.error("Failed to create gym");
    }
  };

  const handleSuspendGym = async (gym: Gym) => {
    const newStatus = gym.status === "suspended" ? "active" : "suspended";
    
    if (!confirm(`${newStatus === "suspended" ? "Suspend" : "Restore"} ${gym.name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("gyms")
        .update({ status: newStatus })
        .eq("id", gym.id);

      if (error) throw error;

      await logAuditEvent({
        action: newStatus === "suspended" ? "gym_suspended" : "gym_restored",
        message: `Gym '${gym.name}' ${newStatus === "suspended" ? "suspended" : "restored"}`,
        category: "admin",
        entityType: "gym",
        entityId: gym.id,
      });

      toast.success(`Gym ${newStatus === "suspended" ? "suspended" : "restored"}`);
      fetchGyms();
    } catch (error) {
      console.error("Error updating gym status:", error);
      toast.error("Failed to update gym status");
    }
  };

  const exportGyms = () => {
    const csvData = filteredGyms.map((gym) => ({
      id: gym.id,
      name: gym.name,
      address: gym.address || "",
      email: gym.email || "",
      phone: gym.phone || "",
      status: gym.status,
      members: gym.member_count,
      staff: gym.staff_count,
      created_at: gym.created_at,
    }));

    const headers = Object.keys(csvData[0] || {}).join(",");
    const rows = csvData.map((row) => Object.values(row).join(",")).join("\n");
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gyms-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    logAuditEvent({
      action: "gyms_exported",
      message: `Exported ${filteredGyms.length} gyms to CSV`,
      category: "admin",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gyms</h1>
          <p className="text-muted-foreground">
            Manage gyms and their settings
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportGyms}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Gym
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Gyms Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Gyms ({filteredGyms.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGyms.map((gym) => (
                  <TableRow key={gym.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium">{gym.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {gym.email || "No email"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {gym.address || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          gym.status === "active"
                            ? "default"
                            : gym.status === "suspended"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {gym.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{gym.member_count}</TableCell>
                    <TableCell>{gym.staff_count}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(gym.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedGym(gym);
                              setShowDetailDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Users className="h-4 w-4 mr-2" />
                            View Members
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleSuspendGym(gym)}
                            className={
                              gym.status === "suspended"
                                ? "text-green-600"
                                : "text-destructive"
                            }
                          >
                            {gym.status === "suspended" ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Restore
                              </>
                            ) : (
                              <>
                                <Ban className="h-4 w-4 mr-2" />
                                Suspend
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Gym Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gym Details</DialogTitle>
          </DialogHeader>
          {selectedGym && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">{selectedGym.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p>
                    <Badge
                      variant={
                        selectedGym.status === "active"
                          ? "default"
                          : "destructive"
                      }
                    >
                      {selectedGym.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Address</Label>
                  <p>{selectedGym.address || "Not specified"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Contact</Label>
                  <p>{selectedGym.email || selectedGym.phone || "Not specified"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Members</Label>
                  <p>{selectedGym.member_count}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Staff</Label>
                  <p>{selectedGym.staff_count}</p>
                </div>
              </div>
              {selectedGym.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1">{selectedGym.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Gym Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Gym</DialogTitle>
            <DialogDescription>
              Add a new gym to the platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Gym name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Full address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="contact@gym.com"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="Phone number"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateGym}>Create Gym</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
