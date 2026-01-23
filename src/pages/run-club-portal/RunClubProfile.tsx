import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  Loader2, 
  Save,
  Upload,
  Footprints
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RunClub, useRunClubManagement } from "@/hooks/useRunClubs";
import { toast } from "sonner";

interface RunClubPortalContext {
  selectedClubId: string | null;
  selectedClub: RunClub | null;
  refetchClubs: () => void;
}

export default function RunClubProfile() {
  const { selectedClubId, selectedClub, refetchClubs } = useOutletContext<RunClubPortalContext>();
  const { updateClub, isLoading } = useRunClubManagement(selectedClubId);

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    primary_city: "",
    primary_postcode: "",
    club_style: "",
    membership_type: "free",
    membership_fee: "",
    membership_fee_cadence: "monthly",
    membership_benefits: "",
    membership_expectations: "",
    contact_email: "",
    contact_phone: "",
    website_url: "",
    instagram_handle: "",
    facebook_url: "",
    strava_club_url: "",
    distances_offered: "",
  });

  useEffect(() => {
    if (selectedClub) {
      setFormData({
        name: selectedClub.name || "",
        description: selectedClub.description || "",
        primary_city: selectedClub.primary_city || "",
        primary_postcode: selectedClub.primary_postcode || "",
        club_style: selectedClub.club_style || "",
        membership_type: selectedClub.membership_type || "free",
        membership_fee: selectedClub.membership_fee?.toString() || "",
        membership_fee_cadence: selectedClub.membership_fee_cadence || "monthly",
        membership_benefits: selectedClub.membership_benefits || "",
        membership_expectations: selectedClub.membership_expectations || "",
        contact_email: selectedClub.contact_email || "",
        contact_phone: selectedClub.contact_phone || "",
        website_url: selectedClub.website_url || "",
        instagram_handle: selectedClub.instagram_handle || "",
        facebook_url: selectedClub.facebook_url || "",
        strava_club_url: selectedClub.strava_club_url || "",
        distances_offered: selectedClub.distances_offered?.join(", ") || "",
      });
    }
  }, [selectedClub]);

  if (!selectedClubId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a run club</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateClub({
        name: formData.name,
        description: formData.description || null,
        primary_city: formData.primary_city || null,
        primary_postcode: formData.primary_postcode || null,
        club_style: (formData.club_style as any) || null,
        membership_type: formData.membership_type as any,
        membership_fee: formData.membership_fee ? parseFloat(formData.membership_fee) : null,
        membership_fee_cadence: (formData.membership_fee_cadence as any) || null,
        membership_benefits: formData.membership_benefits || null,
        membership_expectations: formData.membership_expectations || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        website_url: formData.website_url || null,
        instagram_handle: formData.instagram_handle || null,
        facebook_url: formData.facebook_url || null,
        strava_club_url: formData.strava_club_url || null,
        distances_offered: formData.distances_offered.split(",").map(d => d.trim()).filter(Boolean),
      });
      refetchClubs();
      toast.success("Profile saved!");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Club Profile</h2>
          <p className="text-muted-foreground">
            Manage how your club appears to potential members
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Core details about your club</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Club Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Tell potential members about your club..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.primary_city}
                onChange={(e) => setFormData({ ...formData, primary_city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                value={formData.primary_postcode}
                onChange={(e) => setFormData({ ...formData, primary_postcode: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="style">Club Style</Label>
              <Select
                value={formData.club_style}
                onValueChange={(value) => setFormData({ ...formData, club_style: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="competitive">Competitive</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="distances">Distances Offered</Label>
              <Input
                id="distances"
                placeholder="5km, 10km, Half Marathon"
                value={formData.distances_offered}
                onChange={(e) => setFormData({ ...formData, distances_offered: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Membership */}
      <Card>
        <CardHeader>
          <CardTitle>Membership</CardTitle>
          <CardDescription>Fees and expectations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="membership_type">Type</Label>
              <Select
                value={formData.membership_type}
                onValueChange={(value) => setFormData({ ...formData, membership_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.membership_type === "paid" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fee">Fee (£)</Label>
                  <Input
                    id="fee"
                    type="number"
                    value={formData.membership_fee}
                    onChange={(e) => setFormData({ ...formData, membership_fee: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cadence">Cadence</Label>
                  <Select
                    value={formData.membership_fee_cadence}
                    onValueChange={(value) => setFormData({ ...formData, membership_fee_cadence: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                      <SelectItem value="one-time">One-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="benefits">What's Included</Label>
            <Textarea
              id="benefits"
              value={formData.membership_benefits}
              onChange={(e) => setFormData({ ...formData, membership_benefits: e.target.value })}
              rows={3}
              placeholder="List member benefits..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectations">Expectations</Label>
            <Textarea
              id="expectations"
              value={formData.membership_expectations}
              onChange={(e) => setFormData({ ...formData, membership_expectations: e.target.value })}
              rows={3}
              placeholder="What do you expect from members?"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Contact & Social</CardTitle>
          <CardDescription>How members can reach you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Contact Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Contact Phone</Label>
              <Input
                id="phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              placeholder="https://..."
              value={formData.website_url}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram Handle</Label>
              <Input
                id="instagram"
                placeholder="@yourclub"
                value={formData.instagram_handle}
                onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="strava">Strava Club URL</Label>
              <Input
                id="strava"
                placeholder="https://strava.com/clubs/..."
                value={formData.strava_club_url}
                onChange={(e) => setFormData({ ...formData, strava_club_url: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
