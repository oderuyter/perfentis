import { useState, useEffect } from "react";
import { CreditCard, Receipt, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  payment_type: string;
  payment_method: string | null;
  payment_date: string;
  status: string;
  description: string | null;
  invoice_number: string | null;
}

interface MemberPaymentsTabProps {
  membershipId: string;
  gymId: string;
}

export function MemberPaymentsTab({ membershipId, gymId }: MemberPaymentsTabProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: "",
    payment_type: "subscription",
    payment_method: "card",
    description: ""
  });

  useEffect(() => {
    fetchPayments();
  }, [membershipId]);

  const fetchPayments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("gym_payments")
      .select("*")
      .eq("membership_id", membershipId)
      .order("payment_date", { ascending: false });

    if (error) {
      console.error("Error fetching payments:", error);
    } else {
      setPayments(data || []);
    }
    setLoading(false);
  };

  const handleAddPayment = async () => {
    if (!newPayment.amount) {
      toast.error("Please enter an amount");
      return;
    }

    setAdding(true);
    const { error } = await supabase.from("gym_payments").insert({
      membership_id: membershipId,
      gym_id: gymId,
      amount: parseFloat(newPayment.amount),
      payment_type: newPayment.payment_type,
      payment_method: newPayment.payment_method,
      description: newPayment.description || null,
      status: "completed"
    });

    if (error) {
      console.error("Error adding payment:", error);
      toast.error("Failed to add payment");
    } else {
      toast.success("Payment recorded");
      setShowAddPayment(false);
      setNewPayment({
        amount: "",
        payment_type: "subscription",
        payment_method: "card",
        description: ""
      });
      fetchPayments();
    }
    setAdding(false);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-600";
      case "pending":
        return "bg-yellow-500/10 text-yellow-600";
      case "failed":
        return "bg-red-500/10 text-red-600";
      case "refunded":
        return "bg-blue-500/10 text-blue-600";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPaymentTypeIcon = (type: string) => {
    switch (type) {
      case "subscription":
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Receipt className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Payment History
        </h4>
        <Dialog open={showAddPayment} onOpenChange={setShowAddPayment}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
              <Plus className="h-3.5 w-3.5" />
              Add Payment
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Amount (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Payment Type</Label>
                <Select
                  value={newPayment.payment_type}
                  onValueChange={(v) => setNewPayment({ ...newPayment, payment_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="one_time">One-Time</SelectItem>
                    <SelectItem value="addon">Add-on</SelectItem>
                    <SelectItem value="late_fee">Late Fee</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select
                  value={newPayment.payment_method}
                  onValueChange={(v) => setNewPayment({ ...newPayment, payment_method: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="direct_debit">Direct Debit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input
                  value={newPayment.description}
                  onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                  placeholder="Payment description..."
                />
              </div>
              <button
                onClick={handleAddPayment}
                disabled={adding || !newPayment.amount}
                className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
              >
                {adding ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Record Payment"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No payment history</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {getPaymentTypeIcon(payment.payment_type)}
                </div>
                <div>
                  <p className="font-medium">£{Number(payment.amount).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {payment.payment_type.replace("_", " ")} • {payment.payment_method || "N/A"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadgeClass(payment.status)}`}>
                  {payment.status}
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(payment.payment_date), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment Summary */}
      <div className="bg-muted/50 rounded-lg p-4 mt-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Payments</span>
          <span className="font-semibold">
            £{payments.filter(p => p.status === "completed").reduce((sum, p) => sum + Number(p.amount), 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
