import { Card, CardContent } from "@/components/ui/card";
import { Wallet } from "lucide-react";

export default function CoachFinancials() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Financials</h2>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">Financial Management</h3>
          <p className="text-sm text-muted-foreground">Invoices, transactions, expenses, and P&L reports</p>
        </CardContent>
      </Card>
    </div>
  );
}