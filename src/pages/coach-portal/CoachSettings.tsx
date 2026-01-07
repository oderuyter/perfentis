import { Card, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function CoachSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Settings</h2>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Settings className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">Coach Settings</h3>
          <p className="text-sm text-muted-foreground">Configure your coaching preferences</p>
        </CardContent>
      </Card>
    </div>
  );
}