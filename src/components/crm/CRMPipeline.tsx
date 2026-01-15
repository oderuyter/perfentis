import { useState } from "react";
import { motion } from "framer-motion";
import { 
  User, 
  MessageSquare, 
  Clock, 
  MoreVertical, 
  Badge,
  Mail,
  Phone,
  GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CRMLead, PipelineStage, useCRMLeads } from "@/hooks/useCRM";
import { formatDistanceToNow } from "date-fns";

interface CRMPipelineProps {
  contextType: 'gym' | 'coach' | 'event';
  contextId: string;
  stages: PipelineStage[];
  leads: CRMLead[];
  onLeadClick: (lead: CRMLead) => void;
  onMoveToStage: (leadId: string, stageId: string) => Promise<void>;
}

export function CRMPipeline({
  contextType,
  contextId,
  stages,
  leads,
  onLeadClick,
  onMoveToStage,
}: CRMPipelineProps) {
  const [draggingLead, setDraggingLead] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const getLeadsForStage = (stageId: string) => {
    return leads.filter(lead => lead.stage_id === stageId);
  };

  const getUnstagedLeads = () => {
    return leads.filter(lead => !lead.stage_id);
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggingLead(leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (draggingLead) {
      await onMoveToStage(draggingLead, stageId);
    }
    setDraggingLead(null);
    setDragOverStage(null);
  };

  const handleDragEnd = () => {
    setDraggingLead(null);
    setDragOverStage(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
      {stages.map((stage) => {
        const stageLeads = getLeadsForStage(stage.id);
        const isOver = dragOverStage === stage.id;

        return (
          <div
            key={stage.id}
            className="flex-shrink-0 w-72"
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <div
              className={cn(
                "rounded-lg border bg-muted/30 transition-colors",
                isOver && "border-primary bg-primary/5"
              )}
            >
              {/* Stage Header */}
              <div className="p-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm">{stage.stage_name}</h3>
                    <UIBadge variant="secondary" className="text-xs">
                      {stageLeads.length}
                    </UIBadge>
                  </div>
                  {stage.is_won && (
                    <UIBadge variant="default" className="bg-green-500 text-xs">Won</UIBadge>
                  )}
                  {stage.is_lost && (
                    <UIBadge variant="destructive" className="text-xs">Lost</UIBadge>
                  )}
                </div>
              </div>

              {/* Lead Cards */}
              <div className="p-2 space-y-2 min-h-[200px]">
                {stageLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onClick={() => onLeadClick(lead)}
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onDragEnd={handleDragEnd}
                    isDragging={draggingLead === lead.id}
                  />
                ))}
                {stageLeads.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No leads
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Unstaged leads column */}
      {getUnstagedLeads().length > 0 && (
        <div className="flex-shrink-0 w-72">
          <div className="rounded-lg border border-dashed bg-muted/10">
            <div className="p-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm text-muted-foreground">Unassigned Stage</h3>
                <UIBadge variant="outline" className="text-xs">
                  {getUnstagedLeads().length}
                </UIBadge>
              </div>
            </div>
            <div className="p-2 space-y-2">
              {getUnstagedLeads().map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onClick={() => onLeadClick(lead)}
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  onDragEnd={handleDragEnd}
                  isDragging={draggingLead === lead.id}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface LeadCardProps {
  lead: CRMLead;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

function LeadCard({ lead, onClick, onDragStart, onDragEnd, isDragging }: LeadCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "p-3 bg-card rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-all",
        isDragging && "opacity-50 rotate-2"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-grab" />
          <span className="font-medium text-sm truncate">{lead.lead_name}</span>
        </div>
        {lead.unread_count && lead.unread_count > 0 && (
          <UIBadge variant="destructive" className="text-xs px-1.5">
            {lead.unread_count}
          </UIBadge>
        )}
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        {lead.email && (
          <div className="flex items-center gap-1.5 truncate">
            <Mail className="h-3 w-3" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="h-3 w-3" />
            <span>{lead.phone}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          <UIBadge variant="outline" className="text-xs capitalize">
            {lead.source}
          </UIBadge>
          {lead.is_registered_user && (
            <span title="Registered user">
              <User className="h-3 w-3 text-primary" />
            </span>
          )}
          {lead.is_incomplete && (
            <UIBadge variant="destructive" className="text-xs">Incomplete</UIBadge>
          )}
        </div>
        {lead.last_contacted_at && (
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true })}
          </span>
        )}
      </div>

      {lead.assignee && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>{lead.assignee.display_name || 'Assigned'}</span>
        </div>
      )}
    </div>
  );
}
