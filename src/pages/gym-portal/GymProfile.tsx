import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Building2,
  Upload,
  Save,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Globe
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ContextType {
  selectedGymId: string | null;
  selectedGym: { id: string; name: string } | undefined;
}

export default function GymProfile() {
  const { selectedGymId, selectedGym } = useOutletContext<ContextType>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [gymData, setGymData] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    timezone: "UTC"
  });

  useEffect(() => {
    if (selectedGymId) {
      fetchGymProfile();
    }
  }, [selectedGymId]);

  const fetchGymProfile = async () => {
    if (!selectedGymId) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("gyms")
        .select("*")
        .eq("id", selectedGymId)
        .single();

      if (error) throw error;

      if (data) {
        setGymData({
          name: data.name || "",
          description: data.description || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          website: data.website || "",
          timezone: data.timezone || "UTC"
        });
      }
    } catch (error) {
      console.error("Error fetching gym profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedGymId) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("gyms")
        .update({
          name: gymData.name,
          description: gymData.description || null,
          address: gymData.address || null,
          phone: gymData.phone || null,
          email: gymData.email || null,
          website: gymData.website || null,
          timezone: gymData.timezone
        })
        .eq("id", selectedGymId);

      if (error) throw error;
      toast.success("Gym profile updated");
    } catch (error) {
      console.error("Error updating gym profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (!selectedGymId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a gym.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-semibold">Gym Profile</h2>
        <p className="text-muted-foreground">Manage your gym's public information</p>
      </div>

      {/* Logo Upload */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold mb-4">Logo</h3>
        <div className="flex items-center gap-4">
          <div className="h-24 w-24 rounded-xl bg-muted flex items-center justify-center">
            <Building2 className="h-10 w-10 text-muted-foreground" />
          </div>
          <div>
            <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted">
              <Upload className="h-4 w-4" />
              Upload Logo
            </button>
            <p className="text-xs text-muted-foreground mt-2">
              Recommended: 512x512px, PNG or JPG
            </p>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold">Basic Information</h3>
        
        <div>
          <Label>Gym Name *</Label>
          <Input
            value={gymData.name}
            onChange={(e) => setGymData({ ...gymData, name: e.target.value })}
            placeholder="Your gym name"
          />
        </div>

        <div>
          <Label>Description</Label>
          <Textarea
            value={gymData.description}
            onChange={(e) => setGymData({ ...gymData, description: e.target.value })}
            placeholder="Tell members about your gym..."
            rows={4}
          />
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold">Contact Information</h3>
        
        <div>
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Address
          </Label>
          <Input
            value={gymData.address}
            onChange={(e) => setGymData({ ...gymData, address: e.target.value })}
            placeholder="123 Fitness Street, City"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone
            </Label>
            <Input
              value={gymData.phone}
              onChange={(e) => setGymData({ ...gymData, phone: e.target.value })}
              placeholder="+1 234 567 8900"
            />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <Input
              type="email"
              value={gymData.email}
              onChange={(e) => setGymData({ ...gymData, email: e.target.value })}
              placeholder="hello@yourgym.com"
            />
          </div>
        </div>

        <div>
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Website
          </Label>
          <Input
            value={gymData.website}
            onChange={(e) => setGymData({ ...gymData, website: e.target.value })}
            placeholder="https://yourgym.com"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving || !gymData.name}
          className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Changes
        </button>
      </div>
    </div>
  );
}
