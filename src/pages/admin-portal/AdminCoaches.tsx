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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Search,
  MoreHorizontal,
  Eye,
  EyeOff,
  Users,
  Download,
  GraduationCap,
  Calendar,
  DollarSign,
  Link2Off,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { logAuditEvent } from "@/hooks/useAuditLog";

interface Coach {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  specialties: string[] | null;
  delivery_type: string | null;
  location: string | null;
  is_public: boolean | null;
  created_at: string;
  client_count?: number;
}

interface CoachClient {
  id: string;
  coach_id: string;
  client_user_id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  coach_name?: string;
  client_name?: string;
}

export default function AdminCoaches() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [clients, setClients] = useState<CoachClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<CoachClient | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coachesRes, clientsRes, profilesRes] = await Promise.all([
        supabase.from("coaches").select("*").order("display_name"),
        supabase.from("coach_clients").select("*").order("started_at", { ascending: false }),
        supabase.from("profiles").select("user_id, display_name"),
      ]);

      if (coachesRes.error) throw coachesRes.error;
      if (clientsRes.error) throw clientsRes.error;

      const profileMap = new Map<string, string>();
      (profilesRes.data || []).forEach((p) => {
        profileMap.set(p.user_id, p.display_name || "Unknown");
      });

      // Count clients per coach
      const clientCounts: Record<string, number> = {};
      (clientsRes.data || [])
        .filter((c) => c.status === "active")
        .forEach((c) => {
          clientCounts[c.coach_id] = (clientCounts[c.coach_id] || 0) + 1;
        });

      const coachesWithCounts = (coachesRes.data || []).map((coach) => ({
        ...coach,
        client_count: clientCounts[coach.id] || 0,
      }));

      // Map client relationships with names
      const clientsWithNames = (clientsRes.data || []).map((client) => {
        const coach = coachesRes.data?.find((c) => c.id === client.coach_id);
        return {
          ...client,
          coach_name: coach?.display_name || "Unknown Coach",
          client_name: profileMap.get(client.client_user_id) || "Unknown Client",
        };
      });

      setCoaches(coachesWithCounts);
      setClients(clientsWithNames);
    } catch (error) {
      console.error("Error fetching coaches:", error);
      toast.error("Failed to load coaches");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCoaches = coaches.filter(
    (coach) =>
      !searchQuery ||
      coach.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coach.specialties?.some((s) =>
        s.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const handleToggleVisibility = async (coach: Coach) => {
    const newVisibility = !coach.is_public;

    try {
      const { error } = await supabase
        .from("coaches")
        .update({ is_public: newVisibility })
        .eq("id", coach.id);

      if (error) throw error;

      await logAuditEvent({
        action: newVisibility ? "coach_published" : "coach_unpublished",
        message: `Coach '${coach.display_name}' ${newVisibility ? "made public" : "hidden from directory"}`,
        category: "admin",
        entityType: "coach",
        entityId: coach.id,
      });

      toast.success(`Coach ${newVisibility ? "published" : "hidden"}`);
      fetchData();
    } catch (error) {
      console.error("Error updating coach visibility:", error);
      toast.error("Failed to update coach visibility");
    }
  };

  const handleTerminateRelationship = async () => {
    if (!selectedRelationship) return;

    try {
      const { error } = await supabase
        .from("coach_clients")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", selectedRelationship.id);

      if (error) throw error;

      await logAuditEvent({
        action: "coach_client_terminated",
        message: `Coach-client relationship terminated: ${selectedRelationship.coach_name} → ${selectedRelationship.client_name}`,
        category: "admin",
        entityType: "coach_client",
        entityId: selectedRelationship.id,
      });

      toast.success("Relationship terminated");
      setShowTerminateDialog(false);
      setSelectedRelationship(null);
      fetchData();
    } catch (error) {
      console.error("Error terminating relationship:", error);
      toast.error("Failed to terminate relationship");
    }
  };

  const exportCoaches = () => {
    const csvData = filteredCoaches.map((coach) => ({
      id: coach.id,
      display_name: coach.display_name,
      specialties: coach.specialties?.join("|") || "",
      delivery_type: coach.delivery_type || "",
      location: coach.location || "",
      is_public: coach.is_public ? "yes" : "no",
      active_clients: coach.client_count,
      created_at: coach.created_at,
    }));

    const headers = Object.keys(csvData[0] || {}).join(",");
    const rows = csvData.map((row) => Object.values(row).join(",")).join("\n");
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coaches-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    logAuditEvent({
      action: "coaches_exported",
      message: `Exported ${filteredCoaches.length} coaches to CSV`,
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
          <h1 className="text-2xl font-bold">Coaches</h1>
          <p className="text-muted-foreground">
            Manage coaches and client relationships
          </p>
        </div>
        <Button variant="outline" onClick={exportCoaches}>
          <Download className="h-4 w-4 mr-2" />
          Export Coaches
        </Button>
      </div>

      <Tabs defaultValue="coaches">
        <TabsList>
          <TabsTrigger value="coaches" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Coaches ({coaches.length})
          </TabsTrigger>
          <TabsTrigger value="relationships" className="gap-2">
            <Users className="h-4 w-4" />
            Client Relationships ({clients.length})
          </TabsTrigger>
        </TabsList>

        {/* Coaches Tab */}
        <TabsContent value="coaches" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Coaches ({filteredCoaches.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Specialties</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead>Visibility</TableHead>
                      <TableHead>Clients</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCoaches.map((coach) => (
                      <TableRow key={coach.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <GraduationCap className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="font-medium">{coach.display_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {coach.location || "No location"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(coach.specialties || []).slice(0, 2).map((s, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {s}
                              </Badge>
                            ))}
                            {(coach.specialties?.length || 0) > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{coach.specialties!.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {coach.delivery_type || "Not set"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {coach.is_public ? (
                            <Badge variant="default">Public</Badge>
                          ) : (
                            <Badge variant="secondary">Hidden</Badge>
                          )}
                        </TableCell>
                        <TableCell>{coach.client_count}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(coach.created_at), "MMM d, yyyy")}
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
                                  setSelectedCoach(coach);
                                  setShowDetailDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Calendar className="h-4 w-4 mr-2" />
                                View Calendar
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <DollarSign className="h-4 w-4 mr-2" />
                                View Financials
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleToggleVisibility(coach)}
                              >
                                {coach.is_public ? (
                                  <>
                                    <EyeOff className="h-4 w-4 mr-2" />
                                    Hide from Directory
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Publish to Directory
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
        </TabsContent>

        {/* Relationships Tab */}
        <TabsContent value="relationships" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Coach-Client Relationships
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coach</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Ended</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((rel) => (
                      <TableRow key={rel.id}>
                        <TableCell className="font-medium">
                          {rel.coach_name}
                        </TableCell>
                        <TableCell>{rel.client_name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              rel.status === "active"
                                ? "default"
                                : rel.status === "paused"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {rel.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(rel.started_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {rel.ended_at
                            ? format(new Date(rel.ended_at), "MMM d, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {rel.status === "active" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedRelationship(rel);
                                setShowTerminateDialog(true);
                              }}
                            >
                              <Link2Off className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Coach Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Coach Profile</DialogTitle>
          </DialogHeader>
          {selectedCoach && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">{selectedCoach.display_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Visibility</Label>
                  <p>
                    <Badge variant={selectedCoach.is_public ? "default" : "secondary"}>
                      {selectedCoach.is_public ? "Public" : "Hidden"}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Delivery Type</Label>
                  <p>{selectedCoach.delivery_type || "Not set"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Location</Label>
                  <p>{selectedCoach.location || "Not set"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Active Clients</Label>
                  <p>{selectedCoach.client_count}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Specialties</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(selectedCoach.specialties || []).map((s, i) => (
                    <Badge key={i} variant="outline">{s}</Badge>
                  ))}
                </div>
              </div>
              {selectedCoach.bio && (
                <div>
                  <Label className="text-muted-foreground">Bio</Label>
                  <p className="text-sm mt-1">{selectedCoach.bio}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Terminate Relationship Dialog */}
      <Dialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminate Relationship</DialogTitle>
            <DialogDescription>
              Are you sure you want to terminate the coaching relationship between{" "}
              <strong>{selectedRelationship?.coach_name}</strong> and{" "}
              <strong>{selectedRelationship?.client_name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTerminateDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleTerminateRelationship}>
              Terminate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
