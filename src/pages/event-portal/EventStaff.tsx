import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, UserCheck, Download } from "lucide-react";
import { toast } from "sonner";

interface Staff {
  id: string;
  event_id: string;
  user_id: string | null;
  email: string | null;
  name: string | null;
  role: string;
  status: string;
  created_at: string;
}

interface ContextType {
  selectedEventId: string | null;
}

const roles = [
  { value: "judge", label: "Judge" },
  { value: "volunteer", label: "Volunteer" },
  { value: "first_aid", label: "First Aid" },
  { value: "photographer", label: "Photographer" },
  { value: "announcer", label: "Announcer" },
  { value: "registration", label: "Registration" },
  { value: "other", label: "Other" },
];

export default function EventStaff() {
  const { selectedEventId } = useOutletContext<ContextType>();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", role: "volunteer" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedEventId) {
      fetchStaff();
    }
  }, [selectedEventId]);

  const fetchStaff = async () => {
    if (!selectedEventId) return;

    try {
      const { data, error } = await supabase
        .from("event_staff")
        .select("*")
        .eq("event_id", selectedEventId)
        .order("role")
        .order("name");

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newStaff.name || !selectedEventId) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("event_staff").insert({
        event_id: selectedEventId,
        name: newStaff.name,
        email: newStaff.email || null,
        role: newStaff.role,
        status: "pending",
      });

      if (error) throw error;
      toast.success("Staff member added");
      setDialogOpen(false);
      setNewStaff({ name: "", email: "", role: "volunteer" });
      fetchStaff();
    } catch (error) {
      console.error("Error adding staff:", error);
      toast.error("Failed to add staff");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this staff member?")) return;

    try {
      const { error } = await supabase.from("event_staff").delete().eq("id", id);
      if (error) throw error;
      toast.success("Staff member removed");
      fetchStaff();
    } catch (error) {
      console.error("Error removing staff:", error);
      toast.error("Failed to remove staff");
    }
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Role", "Status"];
    const rows = staff.map((s) => [s.name || "", s.email || "", s.role, s.status]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "event-staff.csv";
    a.click();
  };

  const staffByRole = roles.map((role) => ({
    ...role,
    count: staff.filter((s) => s.role === role.value).length,
  }));

  if (!selectedEventId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <UserCheck className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Event Selected</h2>
        <p className="text-muted-foreground">
          Select an event to manage staff.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Volunteers & Staff</h1>
          <p className="text-muted-foreground">
            Manage event volunteers, judges, and staff
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Staff Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newStaff.name}
                    onChange={(e) =>
                      setNewStaff((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newStaff.email}
                    onChange={(e) =>
                      setNewStaff((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="john@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={newStaff.role}
                    onValueChange={(v) =>
                      setNewStaff((prev) => ({ ...prev, role: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAdd} disabled={saving}>
                    {saving ? "Adding..." : "Add"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Role Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {staffByRole.map((role) => (
          <Card key={role.value}>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{role.count}</p>
              <p className="text-sm text-muted-foreground">{role.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Staff List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-muted-foreground">No staff added yet</p>
                  </TableCell>
                </TableRow>
              ) : (
                staff.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name || "—"}</TableCell>
                    <TableCell>{s.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {s.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={s.status === "confirmed" ? "default" : "secondary"}
                      >
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(s.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
