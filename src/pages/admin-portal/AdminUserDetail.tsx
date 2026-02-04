import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
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
  ArrowLeft,
  Shield,
  Ban,
  CheckCircle,
  KeyRound,
  Loader2,
  Plus,
  X,
  Building2,
  Dumbbell,
  Calendar,
  Users,
  CreditCard,
  Ticket,
  FileText,
  Mail,
  User,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { AppRole } from "@/hooks/useRoles";

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  email?: string | null;
  telephone: string | null;
  created_at: string;
  status: string | null;
  admin_notes: string | null;
  date_of_birth: string | null;
  gender?: string | null;
}

interface UserRole {
  id: string;
  role: AppRole;
  scope_type: string;
  scope_id: string | null;
  is_active: boolean;
  granted_at: string;
  expires_at: string | null;
}

interface GymMembership {
  id: string;
  gym_id: string;
  gym_name: string;
  membership_number: string | null;
  status: string;
  start_date: string;
  end_date: string | null;
  level_name: string | null;
}

interface CoachRelationship {
  id: string;
  coach_id: string;
  coach_name: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  service_name: string | null;
}

interface EventRegistration {
  id: string;
  event_id: string;
  event_name: string;
  status: string;
  registered_at: string;
  event_date: string | null;
}

interface RunClubMembership {
  id: string;
  run_club_id: string;
  run_club_name: string;
  status: string;
  joined_at: string;
}

const ALL_ROLES: AppRole[] = [
  "admin",
  "athlete",
  "gym_manager",
  "gym_staff",
  "gym_user",
  "coach",
  "coach_client",
  "event_organiser",
  "event_member",
  "run_club_organiser",
  "run_club_member",
];

export default function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [gymMemberships, setGymMemberships] = useState<GymMembership[]>([]);
  const [coachRelationships, setCoachRelationships] = useState<CoachRelationship[]>([]);
  const [eventRegistrations, setEventRegistrations] = useState<EventRegistration[]>([]);
  const [runClubMemberships, setRunClubMemberships] = useState<RunClubMembership[]>([]);
  
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [newRole, setNewRole] = useState<AppRole>("athlete");
  const [adminNotes, setAdminNotes] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const fetchUserData = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
      setAdminNotes(profileData?.admin_notes || "");

      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId)
        .order("granted_at", { ascending: false });

      if (!rolesError) {
        setRoles(rolesData || []);
      }

      // Fetch gym memberships
      const { data: membershipsData, error: membershipsError } = await supabase
        .from("memberships")
        .select(`
          id,
          gym_id,
          membership_number,
          status,
          start_date,
          end_date,
          level_id,
          gyms!inner(name),
          membership_levels(name)
        `)
        .eq("user_id", userId)
        .order("start_date", { ascending: false });

      if (!membershipsError && membershipsData) {
        setGymMemberships(membershipsData.map((m: any) => ({
          id: m.id,
          gym_id: m.gym_id,
          gym_name: m.gyms?.name || "Unknown Gym",
          membership_number: m.membership_number,
          status: m.status,
          start_date: m.start_date,
          end_date: m.end_date,
          level_name: m.membership_levels?.name || null,
        })));
      }

      // Fetch coach relationships (as client)
      const { data: coachClientsData, error: coachClientsError } = await supabase
        .from("coach_clients")
        .select(`
          id,
          coach_id,
          status,
          started_at,
          ended_at,
          service_id,
          coaches!inner(display_name),
          coach_services(name)
        `)
        .eq("client_user_id", userId)
        .order("started_at", { ascending: false });

      if (!coachClientsError && coachClientsData) {
        setCoachRelationships(coachClientsData.map((c: any) => ({
          id: c.id,
          coach_id: c.coach_id,
          coach_name: c.coaches?.display_name || "Unknown Coach",
          status: c.status,
          started_at: c.started_at,
          ended_at: c.ended_at,
          service_name: c.coach_services?.name || null,
        })));
      }

      // Fetch event registrations
      const { data: eventRegsData, error: eventRegsError } = await supabase
        .from("event_registrations")
        .select(`
          id,
          event_id,
          status,
          created_at,
          events!inner(name, start_date)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!eventRegsError && eventRegsData) {
        setEventRegistrations(eventRegsData.map((e: any) => ({
          id: e.id,
          event_id: e.event_id,
          event_name: e.events?.name || "Unknown Event",
          status: e.status,
          registered_at: e.created_at,
          event_date: e.events?.start_date || null,
        })));
      }

      // Fetch run club memberships
      const { data: runClubsData, error: runClubsError } = await supabase
        .from("run_club_members")
        .select(`
          id,
          run_club_id,
          status,
          joined_at,
          run_clubs!inner(name)
        `)
        .eq("user_id", userId)
        .order("joined_at", { ascending: false });

      if (!runClubsError && runClubsData) {
        setRunClubMemberships(runClubsData.map((r: any) => ({
          id: r.id,
          run_club_id: r.run_club_id,
          run_club_name: r.run_clubs?.name || "Unknown Club",
          status: r.status,
          joined_at: r.joined_at,
        })));
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to load user data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!userId) return;
    
    setIsResettingPassword(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send reset email");
      }

      await logAuditEvent({
        action: "password_reset_sent",
        message: `Password reset email sent for user ${profile?.display_name || userId}`,
        category: "security",
        entityType: "user",
        entityId: userId,
      });

      toast.success("Password reset email sent");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Failed to reset password");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSuspendUser = async () => {
    if (!profile) return;
    
    const newStatus = profile.status === "suspended" ? "active" : "suspended";
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("user_id", profile.user_id);

      if (error) throw error;

      await logAuditEvent({
        action: newStatus === "suspended" ? "user_suspended" : "user_unsuspended",
        message: `User ${profile.display_name || profile.user_id} ${newStatus === "suspended" ? "suspended" : "unsuspended"}`,
        category: "security",
        entityType: "user",
        entityId: profile.user_id,
      });

      toast.success(`User ${newStatus === "suspended" ? "suspended" : "unsuspended"}`);
      setShowSuspendDialog(false);
      fetchUserData();
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("Failed to update user status");
    }
  };

  const handleAddRole = async () => {
    if (!userId) return;

    setIsSaving(true);
    try {
      // Check if role already exists
      const existingRole = roles.find(r => r.role === newRole && r.is_active);
      if (existingRole) {
        toast.error("User already has this role");
        return;
      }

      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: newRole,
        scope_type: "global",
        is_active: true,
      });

      if (error) throw error;

      await logAuditEvent({
        action: "role_assigned",
        message: `Role '${newRole}' assigned to user ${profile?.display_name || userId}`,
        category: "security",
        entityType: "user",
        entityId: userId,
        metadata: { role: newRole },
      });

      toast.success("Role assigned successfully");
      setShowRoleDialog(false);
      fetchUserData();
    } catch (error) {
      console.error("Error assigning role:", error);
      toast.error("Failed to assign role");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveRole = async (role: UserRole) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ is_active: false })
        .eq("id", role.id);

      if (error) throw error;

      await logAuditEvent({
        action: "role_removed",
        message: `Role '${role.role}' removed from user ${profile?.display_name || userId}`,
        category: "security",
        entityType: "user",
        entityId: userId || "",
        metadata: { role: role.role },
      });

      toast.success("Role removed successfully");
      fetchUserData();
    } catch (error) {
      console.error("Error removing role:", error);
      toast.error("Failed to remove role");
    }
  };

  const handleSaveNotes = async () => {
    if (!userId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ admin_notes: adminNotes })
        .eq("user_id", userId);

      if (error) throw error;

      await logAuditEvent({
        action: "admin_notes_updated",
        message: `Admin notes updated for user ${profile?.display_name || userId}`,
        category: "admin",
        entityType: "user",
        entityId: userId,
      });

      toast.success("Notes saved");
      setShowNotesDialog(false);
      fetchUserData();
    } catch (error) {
      console.error("Error saving notes:", error);
      toast.error("Failed to save notes");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
      case "expired":
        return <Badge variant="outline" className="text-orange-600">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">User not found</p>
        <Button variant="outline" onClick={() => navigate("/admin-portal/users")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
        </Button>
      </div>
    );
  }

  const activeRoles = roles.filter(r => r.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin-portal/users")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">User Details</h1>
          <p className="text-muted-foreground">Manage user account and permissions</p>
        </div>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                {profile.display_name?.charAt(0) || profile.first_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    {profile.display_name || `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "No name"}
                  </h2>
                  <p className="text-sm text-muted-foreground font-mono">{profile.user_id}</p>
                </div>
                {getStatusBadge(profile.status || "active")}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                {profile.email && (
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{profile.email}</p>
                  </div>
                )}
                {profile.telephone && (
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{profile.telephone}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Joined</p>
                  <p className="font-medium">{format(new Date(profile.created_at), "MMM d, yyyy")}</p>
                </div>
                {profile.date_of_birth && (
                  <div>
                    <p className="text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">{format(new Date(profile.date_of_birth), "MMM d, yyyy")}</p>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetPassword}
                  disabled={isResettingPassword}
                >
                  {isResettingPassword ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4 mr-2" />
                  )}
                  Reset Password
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNotesDialog(true)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Admin Notes
                </Button>
                <Button
                  variant={profile.status === "suspended" ? "default" : "destructive"}
                  size="sm"
                  onClick={() => setShowSuspendDialog(true)}
                >
                  {profile.status === "suspended" ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Unsuspend User
                    </>
                  ) : (
                    <>
                      <Ban className="h-4 w-4 mr-2" />
                      Suspend User
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roles Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Roles & Permissions
            </CardTitle>
            <CardDescription>Manage user roles and access levels</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowRoleDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Role
          </Button>
        </CardHeader>
        <CardContent>
          {activeRoles.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No roles assigned</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {activeRoles.map((role) => (
                <Badge
                  key={role.id}
                  variant="secondary"
                  className="text-sm py-1.5 px-3 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  onClick={() => handleRemoveRole(role)}
                >
                  {role.role.replace(/_/g, " ")}
                  {role.scope_id && ` (${role.scope_type})`}
                  <X className="h-3 w-3 ml-2" />
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for different data sections */}
      <Tabs defaultValue="gyms" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="gyms" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Gyms</span>
          </TabsTrigger>
          <TabsTrigger value="coaches" className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            <span className="hidden sm:inline">Coaches</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Events</span>
          </TabsTrigger>
          <TabsTrigger value="runclubs" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Run Clubs</span>
          </TabsTrigger>
        </TabsList>

        {/* Gym Memberships */}
        <TabsContent value="gyms">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Gym Memberships
              </CardTitle>
            </CardHeader>
            <CardContent>
              {gymMemberships.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No gym memberships</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gym</TableHead>
                      <TableHead>Membership #</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gymMemberships.map((membership) => (
                      <TableRow key={membership.id}>
                        <TableCell className="font-medium">{membership.gym_name}</TableCell>
                        <TableCell className="font-mono text-xs">{membership.membership_number || "-"}</TableCell>
                        <TableCell>{membership.level_name || "-"}</TableCell>
                        <TableCell>{getStatusBadge(membership.status)}</TableCell>
                        <TableCell>{format(new Date(membership.start_date), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          {membership.end_date ? format(new Date(membership.end_date), "MMM d, yyyy") : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coach Relationships */}
        <TabsContent value="coaches">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                Coach Relationships
              </CardTitle>
            </CardHeader>
            <CardContent>
              {coachRelationships.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No coach relationships</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coach</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Ended</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coachRelationships.map((rel) => (
                      <TableRow key={rel.id}>
                        <TableCell className="font-medium">{rel.coach_name}</TableCell>
                        <TableCell>{rel.service_name || "-"}</TableCell>
                        <TableCell>{getStatusBadge(rel.status)}</TableCell>
                        <TableCell>{format(new Date(rel.started_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          {rel.ended_at ? format(new Date(rel.ended_at), "MMM d, yyyy") : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Event Registrations */}
        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Event Registrations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventRegistrations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No event registrations</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Event Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventRegistrations.map((reg) => (
                      <TableRow key={reg.id}>
                        <TableCell className="font-medium">{reg.event_name}</TableCell>
                        <TableCell>{getStatusBadge(reg.status)}</TableCell>
                        <TableCell>{format(new Date(reg.registered_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          {reg.event_date ? format(new Date(reg.event_date), "MMM d, yyyy") : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Run Club Memberships */}
        <TabsContent value="runclubs">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Run Club Memberships
              </CardTitle>
            </CardHeader>
            <CardContent>
              {runClubMemberships.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No run club memberships</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Run Club</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runClubMemberships.map((membership) => (
                      <TableRow key={membership.id}>
                        <TableCell className="font-medium">{membership.run_club_name}</TableCell>
                        <TableCell>{getStatusBadge(membership.status)}</TableCell>
                        <TableCell>{format(new Date(membership.joined_at), "MMM d, yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Admin Notes if present */}
      {profile.admin_notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Admin Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg">{profile.admin_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Add Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Role</DialogTitle>
            <DialogDescription>
              Assign a new role to {profile.display_name || "this user"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRole} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Notes</DialogTitle>
            <DialogDescription>
              Internal notes for {profile.display_name || "this user"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add internal notes about this user..."
              rows={6}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotes} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Confirmation Dialog */}
      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {profile.status === "suspended" ? "Unsuspend User?" : "Suspend User?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {profile.status === "suspended"
                ? "This will restore the user's access to their account."
                : "This will prevent the user from accessing their account. They can be unsuspended later."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspendUser}
              className={profile.status !== "suspended" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {profile.status === "suspended" ? "Unsuspend" : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
