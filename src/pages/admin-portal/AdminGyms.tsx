import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Mail,
  UserPlus,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { logAuditEvent } from "@/hooks/useAuditLog";

interface Gym {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_city: string | null;
  address_postcode: string | null;
  address_country: string | null;
  contact_email: string | null;
  owner_email: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  owner_id: string | null;
  created_at: string;
  member_count?: number;
  staff_count?: number;
}

interface Profile {
  user_id: string;
  display_name: string | null;
  email?: string;
}

interface GymFormData {
  name: string;
  description: string;
  address_line1: string;
  address_line2: string;
  address_city: string;
  address_postcode: string;
  address_country: string;
  contact_email: string;
  phone: string;
  owner_method: 'existing' | 'invite';
  owner_id: string;
  owner_invite_email: string;
  owner_invite_name: string;
}

export default function AdminGyms() {
  const { user } = useAuth();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [formData, setFormData] = useState<GymFormData>({
    name: "",
    description: "",
    address_line1: "",
    address_line2: "",
    address_city: "",
    address_postcode: "",
    address_country: "",
    contact_email: "",
    phone: "",
    owner_method: 'existing',
    owner_id: "",
    owner_invite_email: "",
    owner_invite_name: "",
  });

  useEffect(() => {
    fetchGyms();
    fetchUsers();
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

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .order("display_name");

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const filteredGyms = gyms.filter((gym) => {
    const matchesSearch =
      !searchQuery ||
      gym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gym.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gym.address_city?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || gym.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredUsers = users.filter((user) => {
    if (!userSearchQuery) return true;
    return (
      user.display_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.user_id.includes(userSearchQuery)
    );
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      address_line1: "",
      address_line2: "",
      address_city: "",
      address_postcode: "",
      address_country: "",
      contact_email: "",
      phone: "",
      owner_method: 'existing',
      owner_id: "",
      owner_invite_email: "",
      owner_invite_name: "",
    });
    setUserSearchQuery("");
  };

  const handleCreateGym = async () => {
    if (!formData.name.trim()) {
      toast.error("Gym name is required");
      return;
    }

    // Validate owner
    if (formData.owner_method === 'existing' && !formData.owner_id) {
      toast.error("Please select an owner for the gym");
      return;
    }

    if (formData.owner_method === 'invite' && !formData.owner_invite_email) {
      toast.error("Please enter the owner's email for the invitation");
      return;
    }

    setIsCreating(true);

    try {
      // Build full address for backward compatibility
      const addressParts = [
        formData.address_line1,
        formData.address_line2,
        formData.address_city,
        formData.address_postcode,
        formData.address_country,
      ].filter(Boolean);
      const fullAddress = addressParts.join(", ") || null;

      const { data, error } = await supabase
        .from("gyms")
        .insert({
          name: formData.name,
          description: formData.description || null,
          address: fullAddress,
          address_line1: formData.address_line1 || null,
          address_line2: formData.address_line2 || null,
          address_city: formData.address_city || null,
          address_postcode: formData.address_postcode || null,
          address_country: formData.address_country || null,
          contact_email: formData.contact_email || null,
          email: formData.contact_email || null, // Keep legacy field in sync
          owner_email: formData.owner_method === 'invite' ? formData.owner_invite_email : null,
          phone: formData.phone || null,
          owner_id: formData.owner_method === 'existing' ? formData.owner_id : null,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      // If existing user, add them as staff with owner role
      if (formData.owner_method === 'existing' && formData.owner_id) {
        await supabase.from("gym_staff").insert({
          gym_id: data.id,
          user_id: formData.owner_id,
          role: "owner",
          is_active: true,
        });
      }

      // If inviting, create invitation
      if (formData.owner_method === 'invite' && formData.owner_invite_email && user) {
        const { error: inviteError } = await supabase
          .from("gym_invitations")
          .insert({
            gym_id: data.id,
            email: formData.owner_invite_email,
            name: formData.owner_invite_name || null,
            invited_by: user.id,
            status: "pending",
            token: crypto.randomUUID(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });

        if (inviteError) {
          console.error("Error creating invitation:", inviteError);
          toast.error("Gym created but failed to send invitation. Please invite the owner manually.");
        } else {
          toast.success("Invitation sent to owner");
        }
      }

      await logAuditEvent({
        action: "gym_created",
        message: `Gym '${formData.name}' created by admin`,
        category: "admin",
        entityType: "gym",
        entityId: data.id,
      });

      toast.success("Gym created successfully");
      setShowCreateDialog(false);
      resetForm();
      fetchGyms();
    } catch (error) {
      console.error("Error creating gym:", error);
      toast.error("Failed to create gym");
    } finally {
      setIsCreating(false);
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
      address_line1: gym.address_line1 || "",
      address_line2: gym.address_line2 || "",
      city: gym.address_city || "",
      postcode: gym.address_postcode || "",
      country: gym.address_country || "",
      contact_email: gym.contact_email || "",
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

  const formatAddress = (gym: Gym) => {
    if (gym.address_line1) {
      const parts = [
        gym.address_line1,
        gym.address_city,
        gym.address_postcode,
      ].filter(Boolean);
      return parts.join(", ");
    }
    return gym.address || "-";
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
                            {gym.contact_email || gym.email || "No email"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatAddress(gym)}
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
              </div>

              <div>
                <Label className="text-muted-foreground">Address</Label>
                {selectedGym.address_line1 ? (
                  <div className="text-sm">
                    <p>{selectedGym.address_line1}</p>
                    {selectedGym.address_line2 && <p>{selectedGym.address_line2}</p>}
                    <p>
                      {[selectedGym.address_city, selectedGym.address_postcode, selectedGym.address_country]
                        .filter(Boolean).join(", ")}
                    </p>
                  </div>
                ) : (
                  <p>{selectedGym.address || "Not specified"}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Contact Email</Label>
                  <p>{selectedGym.contact_email || selectedGym.email || "Not specified"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p>{selectedGym.phone || "Not specified"}</p>
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
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Gym</DialogTitle>
            <DialogDescription>
              Add a new gym to the platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Basic Information
              </h3>
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
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Address
              </h3>
              <div>
                <Label>Address Line 1</Label>
                <Input
                  value={formData.address_line1}
                  onChange={(e) =>
                    setFormData({ ...formData, address_line1: e.target.value })
                  }
                  placeholder="Street address"
                />
              </div>
              <div>
                <Label>Address Line 2</Label>
                <Input
                  value={formData.address_line2}
                  onChange={(e) =>
                    setFormData({ ...formData, address_line2: e.target.value })
                  }
                  placeholder="Apartment, suite, etc. (optional)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>City</Label>
                  <Input
                    value={formData.address_city}
                    onChange={(e) =>
                      setFormData({ ...formData, address_city: e.target.value })
                    }
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label>Postal Code</Label>
                  <Input
                    value={formData.address_postcode}
                    onChange={(e) =>
                      setFormData({ ...formData, address_postcode: e.target.value })
                    }
                    placeholder="Postal code"
                  />
                </div>
              </div>
              <div>
                <Label>Country</Label>
                <Input
                  value={formData.address_country}
                  onChange={(e) =>
                    setFormData({ ...formData, address_country: e.target.value })
                  }
                  placeholder="Country"
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Contact Information
              </h3>
              <p className="text-xs text-muted-foreground">
                This contact email will be shown in the gym directory and visible to members.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_email: e.target.value })
                    }
                    placeholder="info@gym.com"
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

            {/* Owner Selection */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Owner / Manager
              </h3>
              <p className="text-xs text-muted-foreground">
                Select an existing user or invite someone to manage this gym.
              </p>
              
              <Tabs 
                value={formData.owner_method} 
                onValueChange={(v) => setFormData({ ...formData, owner_method: v as 'existing' | 'invite' })}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Existing User
                  </TabsTrigger>
                  <TabsTrigger value="invite" className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Send Invitation
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="existing" className="space-y-3 mt-4">
                  <div>
                    <Label>Search Users</Label>
                    <Input
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Search by name..."
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto border rounded-md">
                    {filteredUsers.slice(0, 10).map((user) => (
                      <div
                        key={user.user_id}
                        className={`p-3 cursor-pointer hover:bg-muted flex items-center gap-3 ${
                          formData.owner_id === user.user_id ? "bg-muted" : ""
                        }`}
                        onClick={() => setFormData({ ...formData, owner_id: user.user_id })}
                      >
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {user.display_name?.charAt(0) || "U"}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {user.display_name || "Unknown User"}
                          </p>
                        </div>
                        {formData.owner_id === user.user_id && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    ))}
                    {filteredUsers.length === 0 && (
                      <p className="p-3 text-sm text-muted-foreground text-center">
                        No users found
                      </p>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="invite" className="space-y-3 mt-4">
                  <div>
                    <Label>Owner's Name</Label>
                    <Input
                      value={formData.owner_invite_name}
                      onChange={(e) =>
                        setFormData({ ...formData, owner_invite_name: e.target.value })
                      }
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <Label>Owner's Email *</Label>
                    <Input
                      type="email"
                      value={formData.owner_invite_email}
                      onChange={(e) =>
                        setFormData({ ...formData, owner_invite_email: e.target.value })
                      }
                      placeholder="owner@email.com"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    An invitation email will be sent to set up their account.
                  </p>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                resetForm();
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateGym} disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Gym
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
