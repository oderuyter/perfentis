import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Wallet,
  Plus,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  MoreVertical,
  Receipt,
  CreditCard,
  PiggyBank,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCoachFinancials, useCoachClients, useCoachServices } from "@/hooks/useCoach";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

interface Coach {
  id: string;
  display_name: string;
}

const EXPENSE_CATEGORIES = [
  "Equipment",
  "Software",
  "Marketing",
  "Education",
  "Insurance",
  "Travel",
  "Rent",
  "Utilities",
  "Other",
];

export default function CoachFinancials() {
  const { coach } = useOutletContext<{ coach: Coach }>();
  const { invoices, transactions, expenses, isLoading, refetch } = useCoachFinancials(coach?.id);
  const { clients } = useCoachClients(coach?.id);
  const { services } = useCoachServices(coach?.id);

  const [activeTab, setActiveTab] = useState("overview");
  const [showInvoiceSheet, setShowInvoiceSheet] = useState(false);
  const [showExpenseSheet, setShowExpenseSheet] = useState(false);
  const [showTransactionSheet, setShowTransactionSheet] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Invoice form state
  const [invoiceClientId, setInvoiceClientId] = useState("");
  const [invoiceServiceId, setInvoiceServiceId] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceDescription, setInvoiceDescription] = useState("");
  const [invoiceDueDate, setInvoiceDueDate] = useState("");

  // Expense form state
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [expenseNotes, setExpenseNotes] = useState("");

  // Transaction form state
  const [transactionType, setTransactionType] = useState("payment");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDescription, setTransactionDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Calculate financial metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Revenue from paid invoices
    const paidInvoices = invoices.filter((i) => i.status === "paid");
    const totalRevenue = paidInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);

    const mtdRevenue = paidInvoices
      .filter((i) => {
        const paidDate = new Date(i.paid_at || i.created_at);
        return isWithinInterval(paidDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    const last30Revenue = paidInvoices
      .filter((i) => {
        const paidDate = new Date(i.paid_at || i.created_at);
        return paidDate >= thirtyDaysAgo;
      })
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    // Outstanding invoices
    const outstandingInvoices = invoices.filter(
      (i) => i.status === "sent" || i.status === "draft"
    );
    const outstandingAmount = outstandingInvoices.reduce(
      (sum, i) => sum + (i.amount || 0),
      0
    );

    // Expenses
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const mtdExpenses = expenses
      .filter((e) => {
        const expenseDate = new Date(e.expense_date);
        return isWithinInterval(expenseDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // Net profit
    const netProfit = totalRevenue - totalExpenses;
    const mtdNetProfit = mtdRevenue - mtdExpenses;

    return {
      totalRevenue,
      mtdRevenue,
      last30Revenue,
      outstandingAmount,
      outstandingCount: outstandingInvoices.length,
      paidCount: paidInvoices.length,
      totalExpenses,
      mtdExpenses,
      netProfit,
      mtdNetProfit,
    };
  }, [invoices, expenses]);

  const resetInvoiceForm = () => {
    setInvoiceClientId("");
    setInvoiceServiceId("");
    setInvoiceAmount("");
    setInvoiceDescription("");
    setInvoiceDueDate("");
  };

  const resetExpenseForm = () => {
    setExpenseAmount("");
    setExpenseCategory("");
    setExpenseDescription("");
    setExpenseDate(format(new Date(), "yyyy-MM-dd"));
    setExpenseNotes("");
  };

  const resetTransactionForm = () => {
    setTransactionType("payment");
    setTransactionAmount("");
    setTransactionDescription("");
    setTransactionDate(format(new Date(), "yyyy-MM-dd"));
  };

  const handleCreateInvoice = async () => {
    if (!invoiceAmount || !coach) return;

    setSaving(true);
    try {
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

      const { error } = await supabase.from("coach_invoices").insert({
        coach_id: coach.id,
        client_id: invoiceClientId || null,
        service_id: invoiceServiceId || null,
        amount: parseFloat(invoiceAmount),
        description: invoiceDescription.trim() || null,
        due_date: invoiceDueDate || null,
        invoice_number: invoiceNumber,
        status: "draft",
      });

      if (error) throw error;

      toast.success("Invoice created");
      setShowInvoiceSheet(false);
      resetInvoiceForm();
      refetch();
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error("Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateExpense = async () => {
    if (!expenseAmount || !coach) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("coach_expenses").insert({
        coach_id: coach.id,
        amount: parseFloat(expenseAmount),
        category: expenseCategory || null,
        description: expenseDescription.trim() || null,
        expense_date: expenseDate,
        notes: expenseNotes.trim() || null,
      });

      if (error) throw error;

      toast.success("Expense recorded");
      setShowExpenseSheet(false);
      resetExpenseForm();
      refetch();
    } catch (error) {
      console.error("Error creating expense:", error);
      toast.error("Failed to record expense");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTransaction = async () => {
    if (!transactionAmount || !coach) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("coach_transactions").insert({
        coach_id: coach.id,
        amount: parseFloat(transactionAmount),
        transaction_type: transactionType,
        description: transactionDescription.trim() || null,
        transaction_date: transactionDate,
      });

      if (error) throw error;

      toast.success("Transaction recorded");
      setShowTransactionSheet(false);
      resetTransactionForm();
      refetch();
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error("Failed to record transaction");
    } finally {
      setSaving(false);
    }
  };

  const handleSendInvoice = async (invoice: any) => {
    try {
      const { error } = await supabase
        .from("coach_invoices")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", invoice.id);

      if (error) throw error;

      toast.success("Invoice marked as sent");
      refetch();
    } catch (error) {
      console.error("Error sending invoice:", error);
      toast.error("Failed to send invoice");
    }
  };

  const handleMarkPaid = async (invoice: any) => {
    try {
      const { error } = await supabase
        .from("coach_invoices")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", invoice.id);

      if (error) throw error;

      // Also create a transaction record
      await supabase.from("coach_transactions").insert({
        coach_id: coach.id,
        amount: invoice.amount,
        transaction_type: "payment",
        description: `Payment for ${invoice.invoice_number}`,
        invoice_id: invoice.id,
      });

      toast.success("Invoice marked as paid");
      refetch();
    } catch (error) {
      console.error("Error marking invoice paid:", error);
      toast.error("Failed to update invoice");
    }
  };

  const handleVoidInvoice = async () => {
    if (!selectedInvoice) return;

    try {
      const { error } = await supabase
        .from("coach_invoices")
        .update({ status: "void" })
        .eq("id", selectedInvoice.id);

      if (error) throw error;

      toast.success("Invoice voided");
      setShowVoidDialog(false);
      setSelectedInvoice(null);
      refetch();
    } catch (error) {
      console.error("Error voiding invoice:", error);
      toast.error("Failed to void invoice");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Paid</Badge>;
      case "sent":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Sent</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "void":
        return <Badge variant="destructive">Void</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  const activeClients = clients.filter((c) => c.status === "active");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Financials</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowExpenseSheet(true)}>
            <Receipt className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
          <Button onClick={() => setShowInvoiceSheet(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="expenses">Expenses ({expenses.length})</TabsTrigger>
          <TabsTrigger value="pnl">P&L</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Revenue (MTD)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(metrics.mtdRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(metrics.last30Revenue)} last 30 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(metrics.outstandingAmount)}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.outstandingCount} invoice{metrics.outstandingCount !== 1 ? "s" : ""} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Expenses (MTD)</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(metrics.mtdExpenses)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(metrics.totalExpenses)} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Net Profit (MTD)</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${metrics.mtdNetProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
                  {formatCurrency(metrics.mtdNetProfit)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(metrics.netProfit)} total
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No invoices yet</p>
                ) : (
                  <div className="space-y-3">
                    {invoices.slice(0, 5).map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{invoice.invoice_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.client?.profiles?.display_name || "No client"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(invoice.amount)}</p>
                          {getStatusBadge(invoice.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                {expenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No expenses recorded</p>
                ) : (
                  <div className="space-y-3">
                    {expenses.slice(0, 5).map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{expense.description || expense.category || "Expense"}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(expense.expense_date), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-destructive">
                            -{formatCurrency(expense.amount)}
                          </p>
                          {expense.category && (
                            <Badge variant="outline" className="text-xs">
                              {expense.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          {invoices.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-1">No Invoices</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first invoice to track payments
                </p>
                <Button onClick={() => setShowInvoiceSheet(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoice_number || "-"}
                      </TableCell>
                      <TableCell>
                        {invoice.client?.profiles?.display_name || "-"}
                      </TableCell>
                      <TableCell>{invoice.service?.name || "-"}</TableCell>
                      <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                      <TableCell>
                        {invoice.due_date
                          ? format(new Date(invoice.due_date), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {invoice.status === "draft" && (
                              <DropdownMenuItem onClick={() => handleSendInvoice(invoice)}>
                                <Send className="h-4 w-4 mr-2" />
                                Mark as Sent
                              </DropdownMenuItem>
                            )}
                            {(invoice.status === "draft" || invoice.status === "sent") && (
                              <DropdownMenuItem onClick={() => handleMarkPaid(invoice)}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            {invoice.status !== "void" && invoice.status !== "paid" && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setShowVoidDialog(true);
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Void Invoice
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button variant="outline" onClick={() => setShowTransactionSheet(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </div>
          {transactions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-1">No Transactions</h3>
                <p className="text-sm text-muted-foreground">
                  Transactions will appear here when invoices are paid
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {format(new Date(tx.transaction_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {tx.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{tx.description || "-"}</TableCell>
                      <TableCell className={`text-right font-medium ${
                        tx.transaction_type === "payment" ? "text-green-600" : "text-destructive"
                      }`}>
                        {tx.transaction_type === "payment" ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          {expenses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-1">No Expenses</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Track your business expenses here
                </p>
                <Button onClick={() => setShowExpenseSheet(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        {format(new Date(expense.expense_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {expense.category ? (
                          <Badge variant="outline">{expense.category}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{expense.description || "-"}</TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        -{formatCurrency(expense.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pnl" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Profit & Loss Statement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h4 className="font-medium text-green-600">Revenue</h4>
                <div className="flex justify-between py-2 border-b">
                  <span>Paid Invoices</span>
                  <span className="font-medium">{formatCurrency(metrics.totalRevenue)}</span>
                </div>
                <div className="flex justify-between py-2 font-medium">
                  <span>Total Revenue</span>
                  <span className="text-green-600">{formatCurrency(metrics.totalRevenue)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-destructive">Expenses</h4>
                {EXPENSE_CATEGORIES.map((category) => {
                  const categoryTotal = expenses
                    .filter((e) => e.category === category)
                    .reduce((sum, e) => sum + (e.amount || 0), 0);
                  if (categoryTotal === 0) return null;
                  return (
                    <div key={category} className="flex justify-between py-2 border-b">
                      <span>{category}</span>
                      <span className="font-medium">{formatCurrency(categoryTotal)}</span>
                    </div>
                  );
                })}
                {expenses.filter((e) => !e.category).length > 0 && (
                  <div className="flex justify-between py-2 border-b">
                    <span>Uncategorized</span>
                    <span className="font-medium">
                      {formatCurrency(
                        expenses
                          .filter((e) => !e.category)
                          .reduce((sum, e) => sum + (e.amount || 0), 0)
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2 font-medium">
                  <span>Total Expenses</span>
                  <span className="text-destructive">{formatCurrency(metrics.totalExpenses)}</span>
                </div>
              </div>

              <div className="pt-4 border-t-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Net Profit</span>
                  <span className={metrics.netProfit >= 0 ? "text-green-600" : "text-destructive"}>
                    {formatCurrency(metrics.netProfit)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Invoice Sheet */}
      <Sheet open={showInvoiceSheet} onOpenChange={setShowInvoiceSheet}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Create Invoice</SheetTitle>
            <SheetDescription>
              Create a new invoice for a client
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label htmlFor="invoiceClient">Client</Label>
              <Select value={invoiceClientId} onValueChange={setInvoiceClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {activeClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.profiles?.display_name || "Unnamed Client"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="invoiceService">Service</Label>
              <Select value={invoiceServiceId} onValueChange={setInvoiceServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="invoiceAmount">Amount (£) *</Label>
              <Input
                id="invoiceAmount"
                type="number"
                step="0.01"
                min="0"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="invoiceDescription">Description</Label>
              <Textarea
                id="invoiceDescription"
                value={invoiceDescription}
                onChange={(e) => setInvoiceDescription(e.target.value)}
                placeholder="Invoice description..."
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="invoiceDueDate">Due Date</Label>
              <Input
                id="invoiceDueDate"
                type="date"
                value={invoiceDueDate}
                onChange={(e) => setInvoiceDueDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInvoiceSheet(false);
                  resetInvoiceForm();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateInvoice}
                disabled={!invoiceAmount || saving}
                className="flex-1"
              >
                {saving ? "Creating..." : "Create Invoice"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Expense Sheet */}
      <Sheet open={showExpenseSheet} onOpenChange={setShowExpenseSheet}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Add Expense</SheetTitle>
            <SheetDescription>
              Record a business expense
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label htmlFor="expenseAmount">Amount (£) *</Label>
              <Input
                id="expenseAmount"
                type="number"
                step="0.01"
                min="0"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="expenseCategory">Category</Label>
              <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="expenseDescription">Description</Label>
              <Input
                id="expenseDescription"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                placeholder="What was this expense for?"
              />
            </div>
            <div>
              <Label htmlFor="expenseDate">Date *</Label>
              <Input
                id="expenseDate"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="expenseNotes">Notes</Label>
              <Textarea
                id="expenseNotes"
                value={expenseNotes}
                onChange={(e) => setExpenseNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowExpenseSheet(false);
                  resetExpenseForm();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateExpense}
                disabled={!expenseAmount || !expenseDate || saving}
                className="flex-1"
              >
                {saving ? "Saving..." : "Add Expense"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Transaction Sheet */}
      <Sheet open={showTransactionSheet} onOpenChange={setShowTransactionSheet}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Add Transaction</SheetTitle>
            <SheetDescription>
              Record a manual transaction
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label htmlFor="transactionType">Type</Label>
              <Select value={transactionType} onValueChange={setTransactionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment">Payment (Income)</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="transactionAmount">Amount (£) *</Label>
              <Input
                id="transactionAmount"
                type="number"
                step="0.01"
                min="0"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="transactionDescription">Description</Label>
              <Input
                id="transactionDescription"
                value={transactionDescription}
                onChange={(e) => setTransactionDescription(e.target.value)}
                placeholder="Transaction description"
              />
            </div>
            <div>
              <Label htmlFor="transactionDate">Date *</Label>
              <Input
                id="transactionDate"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTransactionSheet(false);
                  resetTransactionForm();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTransaction}
                disabled={!transactionAmount || !transactionDate || saving}
                className="flex-1"
              >
                {saving ? "Saving..." : "Add Transaction"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Void Invoice Dialog */}
      <AlertDialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to void invoice {selectedInvoice?.invoice_number}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoidInvoice}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Void Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
