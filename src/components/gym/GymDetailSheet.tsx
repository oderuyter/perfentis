import { useState, useEffect } from "react";
import { Building2, MapPin, Mail, Phone, Globe, Loader2, MessageSquare, CreditCard, ArrowLeft, CheckCircle } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";

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

type FlowStep = "select" | "request-info" | "signup" | "payment" | "success";

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
  
  // Flow state
  const [flowStep, setFlowStep] = useState<FlowStep>("select");
  
  // Form state - Request Info
  const [message, setMessage] = useState("");
  const [requestCallback, setRequestCallback] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  
  // Form state - Signup
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  useEffect(() => {
    if (gymId && open) {
      fetchGymDetails();
      // Reset state when opening
      setFlowStep("select");
      setMessage("");
      setRequestCallback(false);
      setPhoneNumber("");
      setAgreedToTerms(false);
    }
  }, [gymId, open]);
  
  const fetchGymDetails = async () => {
    if (!gymId) return;
    
    setLoading(true);
    
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
      if (levelsResult.data.length > 0) {
        setSelectedLevelId(levelsResult.data[0].id);
      }
    }
    
    setLoading(false);
  };
  
  const handleRequestInfo = async () => {
    if (!user || !gymId) {
      toast.error("Please sign in to send a request");
      return;
    }
    
    if (!message.trim() && !requestCallback) {
      toast.error("Please enter a message or request a callback");
      return;
    }
    
    if (requestCallback && !phoneNumber.trim()) {
      toast.error("Please enter your phone number for callback");
      return;
    }
    
    setSubmitting(true);
    
    // Create a pending membership with notes for the info request
    const { error } = await supabase
      .from("memberships")
      .insert({
        gym_id: gymId,
        user_id: user.id,
        status: "inquiry",
      });
    
    if (error) {
      console.error("Error sending request:", error);
      toast.error("Failed to send request. Please try again.");
    } else {
      setFlowStep("success");
    }
    
    setSubmitting(false);
  };
  
  const handleSignup = async () => {
    if (!user || !gymId) {
      toast.error("Please sign in to sign up");
      return;
    }
    
    if (!selectedLevelId) {
      toast.error("Please select a membership option");
      return;
    }
    
    if (!agreedToTerms) {
      toast.error("Please agree to the terms and conditions");
      return;
    }
    
    // Move to payment simulation
    setFlowStep("payment");
  };
  
  const handlePaymentComplete = async () => {
    if (!user || !gymId || !selectedLevelId) return;
    
    setSubmitting(true);
    
    // Check for existing membership
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
          : "You already have a pending membership for this gym"
      );
      setSubmitting(false);
      return;
    }
    
    // Create active membership (simulating successful payment)
    const { error } = await supabase
      .from("memberships")
      .insert({
        gym_id: gymId,
        user_id: user.id,
        membership_level_id: selectedLevelId,
        status: "active",
        start_date: new Date().toISOString(),
        payment_status: "paid",
      });
    
    if (error) {
      console.error("Error creating membership:", error);
      toast.error("Failed to complete signup. Please try again.");
    } else {
      setFlowStep("success");
    }
    
    setSubmitting(false);
  };
  
  const formatPrice = (price: number | null, billingCycle: string | null) => {
    if (price === null) return "Contact for pricing";
    const cycle = billingCycle || "month";
    return `£${price.toFixed(2)}/${cycle}`;
  };
  
  const selectedLevel = levels.find(l => l.id === selectedLevelId);
  
  const handleClose = () => {
    onOpenChange(false);
    // Reload page if signup was successful to refresh memberships
    if (flowStep === "success") {
      window.location.reload();
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-2xl">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : gym ? (
          <>
            {/* Header - Always visible */}
            <SheetHeader className="text-left pb-4">
              <div className="flex items-start gap-4">
                {flowStep !== "select" && (
                  <button 
                    onClick={() => setFlowStep("select")}
                    className="mt-1 p-1 rounded-full hover:bg-muted transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
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
            
            {/* Step: Select Action */}
            {flowStep === "select" && (
              <>
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
                
                {/* Membership Levels Preview */}
                {levels.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
                      Membership Options
                    </h3>
                    <div className="space-y-2">
                      {levels.map((level) => (
                        <div
                          key={level.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                        >
                          <div>
                            <span className="font-medium">{level.name}</span>
                            {level.description && (
                              <p className="text-xs text-muted-foreground">{level.description}</p>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-primary">
                            {formatPrice(level.price, level.billing_cycle)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    How would you like to proceed?
                  </h3>
                  
                  <Button
                    variant="outline"
                    onClick={() => setFlowStep("request-info")}
                    className="w-full justify-start h-auto py-4"
                    disabled={!user}
                  >
                    <MessageSquare className="h-5 w-5 mr-3 text-muted-foreground" />
                    <div className="text-left">
                      <p className="font-medium">Request Information</p>
                      <p className="text-xs text-muted-foreground">Send a message or request a callback</p>
                    </div>
                  </Button>
                  
                  <Button
                    onClick={() => setFlowStep("signup")}
                    className="w-full justify-start h-auto py-4"
                    disabled={!user || levels.length === 0}
                  >
                    <CreditCard className="h-5 w-5 mr-3" />
                    <div className="text-left">
                      <p className="font-medium">Sign Up Now</p>
                      <p className="text-xs opacity-80">Choose a plan and start your membership</p>
                    </div>
                  </Button>
                  
                  {!user && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Please sign in to continue
                    </p>
                  )}
                </div>
              </>
            )}
            
            {/* Step: Request Information */}
            {flowStep === "request-info" && (
              <div className="space-y-4">
                <h3 className="font-semibold">Request Information</h3>
                <p className="text-sm text-muted-foreground">
                  Send a message to {gym.name} or request a callback to learn more about their membership options.
                </p>
                
                <div>
                  <Label htmlFor="message">Your Message</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="I'm interested in learning more about..."
                    rows={4}
                    className="mt-1.5"
                    maxLength={1000}
                  />
                </div>
                
                <div className="flex items-start space-x-3 pt-2">
                  <Checkbox
                    id="callback"
                    checked={requestCallback}
                    onCheckedChange={(checked) => setRequestCallback(checked === true)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="callback"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Request a callback
                    </label>
                    <p className="text-xs text-muted-foreground">
                      A staff member will call you back
                    </p>
                  </div>
                </div>
                
                {requestCallback && (
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Your phone number"
                      className="mt-1.5"
                      maxLength={20}
                    />
                  </div>
                )}
                
                <Button
                  onClick={handleRequestInfo}
                  disabled={submitting}
                  className="w-full mt-4"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <MessageSquare className="h-4 w-4 mr-2" />
                  )}
                  Send Request
                </Button>
              </div>
            )}
            
            {/* Step: Signup - Select Plan */}
            {flowStep === "signup" && (
              <div className="space-y-4">
                <h3 className="font-semibold">Choose Your Membership</h3>
                <p className="text-sm text-muted-foreground">
                  Select a membership plan to get started.
                </p>
                
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
                
                <div className="flex items-start space-x-3 pt-4 border-t border-border">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="terms"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I agree to the terms and conditions
                    </label>
                    <p className="text-xs text-muted-foreground">
                      By signing up, you agree to the gym's membership terms
                    </p>
                  </div>
                </div>
                
                <Button
                  onClick={handleSignup}
                  disabled={!selectedLevelId || !agreedToTerms}
                  className="w-full mt-4"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Continue to Payment
                </Button>
              </div>
            )}
            
            {/* Step: Payment (Simulated) */}
            {flowStep === "payment" && selectedLevel && (
              <div className="space-y-6">
                <h3 className="font-semibold">Payment</h3>
                
                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Membership</span>
                    <span className="font-medium">{selectedLevel.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Billing</span>
                    <span className="font-medium capitalize">{selectedLevel.billing_cycle || "Monthly"}</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between">
                    <span className="font-medium">Total</span>
                    <span className="font-semibold text-lg">
                      {formatPrice(selectedLevel.price, selectedLevel.billing_cycle)}
                    </span>
                  </div>
                </div>
                
                {/* Simulated payment form */}
                <div className="space-y-4 p-4 border border-dashed border-primary/50 rounded-xl bg-primary/5">
                  <p className="text-sm text-center text-muted-foreground">
                    🔒 Payment Gateway Placeholder
                  </p>
                  <p className="text-xs text-center text-muted-foreground">
                    Stripe integration will be added here
                  </p>
                </div>
                
                <Button
                  onClick={handlePaymentComplete}
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Complete Payment (Simulated)
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  This is a simulated payment. No actual charge will be made.
                </p>
              </div>
            )}
            
            {/* Step: Success */}
            {flowStep === "success" && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Success!</h3>
                <p className="text-muted-foreground mb-6">
                  {flowStep === "success" && selectedLevelId
                    ? "Your membership is now active. Welcome to the gym!"
                    : "Your request has been sent. The gym will get back to you soon."
                  }
                </p>
                <Button onClick={handleClose}>
                  Done
                </Button>
              </div>
            )}
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
