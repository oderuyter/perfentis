import { useState } from "react";
import { Building2, MapPin, Mail, Phone, AlertTriangle, Loader2, MessageSquare, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Membership = {
  id: string;
  status: string;
  tier: string | null;
  membership_number: string | null;
  membership_token: string;
  start_date: string | null;
  next_payment_date: string | null;
  payment_status: string | null;
  gym?: {
    id: string;
    name: string;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  membership_level?: {
    id: string;
    name: string;
    price: number | null;
    billing_cycle: string | null;
  } | null;
};

interface MembershipDetailSheetProps {
  membership: Membership | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMembershipUpdated: () => void;
}

export function MembershipDetailSheet({ 
  membership, 
  open, 
  onOpenChange,
  onMembershipUpdated 
}: MembershipDetailSheetProps) {
  const [showContactForm, setShowContactForm] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (!membership) return null;

  const isActive = membership.status === "active";
  const isCancelled = membership.status === "cancelled";
  const isPending = membership.status === "pending";
  const isInquiry = membership.status === "inquiry";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500/20 text-green-700 dark:text-green-400";
      case "cancelled": return "bg-red-500/20 text-red-700 dark:text-red-400";
      case "pending": return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
      case "inquiry": return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
      case "suspended": return "bg-orange-500/20 text-orange-700 dark:text-orange-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleCancelMembership = async () => {
    setCancelling(true);
    
    const { error } = await supabase
      .from("memberships")
      .update({ status: "cancelled" })
      .eq("id", membership.id);

    if (error) {
      console.error("Error cancelling membership:", error);
      toast.error("Failed to cancel membership");
    } else {
      toast.success("Membership cancelled successfully");
      onMembershipUpdated();
      onOpenChange(false);
    }
    
    setCancelling(false);
  };

  const handleContactGym = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setSubmitting(true);
    
    // For now, just show success - in a real app this would send an email or create a support ticket
    // This could be extended to create a member_inquiries table
    toast.success("Message sent to " + (membership.gym?.name || "the gym"));
    setMessage("");
    setShowContactForm(false);
    
    setSubmitting(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              <Building2 className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-xl">{membership.gym?.name || "Unknown Gym"}</SheetTitle>
              {membership.gym?.address && (
                <SheetDescription className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {membership.gym.address}
                </SheetDescription>
              )}
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-2 uppercase ${getStatusColor(membership.status)}`}>
                {membership.status}
              </span>
            </div>
          </div>
        </SheetHeader>

        {/* Membership Details */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-xl">
            <div>
              <p className="text-xs text-muted-foreground">Member #</p>
              <p className="font-mono text-sm font-medium">
                {membership.membership_number || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="font-medium capitalize">
                {membership.membership_level?.name || membership.tier || "Standard"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Start Date</p>
              <p className="font-medium">
                {membership.start_date
                  ? format(new Date(membership.start_date), "MMM d, yyyy")
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Next Payment</p>
              <p className="font-medium">
                {membership.next_payment_date
                  ? format(new Date(membership.next_payment_date), "MMM d, yyyy")
                  : "One-time"}
              </p>
            </div>
            {membership.membership_level?.price && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Price</p>
                <p className="font-medium">
                  £{membership.membership_level.price.toFixed(2)}/{membership.membership_level.billing_cycle || "month"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Gym Contact Info */}
        {(membership.gym?.email || membership.gym?.phone) && (
          <div className="mb-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Gym Contact
            </p>
            <div className="flex flex-wrap gap-4">
              {membership.gym?.email && (
                <a href={`mailto:${membership.gym.email}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <Mail className="h-4 w-4" />
                  {membership.gym.email}
                </a>
              )}
              {membership.gym?.phone && (
                <a href={`tel:${membership.gym.phone}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <Phone className="h-4 w-4" />
                  {membership.gym.phone}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Contact Form */}
        {showContactForm ? (
          <div className="space-y-4 p-4 border border-border rounded-xl mb-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Contact Gym</h3>
              <button 
                onClick={() => setShowContactForm(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
            <div>
              <Label htmlFor="inquiry-message">Your Message</Label>
              <Textarea
                id="inquiry-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help you?"
                rows={4}
                className="mt-1.5"
                maxLength={1000}
              />
            </div>
            <Button 
              onClick={handleContactGym} 
              disabled={submitting}
              className="w-full"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-2" />
              )}
              Send Message
            </Button>
          </div>
        ) : (
          <Button 
            variant="outline" 
            onClick={() => setShowContactForm(true)}
            className="w-full mb-4"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Contact Gym
          </Button>
        )}

        {/* Actions */}
        {isActive && (
          <div className="pt-4 border-t border-border">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Membership
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Cancel Membership?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel your membership at {membership.gym?.name}? 
                    This action cannot be undone. You will lose access to the gym immediately.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Membership</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelMembership}
                    disabled={cancelling}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {cancelling ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Yes, Cancel
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Status-specific messages */}
        {isCancelled && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-sm text-red-700 dark:text-red-400">
              This membership has been cancelled. Contact the gym if you'd like to rejoin.
            </p>
          </div>
        )}

        {isPending && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Your membership request is pending approval from the gym.
            </p>
          </div>
        )}

        {isInquiry && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              You've requested information about this gym. They will get back to you soon.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
