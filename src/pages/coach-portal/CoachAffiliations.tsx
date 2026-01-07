import { Card, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function CoachAffiliations() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Gym Affiliations</h2>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">Gym Partnerships</h3>
          <p className="text-sm text-muted-foreground">Manage your affiliations with gyms and fitness facilities</p>
        </CardContent>
      </Card>
    </div>
  );
}