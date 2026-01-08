import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Trash2, Image, Palette, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Sponsor {
  id: string;
  event_id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: string;
  display_order: number;
  is_active: boolean;
}

interface ContextType {
  selectedEventId: string | null;
}

const tiers = [
  { value: "title", label: "Title Partner" },
  { value: "gold", label: "Gold Sponsor" },
  { value: "silver", label: "Silver Sponsor" },
  { value: "bronze", label: "Bronze Sponsor" },
  { value: "standard", label: "Standard Partner" },
];

export default function EventBranding() {
  const { selectedEventId } = useOutletContext<ContextType>();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSponsor, setNewSponsor] = useState({
    name: "",
    logo_url: "",
    website_url: "",
    tier: "standard",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedEventId) {
      fetchSponsors();
    }
  }, [selectedEventId]);

  const fetchSponsors = async () => {
    if (!selectedEventId) return;

    try {
      const { data, error } = await supabase
        .from("event_sponsors")
        .select("*")
        .eq("event_id", selectedEventId)
        .order("display_order");

      if (error) throw error;
      setSponsors(data || []);
    } catch (error) {
      console.error("Error fetching sponsors:", error);
      toast.error("Failed to load sponsors");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newSponsor.name || !selectedEventId) {
      toast.error("Sponsor name is required");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("event_sponsors").insert({
        event_id: selectedEventId,
        name: newSponsor.name,
        logo_url: newSponsor.logo_url || null,
        website_url: newSponsor.website_url || null,
        tier: newSponsor.tier,
        display_order: sponsors.length,
        is_active: true,
      });

      if (error) throw error;
      toast.success("Sponsor added");
      setDialogOpen(false);
      setNewSponsor({ name: "", logo_url: "", website_url: "", tier: "standard" });
      fetchSponsors();
    } catch (error) {
      console.error("Error adding sponsor:", error);
      toast.error("Failed to add sponsor");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this sponsor?")) return;

    try {
      const { error } = await supabase.from("event_sponsors").delete().eq("id", id);
      if (error) throw error;
      toast.success("Sponsor removed");
      fetchSponsors();
    } catch (error) {
      console.error("Error removing sponsor:", error);
      toast.error("Failed to remove sponsor");
    }
  };

  const tierColors: Record<string, string> = {
    title: "bg-yellow-500/20 text-yellow-600",
    gold: "bg-amber-500/20 text-amber-600",
    silver: "bg-gray-400/20 text-gray-600",
    bronze: "bg-orange-500/20 text-orange-600",
    standard: "bg-muted text-muted-foreground",
  };

  if (!selectedEventId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Palette className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Event Selected</h2>
        <p className="text-muted-foreground">
          Select an event to manage branding.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Branding & Sponsors</h1>
          <p className="text-muted-foreground">
            Manage event branding and sponsor logos
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Sponsor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Sponsor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Sponsor Name *</Label>
                <Input
                  id="name"
                  value={newSponsor.name}
                  onChange={(e) =>
                    setNewSponsor((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Acme Corp"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo_url">Logo URL</Label>
                <Input
                  id="logo_url"
                  value={newSponsor.logo_url}
                  onChange={(e) =>
                    setNewSponsor((prev) => ({ ...prev, logo_url: e.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website_url">Website URL</Label>
                <Input
                  id="website_url"
                  value={newSponsor.website_url}
                  onChange={(e) =>
                    setNewSponsor((prev) => ({ ...prev, website_url: e.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>Sponsorship Tier</Label>
                <Select
                  value={newSponsor.tier}
                  onValueChange={(v) =>
                    setNewSponsor((prev) => ({ ...prev, tier: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiers.map((tier) => (
                      <SelectItem key={tier.value} value={tier.value}>
                        {tier.label}
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

      {/* Event Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Event Assets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Image className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="font-medium mb-2">Event Logo</p>
              <p className="text-sm text-muted-foreground mb-4">
                Recommended: 400x400px, PNG or SVG
              </p>
              <Button variant="outline" disabled>
                Upload Logo
              </Button>
            </div>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Image className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="font-medium mb-2">Hero Banner</p>
              <p className="text-sm text-muted-foreground mb-4">
                Recommended: 1920x600px, JPG or PNG
              </p>
              <Button variant="outline" disabled>
                Upload Banner
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sponsors Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Sponsors</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : sponsors.length === 0 ? (
            <div className="text-center py-8">
              <Palette className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No sponsors added yet</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sponsors.map((sponsor) => (
                <Card key={sponsor.id} className="relative group">
                  <CardContent className="pt-4">
                    {sponsor.logo_url ? (
                      <img
                        src={sponsor.logo_url}
                        alt={sponsor.name}
                        className="h-16 w-full object-contain mb-3"
                      />
                    ) : (
                      <div className="h-16 bg-muted rounded flex items-center justify-center mb-3">
                        <span className="text-lg font-bold text-muted-foreground">
                          {sponsor.name[0]}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{sponsor.name}</p>
                        <Badge className={tierColors[sponsor.tier]} variant="secondary">
                          {tiers.find((t) => t.value === sponsor.tier)?.label}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        {sponsor.website_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <a href={sponsor.website_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(sponsor.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
