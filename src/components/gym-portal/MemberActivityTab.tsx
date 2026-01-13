import { useState, useEffect } from "react";
import { Loader2, LogIn, CreditCard, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface MemberActivityTabProps {
  membershipId: string;
}

interface ActivityItem {
  id: string;
  type: "checkin" | "payment";
  timestamp: string;
  details: string;
  amount?: number;
  currency?: string;
}

export function MemberActivityTab({ membershipId }: MemberActivityTabProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActivityLog();
  }, [membershipId]);

  const fetchActivityLog = async () => {
    setIsLoading(true);
    try {
      // Fetch check-ins
      const { data: checkins, error: checkinError } = await supabase
        .from("membership_checkins")
        .select("id, checked_in_at")
        .eq("membership_id", membershipId)
        .order("checked_in_at", { ascending: false })
        .limit(100);

      if (checkinError) throw checkinError;

      // Fetch payments
      const { data: payments, error: paymentError } = await supabase
        .from("gym_payments")
        .select("id, payment_date, amount, currency, payment_type, description")
        .eq("membership_id", membershipId)
        .order("payment_date", { ascending: false })
        .limit(100);

      if (paymentError) throw paymentError;

      // Combine and sort by date
      const checkinActivities: ActivityItem[] = (checkins || []).map(c => ({
        id: `checkin-${c.id}`,
        type: "checkin" as const,
        timestamp: c.checked_in_at,
        details: "Checked in at gym"
      }));

      const paymentActivities: ActivityItem[] = (payments || []).map(p => ({
        id: `payment-${p.id}`,
        type: "payment" as const,
        timestamp: p.payment_date,
        details: p.description || p.payment_type || "Payment",
        amount: p.amount,
        currency: p.currency || "GBP"
      }));

      const combined = [...checkinActivities, ...paymentActivities]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setActivities(combined);
    } catch (error) {
      console.error("Error fetching activity log:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="max-h-[400px] overflow-y-auto space-y-2">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              activity.type === "checkin" 
                ? "bg-green-500/10 text-green-600" 
                : "bg-blue-500/10 text-blue-600"
            }`}>
              {activity.type === "checkin" ? (
                <LogIn className="h-4 w-4" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm truncate">
                  {activity.type === "checkin" ? "Check-in" : activity.details}
                </p>
                {activity.type === "payment" && activity.amount !== undefined && (
                  <span className="text-sm font-medium text-blue-600">
                    {formatCurrency(activity.amount, activity.currency || "GBP")}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(activity.timestamp), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
