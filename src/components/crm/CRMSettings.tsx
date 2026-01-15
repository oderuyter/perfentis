import { useState } from "react";
import { Save, Plus, Trash2, GripVertical, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  useCRMSettings, 
  usePipelineStages, 
  CRMContextType, 
  PipelineStage 
} from "@/hooks/useCRM";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CRMSettingsProps {
  contextType: CRMContextType;
  contextId: string;
  staffMembers?: Array<{ user_id: string; display_name: string | null }>;
}

export function CRMSettings({ contextType, contextId, staffMembers = [] }: CRMSettingsProps) {
  const { settings, updateSettings, isLoading: settingsLoading } = useCRMSettings(contextType, contextId);
  const { stages, createStage, updateStage, deleteStage, isLoading: stagesLoading } = usePipelineStages(contextType, contextId);
  
  const [newStageName, setNewStageName] = useState("");
  const [isAddingStage, setIsAddingStage] = useState(false);

  const handleToggleAutoCreate = async () => {
    if (!settings) return;
    
    try {
      await updateSettings({ 
        auto_create_leads_from_messages: !settings.auto_create_leads_from_messages 
      });
      toast.success("Settings updated");
    } catch (error) {
      toast.error("Failed to update settings");
    }
  };

  const handleDefaultAssigneeChange = async (userId: string) => {
    try {
      await updateSettings({ 
        default_assignee_user_id: userId === "none" ? null : userId 
      });
      toast.success("Default assignee updated");
    } catch (error) {
      toast.error("Failed to update settings");
    }
  };

  const handleAddStage = async () => {
    if (!newStageName.trim()) return;
    
    setIsAddingStage(true);
    try {
      await createStage(newStageName.trim());
      setNewStageName("");
      toast.success("Stage added");
    } catch (error) {
      toast.error("Failed to add stage");
    } finally {
      setIsAddingStage(false);
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    try {
      await deleteStage(stageId);
      toast.success("Stage deleted");
    } catch (error) {
      toast.error("Failed to delete stage. Make sure no leads are in this stage.");
    }
  };

  const handleToggleStageType = async (stage: PipelineStage, type: 'is_won' | 'is_lost' | 'is_default') => {
    try {
      // If setting as default, first unset other defaults
      if (type === 'is_default' && !stage.is_default) {
        const currentDefault = stages.find(s => s.is_default);
        if (currentDefault) {
          await updateStage(currentDefault.id, { is_default: false });
        }
      }
      
      await updateStage(stage.id, { [type]: !stage[type] });
      toast.success("Stage updated");
    } catch (error) {
      toast.error("Failed to update stage");
    }
  };

  if (settingsLoading || stagesLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="h-32 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription>
            Configure how the CRM behaves for this {contextType}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-create leads from messages</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create a lead when someone messages you through the platform.
              </p>
            </div>
            <Switch
              checked={settings?.auto_create_leads_from_messages ?? true}
              onCheckedChange={handleToggleAutoCreate}
            />
          </div>

          {staffMembers.length > 0 && (
            <div className="space-y-2">
              <Label>Default Assignee</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Automatically assign new leads to a staff member.
              </p>
              <Select
                value={settings?.default_assignee_user_id || "none"}
                onValueChange={handleDefaultAssigneeChange}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="No default assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No default assignee</SelectItem>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff.user_id} value={staff.user_id}>
                      {staff.display_name || 'Staff Member'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pipeline Stages */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Stages</CardTitle>
          <CardDescription>
            Customize the stages in your sales pipeline. Drag to reorder.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stages list */}
          <div className="space-y-2">
            {stages.map((stage, index) => (
              <div
                key={stage.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-card"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <span className="flex-1 font-medium">{stage.stage_name}</span>
                
                <div className="flex items-center gap-2">
                  {stage.is_default && (
                    <Badge variant="secondary" className="text-xs">Default</Badge>
                  )}
                  {stage.is_won && (
                    <Badge className="bg-green-500 text-xs">Won</Badge>
                  )}
                  {stage.is_lost && (
                    <Badge variant="destructive" className="text-xs">Lost</Badge>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "text-xs",
                      stage.is_default && "text-primary"
                    )}
                    onClick={() => handleToggleStageType(stage, 'is_default')}
                  >
                    Default
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "text-xs",
                      stage.is_won && "text-green-600"
                    )}
                    onClick={() => handleToggleStageType(stage, 'is_won')}
                  >
                    Won
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "text-xs",
                      stage.is_lost && "text-red-600"
                    )}
                    onClick={() => handleToggleStageType(stage, 'is_lost')}
                  >
                    Lost
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteStage(stage.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Add new stage */}
          <div className="flex gap-2 pt-2">
            <Input
              placeholder="New stage name..."
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
            />
            <Button 
              onClick={handleAddStage}
              disabled={isAddingStage || !newStageName.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Stage
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
