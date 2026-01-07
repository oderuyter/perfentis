import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  MapPin,
  Globe,
  DollarSign,
  Save,
  Plus,
  X,
  Eye,
  EyeOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Coach {
  id: string;
  display_name: string;
}

interface CoachProfile {
  id: string;
  display_name: string;
  bio: string | null;
  specialties: string[];
  certifications: string[] | null;
  location: string | null;
  hourly_rate: number | null;
  delivery_type: string;
  is_online: boolean;
  is_public: boolean;
  avatar_url: string | null;
}

export default function CoachProfile() {
  const { coach } = useOutletContext<{ coach: Coach }>();
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState("");
  const [newCertification, setNewCertification] = useState("");

  useEffect(() => {
    if (coach?.id) {
      fetchProfile();
    }
  }, [coach?.id]);

  const fetchProfile = async () => {
    if (!coach?.id) return;

    const { data, error } = await supabase
      .from("coaches")
      .select("*")
      .eq("id", coach.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } else {
      setProfile(data as CoachProfile);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    const { error } = await supabase
      .from("coaches")
      .update({
        display_name: profile.display_name,
        bio: profile.bio,
        specialties: profile.specialties,
        certifications: profile.certifications,
        location: profile.location,
        hourly_rate: profile.hourly_rate,
        delivery_type: profile.delivery_type,
        is_online: profile.is_online,
        is_public: profile.is_public,
      })
      .eq("id", profile.id);

    if (error) {
      toast.error("Failed to save profile");
    } else {
      toast.success("Profile saved");
    }
    setSaving(false);
  };

  const addSpecialty = () => {
    if (!newSpecialty.trim() || !profile) return;
    setProfile({
      ...profile,
      specialties: [...(profile.specialties || []), newSpecialty.trim()],
    });
    setNewSpecialty("");
  };

  const removeSpecialty = (index: number) => {
    if (!profile) return;
    setProfile({
      ...profile,
      specialties: profile.specialties.filter((_, i) => i !== index),
    });
  };

  const addCertification = () => {
    if (!newCertification.trim() || !profile) return;
    setProfile({
      ...profile,
      certifications: [...(profile.certifications || []), newCertification.trim()],
    });
    setNewCertification("");
  };

  const removeCertification = (index: number) => {
    if (!profile) return;
    setProfile({
      ...profile,
      certifications: (profile.certifications || []).filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Profile not found
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-semibold">My Profile</h2>
          <p className="text-muted-foreground mt-1">
            Manage your public coaching profile
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </motion.div>

      {/* Basic Info */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={profile.display_name}
                onChange={(e) =>
                  setProfile({ ...profile, display_name: e.target.value })
                }
                placeholder="Your coaching name"
              />
            </div>

            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea
                value={profile.bio || ""}
                onChange={(e) =>
                  setProfile({ ...profile, bio: e.target.value })
                }
                placeholder="Tell potential clients about yourself..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={profile.location || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, location: e.target.value })
                    }
                    placeholder="City, State"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Hourly Rate</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={profile.hourly_rate || ""}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        hourly_rate: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="75"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Delivery Type</Label>
              <Select
                value={profile.delivery_type}
                onValueChange={(value) =>
                  setProfile({ ...profile, delivery_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">In-Person Only</SelectItem>
                  <SelectItem value="remote">Remote Only</SelectItem>
                  <SelectItem value="hybrid">Hybrid (Both)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Specialties */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Specialties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(profile.specialties || []).map((specialty, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                >
                  {specialty}
                  <button
                    onClick={() => removeSpecialty(idx)}
                    className="hover:bg-primary/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                placeholder="Add specialty"
                onKeyDown={(e) => e.key === "Enter" && addSpecialty()}
              />
              <Button variant="outline" size="icon" onClick={addSpecialty}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Certifications */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Certifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(profile.certifications || []).map((cert, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm"
                >
                  {cert}
                  <button
                    onClick={() => removeCertification(idx)}
                    className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newCertification}
                onChange={(e) => setNewCertification(e.target.value)}
                placeholder="Add certification"
                onKeyDown={(e) => e.key === "Enter" && addCertification()}
              />
              <Button variant="outline" size="icon" onClick={addCertification}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Visibility Settings */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Visibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Available for Online Coaching</Label>
                <p className="text-sm text-muted-foreground">
                  Show "Available Online" badge on your profile
                </p>
              </div>
              <Switch
                checked={profile.is_online}
                onCheckedChange={(checked) =>
                  setProfile({ ...profile, is_online: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Public Profile</Label>
                <p className="text-sm text-muted-foreground">
                  Show your profile in "Find a Coach" directory
                </p>
              </div>
              <Switch
                checked={profile.is_public}
                onCheckedChange={(checked) =>
                  setProfile({ ...profile, is_public: checked })
                }
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}