import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  UserX,
  UserCheck,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Mail,
  Phone,
  MapPin,
  AlertTriangle,
  FileText,
  Loader2,
  UserPlus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenuSeparator,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InviteMemberDialog } from "@/components/gym-portal/InviteMemberDialog";

interface ContextType {
  selectedGymId: string | null;
}

interface MemberWithDetails {
  id: string;
  user_id: string;
  membership_number: string | null;
  status: string;
  tier: string | null;
  created_at: string;
  start_date: string | null;
  profile: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  email?: string;
  contact?: {
    phone: string | null;
    address_line1: string | null;
    city: string | null;
    emergency_name: string | null;
    emergency_phone: string | null;
  } | null;
}

interface MemberNote {
  id: string;
  note_text: string;
  tag: string | null;
  created_at: string;
  author_id: string;
}

const NOTE_TAGS = ["general", "billing", "injury", "behaviour", "admin"];

export default function GymMembers() {
  const { selectedGymId } = useOutletContext<ContextType>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState<MemberWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Member detail modal
  const [selectedMember, setSelectedMember] = useState<MemberWithDetails | null>(null);
  const [memberNotes, setMemberNotes] = useState<MemberNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newNoteTag, setNewNoteTag] = useState("general");
  const [addingNote, setAddingNote] = useState(false);

  // Add member modal
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberData, setAddMemberData] = useState({
    email: "",
    displayName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postcode: "",
    country: "",
    emergencyName: "",
    emergencyRelationship: "",
    emergencyPhone: "",
    tier: "standard"
  });
  const [addingMember, setAddingMember] = useState(false);
  const [matchedUser, setMatchedUser] = useState<{ id: string; display_name: string | null } | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Confirm dialogs
  const [confirmAction, setConfirmAction] = useState<{
    type: "suspend" | "reinstate" | "offboard";
    member: MemberWithDetails;
  } | null>(null);

  // Contact editing
  const [editingContact, setEditingContact] = useState(false);
  const [contactData, setContactData] = useState({
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    postcode: "",
    country: "",
    emergency_name: "",
    emergency_relationship: "",
    emergency_phone: ""
  });
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    if (selectedGymId) {
      fetchMembers();
    }
  }, [selectedGymId, statusFilter, tierFilter, page]);

  const fetchMembers = async () => {
    if (!selectedGymId) return;
    setIsLoading(true);

    try {
      // First fetch memberships
      let query = supabase
        .from("memberships")
        .select("id, user_id, membership_number, status, tier, created_at, start_date")
        .eq("gym_id", selectedGymId)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (tierFilter !== "all") {
        query = query.eq("tier", tierFilter);
      }

      const { data: memberships, error: membershipsError } = await query;
      if (membershipsError) throw membershipsError;

      if (!memberships || memberships.length === 0) {
        setMembers([]);
        setIsLoading(false);
        return;
      }

      // Get unique user IDs and fetch their profiles separately
      const userIds = [...new Set(memberships.map(m => m.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      if (profilesError) {
        console.warn("Error fetching profiles:", profilesError);
      }

      // Create a map for quick profile lookup
      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url }])
      );

      // Map the data with profiles
      const mappedMembers: MemberWithDetails[] = memberships.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        membership_number: m.membership_number,
        status: m.status,
        tier: m.tier,
        created_at: m.created_at,
        start_date: m.start_date,
        profile: profileMap.get(m.user_id) || null
      }));

      setMembers(mappedMembers);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to load members");
    } finally {
      setIsLoading(false);
    }
  };

  // Email lookup for identity matching (placeholder - would use edge function in production)
  const checkEmailForMatch = async (email: string) => {
    if (!email.includes("@")) {
      setMatchedUser(null);
      return;
    }

    setCheckingEmail(true);
    try {
      // Placeholder: In production, you'd have an edge function to check auth.users by email
      // For now, we just clear any matched user
      setMatchedUser(null);
    } catch (error) {
      console.error("Error checking email:", error);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedGymId || !addMemberData.email) {
      toast.error("Email is required");
      return;
    }

    setAddingMember(true);
    try {
      // For now, create a membership placeholder
      // In production, you'd either link to existing user or send invite

      const { data: membership, error: membershipError } = await supabase
        .from("memberships")
        .insert({
          gym_id: selectedGymId,
          user_id: user?.id, // Placeholder - should be matched user or new user
          status: "active",
          tier: addMemberData.tier,
          start_date: new Date().toISOString().split("T")[0]
        })
        .select()
        .single();

      if (membershipError) throw membershipError;

      // Create contact details
      if (membership) {
        await supabase.from("member_contacts").insert({
          membership_id: membership.id,
          phone: addMemberData.phone || null,
          address_line1: addMemberData.addressLine1 || null,
          address_line2: addMemberData.addressLine2 || null,
          city: addMemberData.city || null,
          postcode: addMemberData.postcode || null,
          country: addMemberData.country || null,
          emergency_name: addMemberData.emergencyName || null,
          emergency_relationship: addMemberData.emergencyRelationship || null,
          emergency_phone: addMemberData.emergencyPhone || null
        });
      }

      toast.success("Member added successfully");
      setShowAddMember(false);
      setAddMemberData({
        email: "",
        displayName: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        postcode: "",
        country: "",
        emergencyName: "",
        emergencyRelationship: "",
        emergencyPhone: "",
        tier: "standard"
      });
      fetchMembers();
    } catch (error) {
      console.error("Error adding member:", error);
      toast.error("Failed to add member");
    } finally {
      setAddingMember(false);
    }
  };

  const openMemberDetail = async (member: MemberWithDetails) => {
    setSelectedMember(member);
    setNotesLoading(true);

    // Fetch contact details
    const { data: contact } = await supabase
      .from("member_contacts")
      .select("*")
      .eq("membership_id", member.id)
      .single();

    if (contact) {
      setContactData({
        phone: contact.phone || "",
        address_line1: contact.address_line1 || "",
        address_line2: contact.address_line2 || "",
        city: contact.city || "",
        postcode: contact.postcode || "",
        country: contact.country || "",
        emergency_name: contact.emergency_name || "",
        emergency_relationship: contact.emergency_relationship || "",
        emergency_phone: contact.emergency_phone || ""
      });
    }

    // Fetch notes
    const { data: notes } = await supabase
      .from("member_notes")
      .select("*")
      .eq("membership_id", member.id)
      .order("created_at", { ascending: false });

    setMemberNotes(notes || []);
    setNotesLoading(false);
  };

  const handleAddNote = async () => {
    if (!selectedMember || !newNote.trim()) return;

    setAddingNote(true);
    try {
      const { error } = await supabase.from("member_notes").insert({
        membership_id: selectedMember.id,
        author_id: user?.id,
        note_text: newNote.trim(),
        tag: newNoteTag
      });

      if (error) throw error;

      toast.success("Note added");
      setNewNote("");
      
      // Refresh notes
      const { data: notes } = await supabase
        .from("member_notes")
        .select("*")
        .eq("membership_id", selectedMember.id)
        .order("created_at", { ascending: false });
      setMemberNotes(notes || []);
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  const handleSaveContact = async () => {
    if (!selectedMember) return;

    setSavingContact(true);
    try {
      // Upsert contact
      const { error } = await supabase
        .from("member_contacts")
        .upsert({
          membership_id: selectedMember.id,
          ...contactData
        }, {
          onConflict: "membership_id"
        });

      if (error) throw error;

      toast.success("Contact details saved");
      setEditingContact(false);
    } catch (error) {
      console.error("Error saving contact:", error);
      toast.error("Failed to save contact details");
    } finally {
      setSavingContact(false);
    }
  };

  const handleMemberAction = async (type: "suspend" | "reinstate" | "offboard") => {
    if (!confirmAction) return;

    try {
      const newStatus = type === "suspend" ? "suspended" : type === "reinstate" ? "active" : "cancelled";
      
      const { error } = await supabase
        .from("memberships")
        .update({ status: newStatus })
        .eq("id", confirmAction.member.id);

      if (error) throw error;

      toast.success(`Member ${type}d successfully`);
      setConfirmAction(null);
      fetchMembers();
      if (selectedMember?.id === confirmAction.member.id) {
        setSelectedMember(null);
      }
    } catch (error) {
      console.error(`Error ${type}ing member:`, error);
      toast.error(`Failed to ${type} member`);
    }
  };

  const filteredMembers = members.filter((member) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.profile?.display_name?.toLowerCase().includes(query) ||
      member.membership_number?.toLowerCase().includes(query)
    );
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-600";
      case "suspended":
        return "bg-orange-500/10 text-orange-600";
      case "cancelled":
        return "bg-red-500/10 text-red-600";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getNoteTagClass = (tag: string | null) => {
    switch (tag) {
      case "billing":
        return "bg-blue-500/10 text-blue-600";
      case "injury":
        return "bg-red-500/10 text-red-600";
      case "behaviour":
        return "bg-orange-500/10 text-orange-600";
      case "admin":
        return "bg-purple-500/10 text-purple-600";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (!selectedGymId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a gym to view members.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Members</h2>
          <p className="text-muted-foreground">Manage your gym members</p>
        </div>
        <button
          onClick={() => setShowAddMember(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or membership number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Members Table */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-sm">Name</th>
                <th className="text-left py-3 px-4 font-medium text-sm hidden md:table-cell">Member #</th>
                <th className="text-left py-3 px-4 font-medium text-sm">Status</th>
                <th className="text-left py-3 px-4 font-medium text-sm hidden lg:table-cell">Tier</th>
                <th className="text-left py-3 px-4 font-medium text-sm hidden lg:table-cell">Join Date</th>
                <th className="text-right py-3 px-4 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8">
                    <div className="flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No members found
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {member.profile?.display_name || "Unknown"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <span className="font-mono text-sm">
                        {member.membership_number || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadgeClass(member.status)}`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell capitalize">
                      {member.tier || "Standard"}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground text-sm">
                      {member.start_date
                        ? format(new Date(member.start_date), "MMM d, yyyy")
                        : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openMemberDetail(member)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {member.status === "active" ? (
                            <DropdownMenuItem
                              onClick={() => setConfirmAction({ type: "suspend", member })}
                              className="text-orange-600"
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Suspend
                            </DropdownMenuItem>
                          ) : member.status === "suspended" ? (
                            <DropdownMenuItem
                              onClick={() => setConfirmAction({ type: "reinstate", member })}
                              className="text-green-600"
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Reinstate
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            onClick={() => setConfirmAction({ type: "offboard", member })}
                            className="text-destructive"
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Offboard
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Showing {filteredMembers.length} members
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 hover:bg-muted rounded-lg disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm">Page {page}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={filteredMembers.length < pageSize}
              className="p-2 hover:bg-muted rounded-lg disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Member Detail Modal */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
          </DialogHeader>

          {selectedMember && (
            <Tabs defaultValue="profile" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="notes">Staff Notes</TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-4 mt-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">
                      {selectedMember.profile?.display_name || "Unknown"}
                    </h3>
                    <p className="text-muted-foreground font-mono">
                      #{selectedMember.membership_number}
                    </p>
                  </div>
                  <span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusBadgeClass(selectedMember.status)}`}>
                    {selectedMember.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Tier</p>
                    <p className="font-medium capitalize">{selectedMember.tier || "Standard"}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Join Date</p>
                    <p className="font-medium">
                      {selectedMember.start_date
                        ? format(new Date(selectedMember.start_date), "MMM d, yyyy")
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* QR Code Preview */}
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Membership QR Code</p>
                  <div className="inline-block p-4 bg-white rounded-lg">
                    <div className="h-24 w-24 bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      QR Preview
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-border">
                  {selectedMember.status === "active" && (
                    <button
                      onClick={() => setConfirmAction({ type: "suspend", member: selectedMember })}
                      className="flex-1 py-2 border border-orange-500 text-orange-600 rounded-lg font-medium hover:bg-orange-50 transition-colors"
                    >
                      Suspend
                    </button>
                  )}
                  {selectedMember.status === "suspended" && (
                    <button
                      onClick={() => setConfirmAction({ type: "reinstate", member: selectedMember })}
                      className="flex-1 py-2 border border-green-500 text-green-600 rounded-lg font-medium hover:bg-green-50 transition-colors"
                    >
                      Reinstate
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmAction({ type: "offboard", member: selectedMember })}
                    className="flex-1 py-2 border border-destructive text-destructive rounded-lg font-medium hover:bg-destructive/10 transition-colors"
                  >
                    Offboard
                  </button>
                </div>
              </TabsContent>

              {/* Contact Tab */}
              <TabsContent value="contact" className="space-y-4 mt-4">
                {editingContact ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={contactData.phone}
                        onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
                        placeholder="Phone number"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Address Line 1</Label>
                        <Input
                          value={contactData.address_line1}
                          onChange={(e) => setContactData({ ...contactData, address_line1: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Address Line 2</Label>
                        <Input
                          value={contactData.address_line2}
                          onChange={(e) => setContactData({ ...contactData, address_line2: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>City</Label>
                        <Input
                          value={contactData.city}
                          onChange={(e) => setContactData({ ...contactData, city: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Postcode</Label>
                        <Input
                          value={contactData.postcode}
                          onChange={(e) => setContactData({ ...contactData, postcode: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Country</Label>
                        <Input
                          value={contactData.country}
                          onChange={(e) => setContactData({ ...contactData, country: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <h4 className="font-medium mb-3">Emergency Contact</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Name</Label>
                          <Input
                            value={contactData.emergency_name}
                            onChange={(e) => setContactData({ ...contactData, emergency_name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Relationship</Label>
                          <Input
                            value={contactData.emergency_relationship}
                            onChange={(e) => setContactData({ ...contactData, emergency_relationship: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <Input
                            value={contactData.emergency_phone}
                            onChange={(e) => setContactData({ ...contactData, emergency_phone: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <button
                        onClick={() => setEditingContact(false)}
                        className="flex-1 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveContact}
                        disabled={savingContact}
                        className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {savingContact ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium">{contactData.phone || "Not provided"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Address</p>
                        {contactData.address_line1 ? (
                          <div>
                            <p className="font-medium">{contactData.address_line1}</p>
                            {contactData.address_line2 && <p>{contactData.address_line2}</p>}
                            <p>{[contactData.city, contactData.postcode, contactData.country].filter(Boolean).join(", ")}</p>
                          </div>
                        ) : (
                          <p className="font-medium">Not provided</p>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <p className="text-xs text-muted-foreground">Emergency Contact</p>
                      </div>
                      {contactData.emergency_name ? (
                        <div>
                          <p className="font-medium">{contactData.emergency_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {contactData.emergency_relationship} • {contactData.emergency_phone}
                          </p>
                        </div>
                      ) : (
                        <p className="font-medium">Not provided</p>
                      )}
                    </div>

                    <button
                      onClick={() => setEditingContact(true)}
                      className="w-full py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
                    >
                      Edit Contact Details
                    </button>
                  </div>
                )}
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="space-y-4 mt-4">
                {/* Add Note */}
                <div className="space-y-3 pb-4 border-b border-border">
                  <div className="flex gap-2">
                    <Select value={newNoteTag} onValueChange={setNewNoteTag}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NOTE_TAGS.map((tag) => (
                          <SelectItem key={tag} value={tag} className="capitalize">
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a staff note..."
                      className="flex-1 min-h-[60px]"
                    />
                  </div>
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || addingNote}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {addingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Note"}
                  </button>
                </div>

                {/* Notes List */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Internal staff notes (not visible to member)</span>
                  </div>

                  {notesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : memberNotes.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No notes yet
                    </p>
                  ) : (
                    memberNotes.map((note) => (
                      <div key={note.id} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getNoteTagClass(note.tag)}`}>
                            {note.tag || "general"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm">{note.note_text}</p>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Member Modal */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Email with identity matching */}
            <div>
              <Label>Email *</Label>
              <div className="relative">
                <Input
                  type="email"
                  value={addMemberData.email}
                  onChange={(e) => {
                    setAddMemberData({ ...addMemberData, email: e.target.value });
                    checkEmailForMatch(e.target.value);
                  }}
                  placeholder="member@example.com"
                />
                {checkingEmail && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {matchedUser && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  ✓ Found existing user: {matchedUser.display_name}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Display Name</Label>
                <Input
                  value={addMemberData.displayName}
                  onChange={(e) => setAddMemberData({ ...addMemberData, displayName: e.target.value })}
                  placeholder="John Smith"
                  disabled={!!matchedUser}
                />
              </div>
              <div>
                <Label>Tier</Label>
                <Select
                  value={addMemberData.tier}
                  onValueChange={(v) => setAddMemberData({ ...addMemberData, tier: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Phone</Label>
              <Input
                value={addMemberData.phone}
                onChange={(e) => setAddMemberData({ ...addMemberData, phone: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Address Line 1</Label>
                <Input
                  value={addMemberData.addressLine1}
                  onChange={(e) => setAddMemberData({ ...addMemberData, addressLine1: e.target.value })}
                />
              </div>
              <div>
                <Label>Address Line 2</Label>
                <Input
                  value={addMemberData.addressLine2}
                  onChange={(e) => setAddMemberData({ ...addMemberData, addressLine2: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>City</Label>
                <Input
                  value={addMemberData.city}
                  onChange={(e) => setAddMemberData({ ...addMemberData, city: e.target.value })}
                />
              </div>
              <div>
                <Label>Postcode</Label>
                <Input
                  value={addMemberData.postcode}
                  onChange={(e) => setAddMemberData({ ...addMemberData, postcode: e.target.value })}
                />
              </div>
              <div>
                <Label>Country</Label>
                <Input
                  value={addMemberData.country}
                  onChange={(e) => setAddMemberData({ ...addMemberData, country: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h4 className="font-medium mb-3">Emergency Contact</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={addMemberData.emergencyName}
                    onChange={(e) => setAddMemberData({ ...addMemberData, emergencyName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Relationship</Label>
                  <Input
                    value={addMemberData.emergencyRelationship}
                    onChange={(e) => setAddMemberData({ ...addMemberData, emergencyRelationship: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={addMemberData.emergencyPhone}
                    onChange={(e) => setAddMemberData({ ...addMemberData, emergencyPhone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => setShowAddMember(false)}
                className="flex-1 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={addingMember || !addMemberData.email}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {addingMember ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Add Member"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "suspend" && "Suspend Member"}
              {confirmAction?.type === "reinstate" && "Reinstate Member"}
              {confirmAction?.type === "offboard" && "Offboard Member"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "suspend" && 
                `Are you sure you want to suspend ${confirmAction.member.profile?.display_name || "this member"}? They will lose access until reinstated.`}
              {confirmAction?.type === "reinstate" && 
                `Are you sure you want to reinstate ${confirmAction.member.profile?.display_name || "this member"}? Their access will be restored.`}
              {confirmAction?.type === "offboard" && 
                `Are you sure you want to offboard ${confirmAction.member.profile?.display_name || "this member"}? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleMemberAction(confirmAction!.type)}
              className={confirmAction?.type === "offboard" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
