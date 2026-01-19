import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";

interface RegisterGymDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegisterGymDialog({ open, onOpenChange }: RegisterGymDialogProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address_line1: "",
    address_line2: "",
    city: "",
    postcode: "",
    country: "",
    phone: "",
    email: "",
    website: "",
    isOwnerOrManager: false,
    reason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to register a gym");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Gym name is required");
      return;
    }

    if (!formData.reason.trim()) {
      toast.error("Please provide a reason for registration");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("registration_requests").insert({
        request_type: "gym",
        user_id: user.id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        reason: formData.reason.trim(),
        gym_address_line1: formData.address_line1.trim() || null,
        gym_address_line2: formData.address_line2.trim() || null,
        gym_address_city: formData.city.trim() || null,
        gym_address_postcode: formData.postcode.trim() || null,
        gym_address_country: formData.country.trim() || null,
        gym_phone: formData.phone.trim() || null,
        gym_email: formData.email.trim() || null,
        gym_website: formData.website.trim() || null,
        is_owner_or_manager: formData.isOwnerOrManager,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Registration submitted! You'll be notified once reviewed.");
      onOpenChange(false);
      setFormData({
        name: "",
        description: "",
        address_line1: "",
        address_line2: "",
        city: "",
        postcode: "",
        country: "",
        phone: "",
        email: "",
        website: "",
        isOwnerOrManager: false,
        reason: "",
      });
    } catch (error: any) {
      console.error("Error submitting registration:", error);
      toast.error(error.message || "Failed to submit registration");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Register a Gym
          </DialogTitle>
          <DialogDescription>
            Submit a gym to be listed in our directory. Registrations are reviewed before becoming visible.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gym-name">Gym Name *</Label>
            <Input
              id="gym-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter gym name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gym-description">Description</Label>
            <Textarea
              id="gym-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the gym"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="address-line1">Address Line 1</Label>
              <Input
                id="address-line1"
                value={formData.address_line1}
                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                placeholder="Street address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-line2">Address Line 2</Label>
              <Input
                id="address-line2"
                value={formData.address_line2}
                onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                placeholder="Suite, unit, etc."
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                placeholder="Postcode"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="Country"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+44 123 456 7890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="gym@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://www.example.com"
            />
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Switch
              id="is-owner"
              checked={formData.isOwnerOrManager}
              onCheckedChange={(checked) => setFormData({ ...formData, isOwnerOrManager: checked })}
            />
            <Label htmlFor="is-owner" className="text-sm cursor-pointer">
              I am the owner or manager of this gym
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Registration *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder={formData.isOwnerOrManager 
                ? "Tell us about your gym and why you'd like to list it..." 
                : "Why do you want to add this gym to our directory?"
              }
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Registration
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
