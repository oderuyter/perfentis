import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Building2,
  Upload,
  Save,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Dumbbell,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface ContextType {
  selectedGymId: string | null;
  selectedGym: { id: string; name: string } | undefined;
}

interface FacilityItem {
  key: string;
  label: string;
  category: string;
}

const FACILITIES: FacilityItem[] = [
  // Equipment
  { key: "weight_machines", label: "Weight Machines", category: "Equipment" },
  { key: "free_weights", label: "Free Weights Area", category: "Equipment" },
  { key: "dumbbells", label: "Dumbbells", category: "Equipment" },
  { key: "cardio_area", label: "Cardio Area", category: "Equipment" },
  { key: "functional_training", label: "Functional Training Area", category: "Equipment" },
  { key: "turf_area", label: "Turf Area", category: "Equipment" },
  // Studios
  { key: "group_exercise_studio", label: "Group Exercise Studio", category: "Studios" },
  { key: "yoga_studio", label: "Yoga Studio", category: "Studios" },
  { key: "spin_studio", label: "Spin Studio", category: "Studios" },
  { key: "boxing_area", label: "Boxing Area", category: "Studios" },
  // Recreation
  { key: "swimming_pool", label: "Swimming Pool", category: "Recreation" },
  { key: "spa", label: "Spa", category: "Recreation" },
  { key: "sauna", label: "Sauna", category: "Recreation" },
  { key: "steam_room", label: "Steam Room", category: "Recreation" },
  { key: "outdoor_training", label: "Outdoor Training Area", category: "Recreation" },
  { key: "sprint_track", label: "Sprint Track", category: "Recreation" },
  { key: "basketball_court", label: "Basketball Court", category: "Recreation" },
  { key: "squash_court", label: "Squash Court", category: "Recreation" },
  { key: "tennis_court", label: "Tennis Court", category: "Recreation" },
  { key: "climbing_wall", label: "Climbing Wall", category: "Recreation" },
  // Services
  { key: "personal_training", label: "Personal Training", category: "Services" },
  { key: "physio", label: "Physiotherapy", category: "Services" },
  { key: "cafe", label: "Café", category: "Services" },
  // Amenities
  { key: "lockers", label: "Lockers", category: "Amenities" },
  { key: "showers", label: "Showers", category: "Amenities" },
  { key: "towel_service", label: "Towel Service", category: "Amenities" },
  { key: "parking", label: "Parking", category: "Amenities" },
  { key: "wifi", label: "WiFi", category: "Amenities" }
];

const groupedFacilities = FACILITIES.reduce((acc, f) => {
  if (!acc[f.category]) acc[f.category] = [];
  acc[f.category].push(f);
  return acc;
}, {} as Record<string, FacilityItem[]>);

export default function GymProfile() {
  const { selectedGymId, selectedGym } = useOutletContext<ContextType>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [gymData, setGymData] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    timezone: "Europe/London"
  });
  const [facilities, setFacilities] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (selectedGymId) {
      fetchGymProfile();
    }
  }, [selectedGymId]);

  const fetchGymProfile = async () => {
    if (!selectedGymId) return;
    setIsLoading(true);

    try {
      // Fetch gym data
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
          timezone: data.timezone || "Europe/London"
        });
        setLogoUrl(data.logo_url || null);
      }

      // Fetch facilities
      const { data: facilityData } = await supabase
        .from("gym_facilities")
        .select("*")
        .eq("gym_id", selectedGymId)
        .single();

      if (facilityData) {
        const facilityState: Record<string, boolean> = {};
        FACILITIES.forEach(f => {
          facilityState[f.key] = !!facilityData[f.key];
        });
        setFacilities(facilityState);
      }
    } catch (error) {
      console.error("Error fetching gym profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGymId) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedGymId}/logo.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('gym-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('gym-logos')
        .getPublicUrl(fileName);

      const newLogoUrl = urlData.publicUrl;

      // Update gym record
      const { error: updateError } = await supabase
        .from("gyms")
        .update({ logo_url: newLogoUrl })
        .eq("id", selectedGymId);

      if (updateError) throw updateError;

      setLogoUrl(newLogoUrl);
      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!selectedGymId) return;

    try {
      const { error } = await supabase
        .from("gyms")
        .update({ logo_url: null })
        .eq("id", selectedGymId);

      if (error) throw error;
      setLogoUrl(null);
      toast.success("Logo removed");
    } catch (error) {
      toast.error("Failed to remove logo");
    }
  };

  const handleSave = async () => {
    if (!selectedGymId) return;
    setIsSaving(true);

    try {
      // Update gym data
      const { error: gymError } = await supabase
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

      if (gymError) throw gymError;

      // Upsert facilities
      const facilityPayload = {
        gym_id: selectedGymId,
        ...facilities
      };

      const { error: facilityError } = await supabase
        .from("gym_facilities")
        .upsert(facilityPayload, { onConflict: "gym_id" });

      if (facilityError) throw facilityError;

      toast.success("Gym profile updated");
    } catch (error) {
      console.error("Error updating gym profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFacility = (key: string) => {
    setFacilities(prev => ({ ...prev, [key]: !prev[key] }));
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-semibold">Gym Profile</h2>
        <p className="text-muted-foreground">Manage your gym's public information</p>
      </div>

      {/* Logo Upload */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold mb-4">Logo</h3>
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              <>
                <img src={logoUrl} alt="Gym logo" className="h-full w-full object-cover" />
                <button
                  onClick={handleRemoveLogo}
                  className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <Building2 className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isUploading ? "Uploading..." : "Upload Logo"}
            </button>
            <p className="text-xs text-muted-foreground mt-2">
              Recommended: 512x512px, PNG or JPG, max 5MB
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
              placeholder="+44 123 456 7890"
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

      {/* Facilities */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Facilities</h3>
        </div>
        <p className="text-sm text-muted-foreground">Select the facilities available at your gym</p>
        
        <div className="space-y-6">
          {Object.entries(groupedFacilities).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">{category}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {items.map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={!!facilities[item.key]}
                      onCheckedChange={() => toggleFacility(item.key)}
                    />
                    <span className="text-sm">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
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
