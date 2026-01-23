import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Footprints } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { createRunClub } from "@/hooks/useRunClubs";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { toast } from "sonner";

interface RegisterRunClubDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RegisterRunClubDialog({ isOpen, onClose }: RegisterRunClubDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    primary_city: "",
    primary_postcode: "",
    club_style: "" as "social" | "competitive" | "mixed" | "",
    contact_email: "",
  });

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in to create a run club");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Please enter a club name");
      return;
    }

    setIsSubmitting(true);
    try {
      const club = await createRunClub(user.id, {
        name: formData.name,
        description: formData.description || null,
        primary_city: formData.primary_city || null,
        primary_postcode: formData.primary_postcode || null,
        club_style: formData.club_style || null,
        contact_email: formData.contact_email || null,
      });

      await logAuditEvent({
        action: "run_club_created",
        message: `Run club "${formData.name}" created`,
        category: "admin",
        entityType: "run_club",
        entityId: club.id,
      });

      toast.success("Run club created! Complete your profile in the portal.");
      onClose();
      navigate("/run-club-portal");
    } catch (error: any) {
      console.error("Error creating run club:", error);
      toast.error(error.message || "Failed to create run club");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Footprints className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Start a Run Club</DialogTitle>
              <DialogDescription>
                Create your run club and start building your community
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Club Name *</Label>
            <Input
              id="name"
              placeholder="e.g. London Road Runners"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell people about your club..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="e.g. London"
                value={formData.primary_city}
                onChange={(e) => setFormData({ ...formData, primary_city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                placeholder="e.g. SW1A 1AA"
                value={formData.primary_postcode}
                onChange={(e) => setFormData({ ...formData, primary_postcode: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="style">Club Style</Label>
            <Select
              value={formData.club_style}
              onValueChange={(value: "social" | "competitive" | "mixed") => 
                setFormData({ ...formData, club_style: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="social">Social - Fun and inclusive</SelectItem>
                <SelectItem value="competitive">Competitive - Performance focused</SelectItem>
                <SelectItem value="mixed">Mixed - Something for everyone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Contact Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="hello@runclub.com"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Club
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
