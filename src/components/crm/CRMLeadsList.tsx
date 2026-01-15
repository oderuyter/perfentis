import { useState, useMemo } from "react";
import { 
  Search, 
  Filter, 
  User, 
  Mail, 
  Phone, 
  UserCheck, 
  X,
  MoreVertical,
  ArrowUpDown
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CRMLead, PipelineStage } from "@/hooks/useCRM";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

interface CRMLeadsListProps {
  leads: CRMLead[];
  stages: PipelineStage[];
  onLeadClick: (lead: CRMLead) => void;
  onAssign: (leadId: string, userId: string | null) => Promise<void>;
  onMoveToStage: (leadId: string, stageId: string) => Promise<void>;
  onConvert: (leadId: string, status: 'won' | 'lost') => Promise<void>;
  staffMembers?: Array<{ user_id: string; display_name: string | null }>;
}

export function CRMLeadsList({
  leads,
  stages,
  onLeadClick,
  onAssign,
  onMoveToStage,
  onConvert,
  staffMembers = [],
}: CRMLeadsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [registeredFilter, setRegisteredFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'name'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredLeads = useMemo(() => {
    let result = [...leads];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(lead =>
        lead.lead_name.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.phone?.includes(query)
      );
    }

    // Stage filter
    if (stageFilter !== "all") {
      result = result.filter(lead => lead.stage_id === stageFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(lead => lead.status === statusFilter);
    }

    // Source filter
    if (sourceFilter !== "all") {
      result = result.filter(lead => lead.source === sourceFilter);
    }

    // Registered user filter
    if (registeredFilter !== "all") {
      result = result.filter(lead => 
        registeredFilter === "registered" 
          ? lead.is_registered_user 
          : !lead.is_registered_user
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.lead_name.localeCompare(b.lead_name);
          break;
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'updated':
        default:
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [leads, searchQuery, stageFilter, statusFilter, sourceFilter, registeredFilter, sortBy, sortOrder]);

  const toggleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const hasFilters = stageFilter !== "all" || statusFilter !== "all" || 
    sourceFilter !== "all" || registeredFilter !== "all";

  const clearFilters = () => {
    setStageFilter("all");
    setStatusFilter("all");
    setSourceFilter("all");
    setRegisteredFilter("all");
    setSearchQuery("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'won':
        return <Badge className="bg-green-500">Won</Badge>;
      case 'lost':
        return <Badge variant="destructive">Lost</Badge>;
      case 'archived':
        return <Badge variant="secondary">Archived</Badge>;
      default:
        return <Badge variant="outline">Open</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {stages.map((stage) => (
              <SelectItem key={stage.id} value={stage.id}>
                {stage.stage_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="messaging">Messaging</SelectItem>
            <SelectItem value="form">Form</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
          </SelectContent>
        </Select>

        <Select value={registeredFilter} onValueChange={setRegisteredFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="User Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="registered">Registered</SelectItem>
            <SelectItem value="unregistered">Non-Registered</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredLeads.length} of {leads.length} leads
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => toggleSort('name')}
                  className="-ml-3"
                >
                  Name
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => toggleSort('updated')}
                  className="-ml-3"
                >
                  Last Contact
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.map((lead) => (
              <TableRow 
                key={lead.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onLeadClick(lead)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{lead.lead_name}</span>
                    {lead.is_registered_user && (
                      <span title="Registered user">
                        <UserCheck className="h-4 w-4 text-primary" />
                      </span>
                    )}
                    {lead.is_incomplete && (
                      <Badge variant="destructive" className="text-xs">Incomplete</Badge>
                    )}
                    {lead.unread_count && lead.unread_count > 0 && (
                      <Badge variant="destructive" className="text-xs">{lead.unread_count}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    {lead.email && (
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-[150px]">{lead.email}</span>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {lead.stage ? (
                    <Badge variant="outline">{lead.stage.stage_name}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(lead.status)}</TableCell>
                <TableCell>
                  {lead.assignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {lead.assignee.display_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{lead.assignee.display_name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize text-xs">
                    {lead.source}
                  </Badge>
                </TableCell>
                <TableCell>
                  {lead.last_contacted_at ? (
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">Never</span>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onLeadClick(lead)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {stages.map((stage) => (
                        <DropdownMenuItem
                          key={stage.id}
                          onClick={() => onMoveToStage(lead.id, stage.id)}
                          disabled={lead.stage_id === stage.id}
                        >
                          Move to {stage.stage_name}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      {lead.status === 'open' && (
                        <>
                          <DropdownMenuItem onClick={() => onConvert(lead.id, 'won')}>
                            Mark as Won
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onConvert(lead.id, 'lost')}>
                            Mark as Lost
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filteredLeads.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {leads.length === 0 ? "No leads yet" : "No leads match your filters"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
