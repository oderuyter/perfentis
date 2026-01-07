import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function CoachPlans() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Plans & Programs</h2>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">Training Plans</h3>
          <p className="text-sm text-muted-foreground">Create and manage training programs for your clients</p>
        </CardContent>
      </Card>
    </div>
  );
}