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
  Trash2,
  Award,
  FileText,
  User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ContextType {
  selectedGymId: string | null;
}

interface StaffMember {
  id: string;
  user_id: string;
  position: string | null;
  hire_date: string | null;
  bio: string | null;
  certifications: string[] | null;
  accreditations: string[] | null;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function GymStaff() {
  const { selectedGymId } = useOutletContext<ContextType>();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [editingStaff, setEditingStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ email: "", position: "", role: "gym_staff" });
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    bio: "",
    certifications: "",
    accreditations: ""
  });

  useEffect(() => {
    if (selectedGymId) {
      fetchStaff();
    }
  }, [selectedGymId]);

  const fetchStaff = async () => {
    if (!selectedGymId) return;
    setIsLoading(true);

    try {
      const { data, error } = await (supabase as any)
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
    if (!selectedGymId || !newStaff.email) return;
    setAdding(true);

    try {
      // In production, this would send an invitation email
      // For now, show a placeholder message
      toast.info("Staff invitation would be sent to " + newStaff.email);
      setShowAddStaff(false);
      setNewStaff({ email: "", position: "", role: "gym_staff" });
    } catch (error) {
      toast.error("Failed to send invitation");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveStaff = async (staffId: string) => {
    try {
      await supabase.from("gym_staff").update({ is_active: false }).eq("id", staffId);
      toast.success("Staff member removed");
      fetchStaff();
      if (selectedStaff?.id === staffId) {
        setSelectedStaff(null);
      }
    } catch (error) {
      toast.error("Failed to remove staff member");
    }
  };

  const openStaffProfile = (member: StaffMember) => {
    setSelectedStaff(member);
    setEditData({
      bio: member.bio || "",
      certifications: member.certifications?.join(", ") || "",
      accreditations: member.accreditations?.join(", ") || ""
    });
    setEditingStaff(false);
  };

  const handleSaveProfile = async () => {
    if (!selectedStaff) return;
    setSaving(true);

    try {
      const certArray = editData.certifications
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
      const accredArray = editData.accreditations
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

      const { error } = await supabase
        .from("gym_staff")
        .update({
          bio: editData.bio || null,
          certifications: certArray.length > 0 ? certArray : null,
          accreditations: accredArray.length > 0 ? accredArray : null
        })
        .eq("id", selectedStaff.id);

      if (error) throw error;

      toast.success("Profile updated");
      setEditingStaff(false);
      fetchStaff();
      
      // Update selected staff
      setSelectedStaff(prev => prev ? {
        ...prev,
        bio: editData.bio || null,
        certifications: certArray.length > 0 ? certArray : null,
        accreditations: accredArray.length > 0 ? accredArray : null
      } : null);
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
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
            <div 
              key={s.id} 
              className="bg-card rounded-xl border border-border shadow-card p-4 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => openStaffProfile(s)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={s.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{s.profiles?.display_name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{s.position || "Staff"}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="p-1.5 hover:bg-muted rounded-lg">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openStaffProfile(s); }}>
                      <Edit className="h-4 w-4 mr-2" />
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); handleRemoveStaff(s.id); }} 
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {s.bio && (
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{s.bio}</p>
              )}
              
              {(s.certifications?.length || s.accreditations?.length) && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {s.certifications?.slice(0, 2).map((cert, i) => (
                    <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                      {cert}
                    </span>
                  ))}
                  {(s.certifications?.length || 0) > 2 && (
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
                      +{(s.certifications?.length || 0) - 2} more
                    </span>
                  )}
                </div>
              )}
              
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
              disabled={adding || !newStaff.email}
              className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Send Invitation"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Staff Profile Sheet */}
      <Sheet open={!!selectedStaff} onOpenChange={() => setSelectedStaff(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Staff Profile</SheetTitle>
          </SheetHeader>

          {selectedStaff && (
            <div className="mt-6 space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={selectedStaff.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-2xl">
                    <User className="h-10 w-10 text-primary" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedStaff.profiles?.display_name || "Unknown"}
                  </h3>
                  <p className="text-muted-foreground">{selectedStaff.position || "Staff"}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Joined {selectedStaff.hire_date ? format(new Date(selectedStaff.hire_date), "MMM d, yyyy") : "—"}
                  </p>
                </div>
              </div>

              <Tabs defaultValue="about" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="about">About</TabsTrigger>
                  <TabsTrigger value="credentials">Credentials</TabsTrigger>
                </TabsList>

                <TabsContent value="about" className="space-y-4 mt-4">
                  {editingStaff ? (
                    <>
                      <div>
                        <Label>Bio</Label>
                        <Textarea
                          value={editData.bio}
                          onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                          placeholder="Write a brief bio..."
                          rows={4}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingStaff(false)}
                          className="flex-1 py-2 border border-border rounded-lg font-medium hover:bg-muted"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Save"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Bio</span>
                        </div>
                        <p className="text-sm">
                          {selectedStaff.bio || "No bio added yet."}
                        </p>
                      </div>
                      <button
                        onClick={() => setEditingStaff(true)}
                        className="w-full py-2 border border-border rounded-lg font-medium hover:bg-muted"
                      >
                        <Edit className="h-4 w-4 inline mr-2" />
                        Edit Profile
                      </button>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="credentials" className="space-y-4 mt-4">
                  {editingStaff ? (
                    <>
                      <div>
                        <Label>Certifications (comma-separated)</Label>
                        <Textarea
                          value={editData.certifications}
                          onChange={(e) => setEditData({ ...editData, certifications: e.target.value })}
                          placeholder="e.g., CPT, CrossFit L1, First Aid"
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label>Accreditations (comma-separated)</Label>
                        <Textarea
                          value={editData.accreditations}
                          onChange={(e) => setEditData({ ...editData, accreditations: e.target.value })}
                          placeholder="e.g., NASM, ACE, ISSA"
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingStaff(false)}
                          className="flex-1 py-2 border border-border rounded-lg font-medium hover:bg-muted"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Save"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Certifications</span>
                        </div>
                        {selectedStaff.certifications?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedStaff.certifications.map((cert, i) => (
                              <span key={i} className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full">
                                {cert}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No certifications added.</p>
                        )}
                      </div>

                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Accreditations</span>
                        </div>
                        {selectedStaff.accreditations?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedStaff.accreditations.map((acc, i) => (
                              <span key={i} className="px-2 py-1 bg-secondary text-secondary-foreground text-sm rounded-full">
                                {acc}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No accreditations added.</p>
                        )}
                      </div>

                      <button
                        onClick={() => setEditingStaff(true)}
                        className="w-full py-2 border border-border rounded-lg font-medium hover:bg-muted"
                      >
                        <Edit className="h-4 w-4 inline mr-2" />
                        Edit Credentials
                      </button>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
