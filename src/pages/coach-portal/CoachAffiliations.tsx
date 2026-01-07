import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Building2, Plus, MapPin, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Coach {
  id: string;
  user_id: string;
  display_name: string;
}

interface Gym {
  id: string;
  name: string;
  address: string | null;
  status: string;
}

interface Affiliation {
  id: string;
  coach_id: string;
  gym_id: string;
  affiliation_type: string | null;
  delivery_availability: string | null;
  status: string;
  created_at: string;
  approved_at: string | null;
  gym?: Gym;
}

export default function CoachAffiliations() {
  const { coach } = useOutletContext<{ coach: Coach }>();
  const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [form, setForm] = useState({
    gym_id: "",
    affiliation_type: "independent",
    delivery_availability: "in_person"
  });

  useEffect(() => {
    if (coach?.id) {
      fetchData();
    }
  }, [coach?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch affiliations
      const { data: affiliationsData } = await supabase
        .from("coach_gym_affiliations")
        .select("*")
        .eq("coach_id", coach.id)
        .order("created_at", { ascending: false });

      // Fetch gyms for affiliations
      if (affiliationsData && affiliationsData.length > 0) {
        const gymIds = affiliationsData.map(a => a.gym_id);
        const { data: gymsData } = await supabase
          .from("gyms")
          .select("id, name, address, status")
          .in("id", gymIds);

        const affiliationsWithGyms = affiliationsData.map(affiliation => ({
          ...affiliation,
          gym: gymsData?.find(g => g.id === affiliation.gym_id)
        }));
        setAffiliations(affiliationsWithGyms);
      } else {
        setAffiliations([]);
      }

      // Fetch all active gyms for new affiliations
      const { data: allGyms } = await supabase
        .from("gyms")
        .select("id, name, address, status")
        .eq("status", "active")
        .order("name");

      setGyms(allGyms || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAffiliation = async () => {
    if (!form.gym_id) {
      toast.error("Please select a gym");
      return;
    }

    // Check if already affiliated
    const existing = affiliations.find(a => a.gym_id === form.gym_id);
    if (existing) {
      toast.error("You already have an affiliation with this gym");
      return;
    }

    try {
      const { error } = await supabase.from("coach_gym_affiliations").insert({
        coach_id: coach.id,
        gym_id: form.gym_id,
        affiliation_type: form.affiliation_type,
        delivery_availability: form.delivery_availability,
        status: "pending"
      });

      if (error) throw error;
      
      toast.success("Affiliation request sent!");
      setDialogOpen(false);
      setForm({ gym_id: "", affiliation_type: "independent", delivery_availability: "in_person" });
      fetchData();
    } catch (error) {
      console.error("Error requesting affiliation:", error);
      toast.error("Failed to send affiliation request");
    }
  };

  const handleRemoveAffiliation = async (affiliationId: string) => {
    try {
      const { error } = await supabase
        .from("coach_gym_affiliations")
        .delete()
        .eq("id", affiliationId);

      if (error) throw error;
      
      toast.success("Affiliation removed");
      fetchData();
    } catch (error) {
      console.error("Error removing affiliation:", error);
      toast.error("Failed to remove affiliation");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const getDeliveryBadge = (delivery: string | null) => {
    if (!delivery) return null;
    const labels: Record<string, string> = {
      in_person: "In-Person",
      remote: "Remote",
      hybrid: "Hybrid"
    };
    return <Badge variant="outline">{labels[delivery] || delivery}</Badge>;
  };

  const activeAffiliations = affiliations.filter(a => a.status === "approved");
  const pendingAffiliations = affiliations.filter(a => a.status === "pending");

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Gym Affiliations</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={gyms.length === 0}>
              <Plus className="w-4 h-4 mr-2" />Request Affiliation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Gym Affiliation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Gym</Label>
                <Select value={form.gym_id} onValueChange={v => setForm(p => ({ ...p, gym_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a gym" /></SelectTrigger>
                  <SelectContent>
                    {gyms.filter(g => !affiliations.find(a => a.gym_id === g.id)).map(gym => (
                      <SelectItem key={gym.id} value={gym.id}>
                        <div className="flex flex-col">
                          <span>{gym.name}</span>
                          {gym.address && <span className="text-xs text-muted-foreground">{gym.address}</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Affiliation Type</Label>
                <Select value={form.affiliation_type} onValueChange={v => setForm(p => ({ ...p, affiliation_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="independent">Independent Coach</SelectItem>
                    <SelectItem value="employee">Staff Coach</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Delivery Availability</Label>
                <Select value={form.delivery_availability} onValueChange={v => setForm(p => ({ ...p, delivery_availability: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_person">In-Person Only</SelectItem>
                    <SelectItem value="remote">Remote Only</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleRequestAffiliation} className="w-full">Send Request</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{activeAffiliations.length}</div>
            <p className="text-sm text-muted-foreground">Active Affiliations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-500">{pendingAffiliations.length}</div>
            <p className="text-sm text-muted-foreground">Pending Requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{gyms.length}</div>
            <p className="text-sm text-muted-foreground">Available Gyms</p>
          </CardContent>
        </Card>
      </div>

      {/* Affiliations List */}
      {affiliations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-1">No Gym Affiliations</h3>
            <p className="text-sm text-muted-foreground mb-4">Partner with gyms to expand your reach</p>
            <Button onClick={() => setDialogOpen(true)} disabled={gyms.length === 0}>
              <Plus className="w-4 h-4 mr-2" />Request Affiliation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {affiliations.map(affiliation => (
            <Card key={affiliation.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                    {affiliation.gym?.name || "Unknown Gym"}
                  </CardTitle>
                  {getStatusBadge(affiliation.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    {affiliation.gym?.address && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {affiliation.gym.address}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize">
                        {affiliation.affiliation_type?.replace("_", " ") || "Independent"}
                      </Badge>
                      {getDeliveryBadge(affiliation.delivery_availability)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Requested {format(new Date(affiliation.created_at), "MMM d, yyyy")}
                      {affiliation.approved_at && ` • Approved ${format(new Date(affiliation.approved_at), "MMM d, yyyy")}`}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRemoveAffiliation(affiliation.id)}
                  >
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
