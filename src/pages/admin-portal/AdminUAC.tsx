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
import { Plus, Trash2, Users, Shield, Key } from "lucide-react";
import { toast } from "sonner";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { AppRole, RoleScope, Capability } from "@/hooks/useRoles";

interface Group {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  member_count?: number;
}

interface RoleCapability {
  id: string;
  role: AppRole;
  capability_id: string;
  capability?: Capability;
}

const ROLES: AppRole[] = [
  "admin",
  "athlete",
  "gym_manager",
  "gym_staff",
  "gym_user",
  "coach",
  "coach_client",
  "event_organiser",
  "event_member",
];

export default function AdminUAC() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [roleCapabilities, setRoleCapabilities] = useState<RoleCapability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showCapabilityDialog, setShowCapabilityDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [capabilityName, setCapabilityName] = useState("");
  const [capabilityDescription, setCapabilityDescription] = useState("");
  const [capabilityScopeType, setCapabilityScopeType] = useState<RoleScope>("global");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [groupsRes, capsRes, rolesCapsRes, membersRes] = await Promise.all([
        supabase.from("groups").select("*").order("name"),
        supabase.from("capabilities").select("*").order("name"),
        supabase.from("role_capabilities").select("*"),
        supabase.from("group_members").select("group_id"),
      ]);

      if (groupsRes.error) throw groupsRes.error;
      if (capsRes.error) throw capsRes.error;

      // Count members per group
      const memberCounts: Record<string, number> = {};
      (membersRes.data || []).forEach((m) => {
        memberCounts[m.group_id] = (memberCounts[m.group_id] || 0) + 1;
      });

      const groupsWithCounts = (groupsRes.data || []).map((g) => ({
        ...g,
        member_count: memberCounts[g.id] || 0,
      }));

      setGroups(groupsWithCounts);
      setCapabilities((capsRes.data || []) as Capability[]);
      setRoleCapabilities((rolesCapsRes.data || []) as RoleCapability[]);
    } catch (error) {
      console.error("Error fetching UAC data:", error);
      toast.error("Failed to load UAC data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    try {
      if (editingGroup) {
        const { error } = await supabase
          .from("groups")
          .update({ name: groupName, description: groupDescription })
          .eq("id", editingGroup.id);

        if (error) throw error;

        await logAuditEvent({
          action: "group_updated",
          message: `Group '${groupName}' updated`,
          category: "security",
          entityType: "group",
          entityId: editingGroup.id,
        });

        toast.success("Group updated");
      } else {
        const { data, error } = await supabase
          .from("groups")
          .insert({ name: groupName, description: groupDescription })
          .select()
          .single();

        if (error) throw error;

        await logAuditEvent({
          action: "group_created",
          message: `Group '${groupName}' created`,
          category: "security",
          entityType: "group",
          entityId: data.id,
        });

        toast.success("Group created");
      }

      setShowGroupDialog(false);
      setEditingGroup(null);
      setGroupName("");
      setGroupDescription("");
      fetchData();
    } catch (error) {
      console.error("Error saving group:", error);
      toast.error("Failed to save group");
    }
  };

  const handleDeleteGroup = async (group: Group) => {
    if (!confirm(`Delete group "${group.name}"?`)) return;

    try {
      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", group.id);

      if (error) throw error;

      await logAuditEvent({
        action: "group_deleted",
        message: `Group '${group.name}' deleted`,
        category: "security",
        entityType: "group",
        entityId: group.id,
      });

      toast.success("Group deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Failed to delete group");
    }
  };

  const handleCreateCapability = async () => {
    if (!capabilityName.trim()) {
      toast.error("Capability name is required");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("capabilities")
        .insert({
          name: capabilityName,
          description: capabilityDescription,
          scope_type: capabilityScopeType,
        })
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: "capability_created",
        message: `Capability '${capabilityName}' created`,
        category: "security",
        entityType: "capability",
        entityId: data.id,
      });

      toast.success("Capability created");
      setShowCapabilityDialog(false);
      setCapabilityName("");
      setCapabilityDescription("");
      setCapabilityScopeType("global");
      fetchData();
    } catch (error) {
      console.error("Error creating capability:", error);
      toast.error("Failed to create capability");
    }
  };

  const getRoleCapabilities = (role: AppRole) => {
    return roleCapabilities
      .filter((rc) => rc.role === role)
      .map((rc) => capabilities.find((c) => c.id === rc.capability_id))
      .filter(Boolean) as Capability[];
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
      <div>
        <h1 className="text-2xl font-bold">UAC & Groups</h1>
        <p className="text-muted-foreground">
          Manage roles, capabilities, and user groups
        </p>
      </div>

      <Tabs defaultValue="groups">
        <TabsList>
          <TabsTrigger value="groups" className="gap-2">
            <Users className="h-4 w-4" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="capabilities" className="gap-2">
            <Key className="h-4 w-4" />
            Capabilities
          </TabsTrigger>
        </TabsList>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowGroupDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Groups ({groups.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {group.description || "-"}
                      </TableCell>
                      <TableCell>{group.member_count}</TableCell>
                      <TableCell>
                        <Badge variant={group.is_active ? "default" : "secondary"}>
                          {group.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingGroup(group);
                              setGroupName(group.name);
                              setGroupDescription(group.description || "");
                              setShowGroupDialog(true);
                            }}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteGroup(group)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Role → Capability Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {ROLES.map((role) => {
                  const caps = getRoleCapabilities(role);
                  return (
                    <div
                      key={role}
                      className="flex items-start gap-4 p-4 border rounded-lg"
                    >
                      <div className="w-32 shrink-0">
                        <Badge variant="outline" className="capitalize">
                          {role.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {caps.length > 0 ? (
                          caps.map((cap) => (
                            <Badge key={cap.id} variant="secondary">
                              {cap.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No capabilities assigned
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Capabilities Tab */}
        <TabsContent value="capabilities" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCapabilityDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Capability
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Capabilities ({capabilities.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Scope</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {capabilities.map((cap) => (
                    <TableRow key={cap.id}>
                      <TableCell className="font-medium">{cap.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {cap.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{cap.scope_type}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Group Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? "Edit Group" : "Create Group"}
            </DialogTitle>
            <DialogDescription>
              {editingGroup
                ? "Update group details"
                : "Create a new user group"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowGroupDialog(false);
                setEditingGroup(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateGroup}>
              {editingGroup ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Capability Dialog */}
      <Dialog open={showCapabilityDialog} onOpenChange={setShowCapabilityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Capability</DialogTitle>
            <DialogDescription>
              Define a new system capability
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={capabilityName}
                onChange={(e) => setCapabilityName(e.target.value)}
                placeholder="e.g., manage_members"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={capabilityDescription}
                onChange={(e) => setCapabilityDescription(e.target.value)}
                placeholder="What this capability allows"
                rows={3}
              />
            </div>
            <div>
              <Label>Scope Type</Label>
              <Select
                value={capabilityScopeType}
                onValueChange={(v) => setCapabilityScopeType(v as RoleScope)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="gym">Gym</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCapabilityDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateCapability}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
