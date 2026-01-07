import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function CoachProgress() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Client Progress</h2>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">Progress Tracking</h3>
          <p className="text-sm text-muted-foreground">View workout history, trends, and progress photos for your clients</p>
        </CardContent>
      </Card>
    </div>
  );
}