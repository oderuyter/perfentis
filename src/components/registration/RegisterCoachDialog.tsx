import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, GraduationCap, X } from "lucide-react";

interface RegisterCoachDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SPECIALTY_OPTIONS = [
  "Strength Training",
  "Powerlifting",
  "Olympic Weightlifting",
  "CrossFit",
  "Endurance",
  "HIIT",
  "Yoga",
  "Pilates",
  "Rehabilitation",
  "Nutrition",
  "Bodybuilding",
  "Functional Fitness",
  "Sports Performance",
  "Mobility",
  "Weight Loss",
];

const DELIVERY_TYPES = [
  { value: "in-person", label: "In-Person Only" },
  { value: "online", label: "Online Only" },
  { value: "hybrid", label: "Both In-Person & Online" },
];

export function RegisterCoachDialog({ open, onOpenChange }: RegisterCoachDialogProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [certificationInput, setCertificationInput] = useState("");
  const [formData, setFormData] = useState({
    displayName: "",
    bio: "",
    specialties: [] as string[],
    certifications: [] as string[],
    hourlyRate: "",
    location: "",
    deliveryType: "",
    reason: "",
  });

  const addSpecialty = (specialty: string) => {
    if (specialty && !formData.specialties.includes(specialty)) {
      setFormData({ ...formData, specialties: [...formData.specialties, specialty] });
    }
    setSpecialtyInput("");
  };

  const removeSpecialty = (specialty: string) => {
    setFormData({
      ...formData,
      specialties: formData.specialties.filter((s) => s !== specialty),
    });
  };

  const addCertification = () => {
    if (certificationInput.trim() && !formData.certifications.includes(certificationInput.trim())) {
      setFormData({
        ...formData,
        certifications: [...formData.certifications, certificationInput.trim()],
      });
      setCertificationInput("");
    }
  };

  const removeCertification = (cert: string) => {
    setFormData({
      ...formData,
      certifications: formData.certifications.filter((c) => c !== cert),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to register as a coach");
      return;
    }

    if (!formData.displayName.trim()) {
      toast.error("Display name is required");
      return;
    }

    if (!formData.bio.trim()) {
      toast.error("Bio is required");
      return;
    }

    if (formData.specialties.length === 0) {
      toast.error("Please select at least one specialty");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("registration_requests").insert({
        request_type: "coach",
        user_id: user.id,
        name: formData.displayName.trim(),
        description: formData.bio.trim(),
        reason: formData.reason.trim() || "Applying to become a coach",
        coach_bio: formData.bio.trim(),
        coach_specialties: formData.specialties,
        coach_certifications: formData.certifications.length > 0 ? formData.certifications : null,
        coach_hourly_rate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
        coach_location: formData.location.trim() || null,
        coach_delivery_type: formData.deliveryType || null,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Application submitted! You'll be notified once reviewed.");
      onOpenChange(false);
      setFormData({
        displayName: "",
        bio: "",
        specialties: [],
        certifications: [],
        hourlyRate: "",
        location: "",
        deliveryType: "",
        reason: "",
      });
    } catch (error: any) {
      console.error("Error submitting registration:", error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Register as a Coach
          </DialogTitle>
          <DialogDescription>
            Apply to become a listed coach on our platform. Your application will be reviewed by our team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name *</Label>
            <Input
              id="display-name"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="How you want to appear to clients"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio *</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell potential clients about your experience, approach, and what makes you unique..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Specialties *</Label>
            <Select value="" onValueChange={addSpecialty}>
              <SelectTrigger>
                <SelectValue placeholder="Select specialties..." />
              </SelectTrigger>
              <SelectContent>
                {SPECIALTY_OPTIONS.filter((s) => !formData.specialties.includes(s)).map((specialty) => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.specialties.map((specialty) => (
                  <Badge key={specialty} variant="secondary" className="gap-1">
                    {specialty}
                    <button type="button" onClick={() => removeSpecialty(specialty)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Certifications</Label>
            <div className="flex gap-2">
              <Input
                value={certificationInput}
                onChange={(e) => setCertificationInput(e.target.value)}
                placeholder="e.g., NASM-CPT, CrossFit L2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCertification();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addCertification}>
                Add
              </Button>
            </div>
            {formData.certifications.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.certifications.map((cert) => (
                  <Badge key={cert} variant="outline" className="gap-1">
                    {cert}
                    <button type="button" onClick={() => removeCertification(cert)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="hourly-rate">Hourly Rate (£)</Label>
              <Input
                id="hourly-rate"
                type="number"
                min="0"
                step="0.01"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                placeholder="e.g., 50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., London, UK"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Delivery Type</Label>
            <Select
              value={formData.deliveryType}
              onValueChange={(value) => setFormData({ ...formData, deliveryType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="How do you deliver coaching?" />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Why do you want to be a coach on our platform?</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Share your motivation and what you hope to achieve..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Application
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
