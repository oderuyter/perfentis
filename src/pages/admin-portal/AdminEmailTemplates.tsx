import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Mail, Search, MoreVertical, Edit, Copy, Archive, History,
  Send, Loader2, RefreshCw, FileText,
} from "lucide-react";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const categoryColors: Record<string, string> = {
  invites: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  notifications: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  system: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
};

export default function AdminEmailTemplates() {
  const navigate = useNavigate();
  const { templates, isLoading, refetch, updateTemplate, duplicateTemplate } = useEmailTemplates();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filtered = templates.filter((t) => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.template_key.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || t.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const handleTestSend = async (templateKey: string) => {
    const email = prompt("Enter recipient email for test send:");
    if (!email) return;
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: { to: email, template: templateKey, data: { subject: `[TEST] ${templateKey}`, body: "This is a test email.", appUrl: window.location.origin } },
      });
      if (error) throw error;
      if (data?.success) toast.success("Test email sent!");
      else toast.error(data?.error || "Failed to send");
    } catch (err: any) {
      toast.error(err.message || "Send failed");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Templates</h1>
          <p className="text-muted-foreground">Manage all platform email templates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/admin-portal/email-diagnostics")}>
            <FileText className="h-4 w-4 mr-2" />
            Email Logs
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="invites">Invites</SelectItem>
                <SelectItem value="notifications">Notifications</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => navigate(`/admin-portal/email-templates/${t.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{t.template_key}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={categoryColors[t.category] || ""}>
                      {t.category}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={t.is_enabled}
                      disabled={t.is_critical}
                      onCheckedChange={(checked) => updateTemplate.mutate({ id: t.id, is_enabled: checked })}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(t.updated_at), "PP")}
                    </span>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/admin-portal/email-templates/${t.id}`)}>
                          <Edit className="h-4 w-4 mr-2" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateTemplate.mutate(t)}>
                          <Copy className="h-4 w-4 mr-2" />Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTestSend(t.template_key)}>
                          <Send className="h-4 w-4 mr-2" />Send Test
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No templates found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
