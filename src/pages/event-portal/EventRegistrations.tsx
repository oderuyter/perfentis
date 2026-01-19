import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  Download,
  MoreHorizontal,
  UserCheck,
  UserX,
  Users,
  Mail,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Registration {
  id: string;
  user_id: string;
  division_id: string | null;
  team_id: string | null;
  registration_type: string;
  status: string;
  payment_status: string;
  checked_in_at: string | null;
  created_at: string;
  profiles?: { display_name: string | null };
  event_divisions?: { name: string };
  event_teams?: { name: string };
}

interface Team {
  id: string;
  name: string;
  leader_id: string;
  division_id: string | null;
  size_limit: number;
  status: string;
  created_at: string;
  event_divisions?: { name: string };
  event_team_members?: { id: string; email: string; name: string | null; status: string }[];
  leader_profile?: { display_name: string | null };
}

interface Division {
  id: string;
  name: string;
}

interface ContextType {
  selectedEventId: string | null;
}

export default function EventRegistrations() {
  const { selectedEventId } = useOutletContext<ContextType>();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDivision, setFilterDivision] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    if (selectedEventId) {
      fetchData();
    }
  }, [selectedEventId]);

  const fetchData = async () => {
    if (!selectedEventId) return;

    try {
      // Fetch divisions
      const { data: divData } = await supabase
        .from("event_divisions")
        .select("id, name")
        .eq("event_id", selectedEventId);
      setDivisions(divData || []);

      // Fetch registrations with profiles
      const { data: regData, error: regError } = await supabase
        .from("event_registrations")
        .select(`
          *,
          event_divisions(name),
          event_teams(name)
        `)
        .eq("event_id", selectedEventId)
        .order("created_at", { ascending: false });

      if (regError) throw regError;

      // Fetch profile info for each registration
      const regWithProfiles = await Promise.all(
        (regData || []).map(async (reg) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", reg.user_id)
            .single();
          return { ...reg, profiles: profile };
        })
      );

      setRegistrations(regWithProfiles);

      // Fetch teams
      const { data: teamData, error: teamError } = await supabase
        .from("event_teams")
        .select(`
          *,
          event_divisions(name),
          event_team_members(id, email, name, status)
        `)
        .eq("event_id", selectedEventId)
        .order("created_at", { ascending: false });

      if (teamError) throw teamError;

      // Fetch leader profiles
      const teamsWithLeaders = await Promise.all(
        (teamData || []).map(async (team) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", team.leader_id)
            .single();
          return { ...team, leader_profile: profile };
        })
      );

      setTeams(teamsWithLeaders);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load registrations");
    } finally {
      setLoading(false);
    }
  };

  const updateRegistrationStatus = async (regId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("event_registrations")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", regId);

      if (error) throw error;
      toast.success("Registration updated");
      fetchData();
    } catch (error) {
      console.error("Error updating registration:", error);
      toast.error("Failed to update");
    }
  };

  const checkIn = async (regId: string) => {
    try {
      const { error } = await supabase
        .from("event_registrations")
        .update({
          checked_in_at: new Date().toISOString(),
          status: "checked_in",
          updated_at: new Date().toISOString(),
        })
        .eq("id", regId);

      if (error) throw error;
      toast.success("Checked in!");
      fetchData();
    } catch (error) {
      console.error("Error checking in:", error);
      toast.error("Failed to check in");
    }
  };

  // Temporary: Mark payment as complete manually
  const markPaymentComplete = async (regId: string) => {
    try {
      const { error } = await supabase
        .from("event_registrations")
        .update({
          payment_status: "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("id", regId);

      if (error) throw error;
      toast.success("Payment marked as complete");
      fetchData();
    } catch (error) {
      console.error("Error marking payment:", error);
      toast.error("Failed to update payment status");
    }
  };

  const exportCSV = () => {
    const headers = ["Name", "Division", "Type", "Status", "Payment", "Registered At"];
    const rows = filteredRegistrations.map((r) => [
      r.profiles?.display_name || "Unknown",
      r.event_divisions?.name || "-",
      r.registration_type,
      r.status,
      r.payment_status,
      format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "registrations.csv";
    a.click();
  };

  const filteredRegistrations = registrations.filter((r) => {
    const matchesSearch =
      searchQuery === "" ||
      r.profiles?.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDivision = filterDivision === "all" || r.division_id === filterDivision;
    const matchesStatus = filterStatus === "all" || r.status === filterStatus;
    return matchesSearch && matchesDivision && matchesStatus;
  });

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-600",
    confirmed: "bg-green-500/20 text-green-600",
    checked_in: "bg-blue-500/20 text-blue-600",
    cancelled: "bg-red-500/20 text-red-600",
  };

  const paymentColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-600",
    paid: "bg-green-500/20 text-green-600",
    failed: "bg-red-500/20 text-red-600",
  };

  if (!selectedEventId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Users className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Event Selected</h2>
        <p className="text-muted-foreground">
          Select an event to view registrations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Registration & Teams</h1>
          <p className="text-muted-foreground">
            Manage athlete and team registrations
          </p>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Tabs defaultValue="individuals">
        <TabsList>
          <TabsTrigger value="individuals" className="gap-2">
            <UserCheck className="h-4 w-4" />
            Individuals ({registrations.filter((r) => r.registration_type === "individual").length})
          </TabsTrigger>
          <TabsTrigger value="teams" className="gap-2">
            <Users className="h-4 w-4" />
            Teams ({teams.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individuals" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterDivision} onValueChange={setFilterDivision}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Divisions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Divisions</SelectItem>
                {divisions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="checked_in">Checked In</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Athlete</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredRegistrations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <p className="text-muted-foreground">No registrations found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRegistrations.map((reg) => (
                      <TableRow key={reg.id}>
                        <TableCell>
                          <div className="font-medium">
                            {reg.profiles?.display_name || "Unknown"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {reg.event_divisions?.name || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[reg.status]}>
                            {reg.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={paymentColors[reg.payment_status]}>
                            {reg.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(reg.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!reg.checked_in_at && (
                                <DropdownMenuItem onClick={() => checkIn(reg.id)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Check In
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => updateRegistrationStatus(reg.id, "confirmed")}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirm
                              </DropdownMenuItem>
                              {reg.payment_status !== "paid" && (
                                <DropdownMenuItem
                                  onClick={() => markPaymentComplete(reg.id)}
                                >
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Mark Paid
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => updateRegistrationStatus(reg.id, "cancelled")}
                                className="text-destructive"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>Leader</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : teams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <p className="text-muted-foreground">No teams registered</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    teams.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell>
                          <div className="font-medium">{team.name}</div>
                        </TableCell>
                        <TableCell>
                          {team.event_divisions?.name || "-"}
                        </TableCell>
                        <TableCell>
                          {team.leader_profile?.display_name || "Unknown"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {(team.event_team_members?.filter((m) => m.status === "accepted").length || 0) + 1}
                            /{team.size_limit}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={team.status === "complete" ? "default" : "secondary"}
                          >
                            {team.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
