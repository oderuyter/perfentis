import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Download, DollarSign, CreditCard, Receipt, RefreshCcw } from "lucide-react";
import { useState } from "react";

// Placeholder data
const mockTransactions = [
  { id: "1", type: "membership", user: "John Doe", gym: "CrossFit Central", amount: 99.00, status: "completed", date: "2024-01-15" },
  { id: "2", type: "event", user: "Jane Smith", event: "Summer Games 2024", amount: 150.00, status: "completed", date: "2024-01-14" },
  { id: "3", type: "coaching", user: "Mike Johnson", coach: "Sarah Wilson", amount: 200.00, status: "pending", date: "2024-01-13" },
];

const mockRefunds = [
  { id: "1", user: "Alex Brown", amount: 50.00, reason: "Event cancelled", status: "processed", date: "2024-01-10" },
];

export default function AdminBilling() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing & Payments</h1>
          <p className="text-muted-foreground">Platform revenue overview</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Revenue Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$24,580</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memberships</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$12,340</div>
            <p className="text-xs text-muted-foreground">156 transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Event Tickets</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$8,450</div>
            <p className="text-xs text-muted-foreground">89 tickets</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refunds</CardTitle>
            <RefreshCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$320</div>
            <p className="text-xs text-muted-foreground">4 refunds</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="refunds">Refunds</TabsTrigger>
          <TabsTrigger value="invoices">Coach Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{tx.user}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {tx.gym || tx.event || tx.coach}
                      </TableCell>
                      <TableCell>${tx.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={tx.status === "completed" ? "default" : "secondary"}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="refunds">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockRefunds.map((refund) => (
                    <TableRow key={refund.id}>
                      <TableCell className="font-medium">{refund.user}</TableCell>
                      <TableCell>${refund.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">{refund.reason}</TableCell>
                      <TableCell>
                        <Badge variant="default">{refund.status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(refund.date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                Coach invoice management coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
