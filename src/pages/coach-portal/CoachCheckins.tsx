import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck } from "lucide-react";

export default function CoachCheckins() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Check-ins</h2>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">Client Check-ins</h3>
          <p className="text-sm text-muted-foreground">Manage check-in templates and review client submissions</p>
        </CardContent>
      </Card>
    </div>
  );
}