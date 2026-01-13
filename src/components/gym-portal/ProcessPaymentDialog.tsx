import { useState, useEffect } from "react";
import { Search, Loader2, CheckCircle, PoundSterling, Hash, QrCode, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface ProcessPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gymId: string;
  onSuccess?: () => void;
}

interface MemberResult {
  id: string;
  membership_number: string;
  status: string;
  profiles: { display_name: string } | null;
}

const PAYMENT_TYPES = [
  { value: "subscription", label: "Subscription Payment" },
  { value: "signup_fee", label: "Signup Fee" },
  { value: "day_pass", label: "Day Pass" },
  { value: "class_drop_in", label: "Class Drop-in" },
  { value: "personal_training", label: "Personal Training" },
  { value: "merchandise", label: "Merchandise" },
  { value: "other", label: "Other" },
];

const PAYMENT_METHODS = [
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "direct_debit", label: "Direct Debit" },
];

export function ProcessPaymentDialog({ 
  open, 
  onOpenChange, 
  gymId,
  onSuccess 
}: ProcessPaymentDialogProps) {
  const [activeTab, setActiveTab] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [membershipId, setMembershipId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchResults, setSearchResults] = useState<MemberResult[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberResult | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    type: "subscription",
    method: "card",
    notes: ""
  });

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setMembershipId("");
      setSearchResults([]);
      setSelectedMember(null);
      setPaymentSuccess(false);
      setActiveTab("search");
      setPaymentForm({ amount: "", type: "subscription", method: "card", notes: "" });
    }
  }, [open]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      // Get memberships
      const { data: memberships, error } = await supabase
        .from("memberships")
        .select("id, membership_number, status, user_id")
        .eq("gym_id", gymId)
        .eq("status", "active")
        .limit(50);

      if (error) throw error;

      // Get profiles separately
      const userIds = (memberships || []).map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      // Combine and filter
      const results = (memberships || [])
        .map(m => ({
          id: m.id,
          membership_number: m.membership_number,
          status: m.status,
          profiles: profiles?.find((p: any) => p.id === m.user_id) || null
        }))
        .filter(m => 
          m.membership_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.profiles?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 10);
      
      setSearchResults(results as MemberResult[]);
    } catch (error) {
      console.error("Error searching members:", error);
      toast.error("Failed to search members");
    } finally {
      setIsSearching(false);
    }
  };

  const handleMembershipIdLookup = async () => {
    if (!membershipId.trim()) return;
    setIsSearching(true);
    
    try {
      const { data, error } = await supabase
        .from("memberships")
        .select("id, membership_number, status, user_id")
        .eq("gym_id", gymId)
        .eq("membership_number", membershipId.trim())
        .single();

      if (error || !data) {
        toast.error("Member not found");
        return;
      }

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("id", data.user_id)
        .single();

      setSelectedMember({
        id: data.id,
        membership_number: data.membership_number,
        status: data.status,
        profiles: profile || null
      } as MemberResult);
    } catch (error) {
      console.error("Error looking up member:", error);
      toast.error("Failed to find member");
    } finally {
      setIsSearching(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedMember || !paymentForm.amount) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("gym_payments")
        .insert({
          gym_id: gymId,
          membership_id: selectedMember.id,
          amount: parseFloat(paymentForm.amount),
          payment_type: paymentForm.type,
          payment_method: paymentForm.method,
          status: "completed",
          notes: paymentForm.notes || null,
          paid_at: new Date().toISOString()
        });

      if (error) throw error;

      // If subscription payment, update membership payment status
      if (paymentForm.type === "subscription") {
        await supabase
          .from("memberships")
          .update({ 
            payment_status: "paid",
            next_payment_date: format(
              new Date(new Date().setMonth(new Date().getMonth() + 1)),
              "yyyy-MM-dd"
            )
          })
          .eq("id", selectedMember.id);
      }

      setPaymentSuccess(true);
      toast.success("Payment processed successfully");
      onSuccess?.();
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Failed to process payment");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
          <DialogDescription>
            Search for a member and record their payment.
          </DialogDescription>
        </DialogHeader>

        {paymentSuccess && selectedMember ? (
          <div className="py-8 text-center">
            <div className="h-16 w-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Payment Recorded!</h3>
            <p className="text-2xl font-semibold text-green-600 mb-1">
              £{parseFloat(paymentForm.amount).toFixed(2)}
            </p>
            <p className="text-muted-foreground">
              {selectedMember.profiles?.display_name || "Member"} • {paymentForm.type}
            </p>
            <button
              onClick={() => {
                setPaymentSuccess(false);
                setSelectedMember(null);
                setSearchQuery("");
                setMembershipId("");
                setSearchResults([]);
                setPaymentForm({ amount: "", type: "subscription", method: "card", notes: "" });
              }}
              className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
            >
              Record Another Payment
            </button>
          </div>
        ) : !selectedMember ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="search">
                <Search className="h-4 w-4 mr-2" />
                Search
              </TabsTrigger>
              <TabsTrigger value="id">
                <Hash className="h-4 w-4 mr-2" />
                Member ID
              </TabsTrigger>
              <TabsTrigger value="qr" disabled>
                <QrCode className="h-4 w-4 mr-2" />
                Scan QR
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
                  {searchResults.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => setSelectedMember(member)}
                      className="w-full p-3 flex items-center justify-between hover:bg-muted/50 text-left"
                    >
                      <div>
                        <p className="font-medium">{member.profiles?.display_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          #{member.membership_number}
                        </p>
                      </div>
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="id" className="space-y-4">
              <div className="space-y-2">
                <Label>Membership Number</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., MEM-XXXXXXXX"
                    value={membershipId}
                    onChange={(e) => setMembershipId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleMembershipIdLookup()}
                  />
                  <button
                    onClick={handleMembershipIdLookup}
                    disabled={isSearching || !membershipId.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
                  >
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Find"}
                  </button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="qr" className="py-8 text-center">
              <QrCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">QR scanning coming soon</p>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            {/* Selected Member */}
            <div className="p-4 bg-muted/30 rounded-lg border border-border flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedMember.profiles?.display_name || "Unknown"}</p>
                <p className="text-sm text-muted-foreground">#{selectedMember.membership_number}</p>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Change
              </button>
            </div>

            {/* Payment Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (£) *</Label>
                  <div className="relative">
                    <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Payment Type</Label>
                  <Select 
                    value={paymentForm.type} 
                    onValueChange={(v) => setPaymentForm(prev => ({ ...prev, type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select 
                  value={paymentForm.method} 
                  onValueChange={(v) => setPaymentForm(prev => ({ ...prev, method: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setSelectedMember(null)}
                className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPayment}
                disabled={!paymentForm.amount || isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Record Payment
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}