import { useState, useEffect } from "react";
import { Building2, MapPin, Mail, Phone, Globe, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type GymDetail = {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
};

type MembershipLevel = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  billing_cycle: string | null;
  access_notes: string | null;
  is_active: boolean;
};

interface GymDetailSheetProps {
  gymId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GymDetailSheet({ gymId, open, onOpenChange }: GymDetailSheetProps) {
  const { user } = useAuth();
  const [gym, setGym] = useState<GymDetail | null>(null);
  const [levels, setLevels] = useState<MembershipLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  
  useEffect(() => {
    if (gymId && open) {
      fetchGymDetails();
    }
  }, [gymId, open]);
  
  const fetchGymDetails = async () => {
    if (!gymId) return;
    
    setLoading(true);
    
    // Fetch gym and membership levels in parallel
    const [gymResult, levelsResult] = await Promise.all([
      supabase
        .from("gyms")
        .select("id, name, address, description, logo_url, email, phone, website")
        .eq("id", gymId)
        .single(),
      supabase
        .from("gym_membership_levels")
        .select("*")
        .eq("gym_id", gymId)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
    ]);
    
    if (gymResult.data) {
      setGym(gymResult.data);
    }
    
    if (levelsResult.data) {
      setLevels(levelsResult.data);
      // Auto-select first level if available
      if (levelsResult.data.length > 0) {
        setSelectedLevelId(levelsResult.data[0].id);
      }
    }
    
    setLoading(false);
  };
  
  const handleSubmitRequest = async () => {
    if (!user || !gymId) {
      toast.error("Please sign in to request membership");
      return;
    }
    
    setSubmitting(true);
    
    // Check if user already has a membership or pending request for this gym
    const { data: existingMembership } = await supabase
      .from("memberships")
      .select("id, status")
      .eq("gym_id", gymId)
      .eq("user_id", user.id)
      .in("status", ["active", "pending"])
      .maybeSingle();
    
    if (existingMembership) {
      toast.error(
        existingMembership.status === "active" 
          ? "You already have an active membership at this gym"
          : "You already have a pending request for this gym"
      );
      setSubmitting(false);
      return;
    }
    
    // Create pending membership request
    const { error } = await supabase
      .from("memberships")
      .insert({
        gym_id: gymId,
        user_id: user.id,
        membership_level_id: selectedLevelId,
        status: "pending",
      });
    
    if (error) {
      console.error("Error creating membership request:", error);
      toast.error("Failed to submit request. Please try again.");
    } else {
      toast.success("Membership request submitted successfully!");
      setMessage("");
      onOpenChange(false);
    }
    
    setSubmitting(false);
  };
  
  const formatPrice = (price: number | null, billingCycle: string | null) => {
    if (price === null) return "Contact for pricing";
    const cycle = billingCycle || "month";
    return `£${price.toFixed(2)}/${cycle}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-2xl">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : gym ? (
          <>
            <SheetHeader className="text-left pb-4">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  {gym.logo_url ? (
                    <img src={gym.logo_url} alt={gym.name} className="h-full w-full object-cover rounded-xl" />
                  ) : (
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <SheetTitle className="text-xl">{gym.name}</SheetTitle>
                  {gym.address && (
                    <SheetDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {gym.address}
                    </SheetDescription>
                  )}
                </div>
              </div>
            </SheetHeader>
            
            {/* Description */}
            {gym.description && (
              <p className="text-sm text-muted-foreground mb-6">{gym.description}</p>
            )}
            
            {/* Contact Info */}
            <div className="flex flex-wrap gap-4 mb-6">
              {gym.email && (
                <a href={`mailto:${gym.email}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <Mail className="h-4 w-4" />
                  {gym.email}
                </a>
              )}
              {gym.phone && (
                <a href={`tel:${gym.phone}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <Phone className="h-4 w-4" />
                  {gym.phone}
                </a>
              )}
              {gym.website && (
                <a href={gym.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <Globe className="h-4 w-4" />
                  Website
                </a>
              )}
            </div>
            
            {/* Membership Levels */}
            {levels.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
                  Membership Options
                </h3>
                <RadioGroup value={selectedLevelId || ""} onValueChange={setSelectedLevelId}>
                  <div className="space-y-3">
                    {levels.map((level) => (
                      <label
                        key={level.id}
                        htmlFor={level.id}
                        className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <RadioGroupItem value={level.id} id={level.id} className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{level.name}</span>
                            <span className="text-sm font-semibold text-primary">
                              {formatPrice(level.price, level.billing_cycle)}
                            </span>
                          </div>
                          {level.description && (
                            <p className="text-sm text-muted-foreground mt-1">{level.description}</p>
                          )}
                          {level.access_notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">{level.access_notes}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            )}
            
            {/* Request Form */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Request to Join
              </h3>
              
              <div>
                <Label htmlFor="message">Message (Optional)</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell the gym a bit about yourself..."
                  rows={3}
                  className="mt-1.5"
                />
              </div>
              
              <Button
                onClick={handleSubmitRequest}
                disabled={submitting || !user}
                className="w-full"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {user ? "Submit Request" : "Sign in to Request"}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                The gym will review your request and get back to you
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Gym not found</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
