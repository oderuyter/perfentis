import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export default function CoachCalendar() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Calendar</h2>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">Appointments & Schedule</h3>
          <p className="text-sm text-muted-foreground">Manage your coaching calendar and appointments</p>
        </CardContent>
      </Card>
    </div>
  );
}