import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  User, 
  MessageSquare, 
  Clock, 
  MoreVertical, 
  Badge,
  Mail,
  Phone,
  GripVertical,
  CheckSquare,
  ListTodo
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CRMLead, PipelineStage, CRMTask, CRMCustomField, useCRMCustomFields } from "@/hooks/useCRM";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface CRMPipelineProps {
  contextType: 'gym' | 'coach' | 'event';
  contextId: string;
  stages: PipelineStage[];
  leads: CRMLead[];
  onLeadClick: (lead: CRMLead) => void;
  onMoveToStage: (leadId: string, stageId: string) => Promise<void>;
}

interface CustomFieldValueMap {
  [leadId: string]: {
    [fieldId: string]: string | number | boolean | null;
  };
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
  const [leadTaskCounts, setLeadTaskCounts] = useState<Record<string, number>>({});
  const [customFieldValues, setCustomFieldValues] = useState<CustomFieldValueMap>({});

  // Get custom fields that should show on card
  const { activeFields } = useCRMCustomFields(contextType, contextId);
  const cardFields = activeFields.filter(f => f.show_on_card);

  // Fetch task counts for all leads
  useEffect(() => {
    const fetchTaskCounts = async () => {
      if (leads.length === 0) return;
      
      const leadIds = leads.map(l => l.id);
      const { data, error } = await supabase
        .from("crm_tasks")
        .select("lead_id")
        .in("lead_id", leadIds)
        .eq("status", "open");

      if (!error && data) {
        const counts: Record<string, number> = {};
        data.forEach(task => {
          counts[task.lead_id] = (counts[task.lead_id] || 0) + 1;
        });
        setLeadTaskCounts(counts);
      }
    };

    fetchTaskCounts();
  }, [leads]);

  // Fetch custom field values for all leads if there are card fields
  useEffect(() => {
    const fetchCustomFieldValues = async () => {
      if (leads.length === 0 || cardFields.length === 0) {
        setCustomFieldValues({});
        return;
      }

      const leadIds = leads.map(l => l.id);
      const { data, error } = await supabase
        .from("crm_custom_field_values")
        .select("*")
        .in("lead_id", leadIds);

      if (!error && data) {
        const valueMap: CustomFieldValueMap = {};
        data.forEach(val => {
          if (!valueMap[val.lead_id]) {
            valueMap[val.lead_id] = {};
          }
          // Determine which value to use based on field type
          const field = cardFields.find(f => f.id === val.field_id);
          if (field) {
            switch (field.field_type) {
              case 'text':
              case 'dropdown':
                valueMap[val.lead_id][val.field_id] = val.value_text;
                break;
              case 'number':
                valueMap[val.lead_id][val.field_id] = val.value_number;
                break;
              case 'date':
                valueMap[val.lead_id][val.field_id] = val.value_date;
                break;
              case 'checkbox':
                valueMap[val.lead_id][val.field_id] = val.value_boolean;
                break;
            }
          }
        });
        setCustomFieldValues(valueMap);
      }
    };

    fetchCustomFieldValues();
  }, [leads, cardFields]);

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
                    openTaskCount={leadTaskCounts[lead.id] || 0}
                    customFields={cardFields}
                    customFieldValues={customFieldValues[lead.id] || {}}
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
                  openTaskCount={leadTaskCounts[lead.id] || 0}
                  customFields={cardFields}
                  customFieldValues={customFieldValues[lead.id] || {}}
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
  openTaskCount: number;
  customFields: CRMCustomField[];
  customFieldValues: { [fieldId: string]: string | number | boolean | null };
}

function LeadCard({ 
  lead, 
  onClick, 
  onDragStart, 
  onDragEnd, 
  isDragging, 
  openTaskCount,
  customFields,
  customFieldValues,
}: LeadCardProps) {
  const formatFieldValue = (field: CRMCustomField, value: string | number | boolean | null) => {
    if (value === null || value === undefined) return null;
    
    switch (field.field_type) {
      case 'checkbox':
        return value ? 'Yes' : 'No';
      case 'dropdown':
        const option = field.field_options.find(o => o.value === value);
        return option?.label || value;
      default:
        return String(value);
    }
  };

  return (
    <TooltipProvider>
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
          <div className="flex items-center gap-1">
            {openTaskCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-0.5 text-orange-500">
                    <ListTodo className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{openTaskCount}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{openTaskCount} open task{openTaskCount !== 1 ? 's' : ''}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {lead.unread_count && lead.unread_count > 0 && (
              <UIBadge variant="destructive" className="text-xs px-1.5">
                {lead.unread_count}
              </UIBadge>
            )}
          </div>
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

        {/* Custom Fields */}
        {customFields.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
            {customFields.map((field) => {
              const value = customFieldValues[field.id];
              const displayValue = formatFieldValue(field, value);
              if (!displayValue) return null;
              
              return (
                <div key={field.id} className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">{field.field_name}:</span>
                  <span className="truncate">{displayValue}</span>
                </div>
              );
            })}
          </div>
        )}

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
    </TooltipProvider>
  );
}