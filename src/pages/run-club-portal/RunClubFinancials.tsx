import { useOutletContext } from "react-router-dom";
import { 
  Building2,
  CreditCard,
  Users
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RunClub, useRunClubManagement } from "@/hooks/useRunClubs";

interface RunClubPortalContext {
  selectedClubId: string | null;
  selectedClub: RunClub | null;
}

export default function RunClubFinancials() {
  const { selectedClubId, selectedClub } = useOutletContext<RunClubPortalContext>();
  const { members } = useRunClubManagement(selectedClubId);

  if (!selectedClubId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a run club</p>
      </div>
    );
  }

  const activeMembers = members.filter(m => m.status === 'active').length;
  const isPaid = selectedClub?.membership_type === 'paid';
  const monthlyFee = selectedClub?.membership_fee || 0;
  const projectedMonthly = isPaid ? activeMembers * monthlyFee : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Financials</h2>
        <p className="text-muted-foreground">
          Membership dues overview (placeholder)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membership Type</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {selectedClub?.membership_type || 'Free'}
            </div>
            {isPaid && (
              <p className="text-xs text-muted-foreground">
                £{monthlyFee}/{selectedClub?.membership_fee_cadence}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMembers}</div>
            <p className="text-xs text-muted-foreground">Paying members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projected Revenue</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              £{projectedMonthly.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Per period</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Tracking</CardTitle>
          <CardDescription>
            Full payment processing is coming soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Payment tracking and automated billing will be available in a future update.
              For now, use this page to track membership dues manually.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
