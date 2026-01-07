import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mail,
  Plus,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  MoreVertical,
  Copy,
  Trash2,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

interface Coach {
  id: string;
  display_name: string;
}

interface Service {
  id: string;
  name: string;
}

interface Invitation {
  id: string;
  email: string;
  name: string | null;
  service_id: string | null;
  message: string | null;
  token: string;
  status: string;
  expires_at: string;
  created_at: string;
  service?: { name: string } | null;
}

export default function CoachInvitations() {
  const { coach } = useOutletContext<{ coach: Coach }>();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    service_id: "",
    message: "",
  });

  useEffect(() => {
    if (coach?.id) {
      fetchData();
    }
  }, [coach?.id]);

  const fetchData = async () => {
    if (!coach?.id) return;

    const [invitesRes, servicesRes] = await Promise.all([
      supabase
        .from("coach_invitations")
        .select("*, service:coach_services(name)")
        .eq("coach_id", coach.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("coach_services")
        .select("id, name")
        .eq("coach_id", coach.id)
        .eq("is_active", true),
    ]);

    if (invitesRes.data) setInvitations(invitesRes.data);
    if (servicesRes.data) setServices(servicesRes.data);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!coach?.id || !formData.email.trim()) {
      toast.error("Email is required");
      return;
    }

    setSending(true);

    const { error } = await supabase.from("coach_invitations").insert({
      coach_id: coach.id,
      email: formData.email.trim(),
      name: formData.name.trim() || null,
      service_id: formData.service_id || null,
      message: formData.message.trim() || null,
    });

    if (error) {
      toast.error("Failed to create invitation");
    } else {
      toast.success("Invitation created! Share the link with your client.");
      setFormData({ email: "", name: "", service_id: "", message: "" });
      setDialogOpen(false);
      fetchData();
    }
    setSending(false);
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/accept-coach-invite?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied to clipboard");
  };

  const revokeInvitation = async (id: string) => {
    const { error } = await supabase
      .from("coach_invitations")
      .update({ status: "revoked" })
      .eq("id", id);

    if (error) {
      toast.error("Failed to revoke invitation");
    } else {
      toast.success("Invitation revoked");
      fetchData();
    }
  };

  const resendInvitation = async (invitation: Invitation) => {
    // Create new invitation with same details
    const { error } = await supabase.from("coach_invitations").insert({
      coach_id: coach.id,
      email: invitation.email,
      name: invitation.name,
      service_id: invitation.service_id,
      message: invitation.message,
    });

    if (error) {
      toast.error("Failed to resend invitation");
    } else {
      // Revoke old one
      await supabase
        .from("coach_invitations")
        .update({ status: "revoked" })
        .eq("id", invitation.id);
      toast.success("New invitation created");
      fetchData();
    }
  };

  const getStatusBadge = (invitation: Invitation) => {
    const isExpired = new Date(invitation.expires_at) < new Date();
    
    if (invitation.status === "accepted") {
      return <Badge className="bg-green-500/10 text-green-500"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
    }
    if (invitation.status === "revoked") {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Revoked</Badge>;
    }
    if (isExpired) {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Expired</Badge>;
    }
    return <Badge className="bg-amber-500/10 text-amber-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
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
          <h2 className="text-2xl font-semibold">Invitations</h2>
          <p className="text-muted-foreground mt-1">
            Invite new clients to work with you
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Invitation
        </Button>
      </motion.div>

      {/* Invitations List */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        {invitations.length > 0 ? (
          invitations.map((invitation) => (
            <Card key={invitation.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {invitation.name || invitation.email}
                        </p>
                        {getStatusBadge(invitation)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {invitation.email}
                        {invitation.service && ` • ${invitation.service.name}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sent {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                        {invitation.status === "pending" && 
                          ` • Expires ${format(new Date(invitation.expires_at), "MMM d, yyyy")}`
                        }
                      </p>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {invitation.status === "pending" && (
                        <>
                          <DropdownMenuItem onClick={() => copyInviteLink(invitation.token)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => revokeInvitation(invitation.id)}
                            className="text-destructive"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Revoke
                          </DropdownMenuItem>
                        </>
                      )}
                      {(invitation.status === "expired" || invitation.status === "revoked") && (
                        <DropdownMenuItem onClick={() => resendInvitation(invitation)}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Resend
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">No invitations yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Send your first client invitation
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Invitation
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Create Invitation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite New Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="client@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Name (optional)</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Client's name"
              />
            </div>

            {services.length > 0 && (
              <div className="space-y-2">
                <Label>Service (optional)</Label>
                <Select
                  value={formData.service_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, service_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Personal Message (optional)</Label>
              <Textarea
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                placeholder="Add a personal note to your invitation..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Sending..." : "Create Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}