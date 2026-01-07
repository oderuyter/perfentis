import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  MoreVertical,
  MessageCircle,
  Eye,
  Pause,
  StopCircle,
  User,
  Calendar,
  FileText,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { format } from "date-fns";

interface Coach {
  id: string;
  display_name: string;
}

interface Client {
  id: string;
  client_user_id: string;
  service_id: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  service?: { name: string } | null;
  profile?: { display_name: string; avatar_url: string | null } | null;
}

export default function CoachClients() {
  const { coach } = useOutletContext<{ coach: Coach }>();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (coach?.id) {
      fetchClients();
    }
  }, [coach?.id]);

  const fetchClients = async () => {
    if (!coach?.id) return;

    const { data, error } = await supabase
      .from("coach_clients")
      .select(`
        *,
        service:coach_services(name)
      `)
      .eq("coach_id", coach.id)
      .order("started_at", { ascending: false });

    if (error) {
      console.error("Error fetching clients:", error);
    } else {
      // Fetch profiles for each client
      const clientsWithProfiles = await Promise.all(
        (data || []).map(async (client) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("user_id", client.client_user_id)
            .single();
          return { ...client, profile };
        })
      );
      setClients(clientsWithProfiles);
    }
    setLoading(false);
  };

  const handleStatusChange = async (client: Client, newStatus: string) => {
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "ended") {
      updates.ended_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("coach_clients")
      .update(updates)
      .eq("id", client.id);

    if (error) {
      toast.error("Failed to update client status");
    } else {
      toast.success(`Client ${newStatus === "ended" ? "relationship ended" : "status updated"}`);
      fetchClients();
    }
  };

  const openClientDetail = (client: Client) => {
    setSelectedClient(client);
    setNotes(client.notes || "");
    setSheetOpen(true);
  };

  const saveNotes = async () => {
    if (!selectedClient) return;
    setSavingNotes(true);

    const { error } = await supabase
      .from("coach_clients")
      .update({ notes })
      .eq("id", selectedClient.id);

    if (error) {
      toast.error("Failed to save notes");
    } else {
      toast.success("Notes saved");
      setSelectedClient({ ...selectedClient, notes });
      setClients(
        clients.map((c) =>
          c.id === selectedClient.id ? { ...c, notes } : c
        )
      );
    }
    setSavingNotes(false);
  };

  const filteredClients = clients.filter((client) => {
    const name = client.profile?.display_name || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Active</Badge>;
      case "paused":
        return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">Paused</Badge>;
      case "ended":
        return <Badge variant="secondary">Ended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-semibold">Clients</h2>
          <p className="text-muted-foreground mt-1">
            Manage your coaching relationships
          </p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients..."
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Clients Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card>
          <CardContent className="p-0">
            {filteredClients.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow
                      key={client.id}
                      className="cursor-pointer"
                      onClick={() => openClientDetail(client)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                            {client.profile?.avatar_url ? (
                              <img
                                src={client.profile.avatar_url}
                                alt=""
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <span className="font-medium">
                            {client.profile?.display_name || "Unknown"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{client.service?.name || "—"}</TableCell>
                      <TableCell>{getStatusBadge(client.status)}</TableCell>
                      <TableCell>
                        {format(new Date(client.started_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openClientDetail(client); }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Message
                            </DropdownMenuItem>
                            {client.status === "active" && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(client, "paused"); }}>
                                <Pause className="h-4 w-4 mr-2" />
                                Pause
                              </DropdownMenuItem>
                            )}
                            {client.status === "paused" && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(client, "active"); }}>
                                Resume
                              </DropdownMenuItem>
                            )}
                            {client.status !== "ended" && (
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(client, "ended"); }}
                                className="text-destructive"
                              >
                                <StopCircle className="h-4 w-4 mr-2" />
                                End Relationship
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-1">No clients yet</h3>
                <p className="text-sm text-muted-foreground">
                  Send invitations to start building your client base
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Client Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Client Details</SheetTitle>
          </SheetHeader>
          
          {selectedClient && (
            <div className="space-y-6 mt-6">
              {/* Client Info */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  {selectedClient.profile?.avatar_url ? (
                    <img
                      src={selectedClient.profile.avatar_url}
                      alt=""
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedClient.profile?.display_name || "Unknown"}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(selectedClient.status)}
                    {selectedClient.service && (
                      <Badge variant="outline">{selectedClient.service.name}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Calendar className="h-4 w-4" />
                      <span>Started</span>
                    </div>
                    <p className="font-medium">
                      {format(new Date(selectedClient.started_at), "MMM d, yyyy")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <FileText className="h-4 w-4" />
                      <span>Active Plans</span>
                    </div>
                    <p className="font-medium">0</p>
                  </CardContent>
                </Card>
              </div>

              {/* Internal Notes */}
              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <p className="text-xs text-muted-foreground">
                  These notes are only visible to you
                </p>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add private notes about this client..."
                  rows={4}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveNotes}
                  disabled={savingNotes}
                >
                  {savingNotes ? "Saving..." : "Save Notes"}
                </Button>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Button className="w-full" variant="outline">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button className="w-full" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Assign Plan
                </Button>
                <Button className="w-full" variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Appointment
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}