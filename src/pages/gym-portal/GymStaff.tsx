import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  UserCog,
  Plus,
  MoreHorizontal,
  Loader2,
  Mail,
  Phone,
  Edit,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ContextType {
  selectedGymId: string | null;
}

export default function GymStaff() {
  const { selectedGymId } = useOutletContext<ContextType>();
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ email: "", position: "", role: "gym_staff" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (selectedGymId) {
      fetchStaff();
    }
  }, [selectedGymId]);

  const fetchStaff = async () => {
    if (!selectedGymId) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("gym_staff")
        .select(`
          *,
          profiles:user_id(display_name, avatar_url)
        `)
        .eq("gym_id", selectedGymId)
        .eq("is_active", true);

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStaff = async () => {
    // Placeholder - in production this would look up user by email and assign role
    toast.info("Staff invitation flow would be implemented here");
    setShowAddStaff(false);
  };

  const handleRemoveStaff = async (staffId: string) => {
    try {
      await supabase.from("gym_staff").update({ is_active: false }).eq("id", staffId);
      toast.success("Staff member removed");
      fetchStaff();
    } catch (error) {
      toast.error("Failed to remove staff member");
    }
  };

  if (!selectedGymId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a gym.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Staff</h2>
          <p className="text-muted-foreground">Manage your gym staff and roles</p>
        </div>
        <button
          onClick={() => setShowAddStaff(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
        >
          <Plus className="h-4 w-4" />
          Add Staff
        </button>
      </div>

      {/* Staff Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : staff.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-card p-8 text-center">
          <UserCog className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No Staff Members</h3>
          <p className="text-muted-foreground mb-4">Add your first staff member to get started.</p>
          <button
            onClick={() => setShowAddStaff(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
          >
            Add Staff
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((s) => (
            <div key={s.id} className="bg-card rounded-xl border border-border shadow-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCog className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{s.profiles?.display_name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{s.position || "Staff"}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1.5 hover:bg-muted rounded-lg">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleRemoveStaff(s.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Joined {s.hire_date ? format(new Date(s.hire_date), "MMM d, yyyy") : "—"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Staff Dialog */}
      <Dialog open={showAddStaff} onOpenChange={setShowAddStaff}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                placeholder="staff@example.com"
              />
            </div>
            <div>
              <Label>Position</Label>
              <Input
                value={newStaff.position}
                onChange={(e) => setNewStaff({ ...newStaff, position: e.target.value })}
                placeholder="e.g., Personal Trainer"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={newStaff.role} onValueChange={(v) => setNewStaff({ ...newStaff, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gym_staff">Staff</SelectItem>
                  <SelectItem value="gym_manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={handleAddStaff}
              disabled={adding}
              className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Send Invitation"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
