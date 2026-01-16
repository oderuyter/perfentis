import { useState } from "react";
import { Save, Plus, Trash2, GripVertical, Settings, FileText, X, Edit2, ToggleLeft, Eye, EyeOff } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  useCRMSettings, 
  usePipelineStages, 
  useCRMTaskTemplates,
  useCRMCustomFields,
  CRMContextType, 
  PipelineStage,
  CRMTaskTemplate,
  CRMCustomField
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
  const { templates, createTemplate, updateTemplate, deleteTemplate, isLoading: templatesLoading } = useCRMTaskTemplates(contextType, contextId);
  const { 
    fields, 
    activeFields, 
    createField, 
    updateField, 
    disableField, 
    isLoading: fieldsLoading 
  } = useCRMCustomFields(contextType, contextId);
  
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

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteTemplate(templateId);
      toast.success("Template deleted");
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  const handleToggleFieldActive = async (field: CRMCustomField) => {
    try {
      await updateField(field.id, { is_active: !field.is_active });
      toast.success(field.is_active ? "Field disabled" : "Field enabled");
    } catch (error) {
      toast.error("Failed to update field");
    }
  };

  const handleToggleFieldShowOnCard = async (field: CRMCustomField) => {
    try {
      await updateField(field.id, { show_on_card: !field.show_on_card });
      toast.success("Field updated");
    } catch (error) {
      toast.error("Failed to update field");
    }
  };

  const handleToggleFieldShowOnOverview = async (field: CRMCustomField) => {
    try {
      await updateField(field.id, { show_on_overview: !field.show_on_overview });
      toast.success("Field updated");
    } catch (error) {
      toast.error("Failed to update field");
    }
  };

  if (settingsLoading || stagesLoading || templatesLoading || fieldsLoading) {
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

      {/* Custom Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5" />
            Custom Fields
          </CardTitle>
          <CardDescription>
            Define custom fields to capture additional lead information. Fields marked with "Show on Card" will appear on pipeline cards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fields list */}
          <div className="space-y-2">
            {fields.map((field) => (
              <div
                key={field.id}
                className={cn(
                  "flex items-center gap-3 p-3 border rounded-lg bg-card",
                  !field.is_active && "opacity-60 bg-muted/50"
                )}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{field.field_name}</span>
                    <Badge variant="outline" className="text-xs capitalize">{field.field_type}</Badge>
                    {!field.is_active && <Badge variant="secondary" className="text-xs">Disabled</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {field.show_on_card && (
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> On Card
                      </span>
                    )}
                    {field.show_on_overview && (
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> On Overview
                      </span>
                    )}
                    {field.is_required && <span>Required</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("text-xs", field.show_on_card && "text-primary")}
                    onClick={() => handleToggleFieldShowOnCard(field)}
                    title="Show on pipeline card"
                  >
                    Card
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("text-xs", field.show_on_overview && "text-primary")}
                    onClick={() => handleToggleFieldShowOnOverview(field)}
                    title="Show on overview tab"
                  >
                    Overview
                  </Button>
                  <EditFieldDialog field={field} onUpdate={updateField} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8",
                      field.is_active ? "text-muted-foreground hover:text-destructive" : "text-green-600 hover:text-green-700"
                    )}
                    onClick={() => handleToggleFieldActive(field)}
                    title={field.is_active ? "Disable field" : "Enable field"}
                  >
                    {field.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ))}

            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No custom fields yet. Create one to capture additional lead data.
              </p>
            )}
          </div>

          {/* Add new field */}
          <CreateFieldDialog onCreate={createField} />
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

      {/* Task Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Task Templates
          </CardTitle>
          <CardDescription>
            Create reusable task templates that can be applied to leads. Each template contains a set of tasks that will be created when applied.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Templates list */}
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-card"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <span className="font-medium">{template.name}</span>
                  <p className="text-sm text-muted-foreground">
                    {template.tasks.length} task{template.tasks.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <EditTemplateDialog 
                  template={template} 
                  onUpdate={updateTemplate} 
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteTemplate(template.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No task templates yet. Create one to speed up your workflow.
              </p>
            )}
          </div>

          {/* Add new template */}
          <CreateTemplateDialog onCreate={createTemplate} />
        </CardContent>
      </Card>
    </div>
  );
}

// Create Field Dialog
function CreateFieldDialog({ 
  onCreate 
}: { 
  onCreate: (data: {
    field_name: string;
    field_type: CRMCustomField['field_type'];
    field_options?: Array<{ label: string; value: string }>;
    show_on_card?: boolean;
    show_on_overview?: boolean;
    is_required?: boolean;
  }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState<CRMCustomField['field_type']>('text');
  const [options, setOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [showOnCard, setShowOnCard] = useState(false);
  const [showOnOverview, setShowOnOverview] = useState(true);
  const [isRequired, setIsRequired] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const addOption = () => {
    setOptions([...options, { label: "", value: "" }]);
  };

  const updateOption = (index: number, key: 'label' | 'value', value: string) => {
    setOptions(options.map((opt, i) => i === index ? { ...opt, [key]: value } : opt));
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    
    if (fieldType === 'dropdown' && options.filter(o => o.label.trim() && o.value.trim()).length === 0) {
      toast.error("Add at least one option for dropdown fields");
      return;
    }

    setIsCreating(true);
    try {
      await onCreate({
        field_name: name.trim(),
        field_type: fieldType,
        field_options: fieldType === 'dropdown' ? options.filter(o => o.label.trim() && o.value.trim()) : undefined,
        show_on_card: showOnCard,
        show_on_overview: showOnOverview,
        is_required: isRequired,
      });
      setOpen(false);
      setName("");
      setFieldType('text');
      setOptions([]);
      setShowOnCard(false);
      setShowOnOverview(true);
      setIsRequired(false);
      toast.success("Field created");
    } catch (error) {
      toast.error("Failed to create field");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-1" />
          Add Custom Field
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Field</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Field Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Membership Interest"
            />
          </div>

          <div className="space-y-2">
            <Label>Field Type</Label>
            <Select value={fieldType} onValueChange={(v) => setFieldType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="dropdown">Dropdown</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="checkbox">Checkbox</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {fieldType === 'dropdown' && (
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="space-y-2">
                {options.map((opt, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={opt.label}
                      onChange={(e) => updateOption(index, 'label', e.target.value)}
                      placeholder="Label"
                      className="flex-1"
                    />
                    <Input
                      value={opt.value}
                      onChange={(e) => updateOption(index, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-muted-foreground hover:text-destructive"
                      onClick={() => removeOption(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addOption}>
                <Plus className="h-4 w-4 mr-1" />
                Add Option
              </Button>
            </div>
          )}

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>Show on Pipeline Card</Label>
                <p className="text-xs text-muted-foreground">Display this field on lead cards in the pipeline view</p>
              </div>
              <Switch checked={showOnCard} onCheckedChange={setShowOnCard} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Show on Overview</Label>
                <p className="text-xs text-muted-foreground">Display this field in the lead detail overview</p>
              </div>
              <Switch checked={showOnOverview} onCheckedChange={setShowOnOverview} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Required</Label>
                <p className="text-xs text-muted-foreground">Make this field mandatory</p>
              </div>
              <Switch checked={isRequired} onCheckedChange={setIsRequired} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
            Create Field
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Edit Field Dialog
function EditFieldDialog({ 
  field,
  onUpdate 
}: { 
  field: CRMCustomField;
  onUpdate: (fieldId: string, updates: Partial<CRMCustomField>) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(field.field_name);
  const [options, setOptions] = useState<Array<{ label: string; value: string }>>(field.field_options || []);
  const [isSaving, setIsSaving] = useState(false);

  const addOption = () => {
    setOptions([...options, { label: "", value: "" }]);
  };

  const updateOption = (index: number, key: 'label' | 'value', value: string) => {
    setOptions(options.map((opt, i) => i === index ? { ...opt, [key]: value } : opt));
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setIsSaving(true);
    try {
      await onUpdate(field.id, {
        field_name: name.trim(),
        field_options: field.field_type === 'dropdown' ? options.filter(o => o.label.trim() && o.value.trim()) : field.field_options,
      });
      setOpen(false);
      toast.success("Field updated");
    } catch (error) {
      toast.error("Failed to update field");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Custom Field</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Field Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Membership Interest"
            />
          </div>

          <div className="space-y-2">
            <Label>Field Type</Label>
            <Input value={field.field_type} disabled className="capitalize" />
            <p className="text-xs text-muted-foreground">Field type cannot be changed after creation</p>
          </div>

          {field.field_type === 'dropdown' && (
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="space-y-2">
                {options.map((opt, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={opt.label}
                      onChange={(e) => updateOption(index, 'label', e.target.value)}
                      placeholder="Label"
                      className="flex-1"
                    />
                    <Input
                      value={opt.value}
                      onChange={(e) => updateOption(index, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-muted-foreground hover:text-destructive"
                      onClick={() => removeOption(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addOption}>
                <Plus className="h-4 w-4 mr-1" />
                Add Option
              </Button>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Create Template Dialog
function CreateTemplateDialog({ 
  onCreate 
}: { 
  onCreate: (name: string, tasks: CRMTaskTemplate['tasks']) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tasks, setTasks] = useState<CRMTaskTemplate['tasks']>([]);
  const [isCreating, setIsCreating] = useState(false);

  const addTask = () => {
    setTasks([...tasks, { title: "", task_type: "follow-up" }]);
  };

  const updateTask = (index: number, updates: Partial<CRMTaskTemplate['tasks'][0]>) => {
    setTasks(tasks.map((t, i) => i === index ? { ...t, ...updates } : t));
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!name.trim() || tasks.length === 0) return;
    
    const validTasks = tasks.filter(t => t.title.trim());
    if (validTasks.length === 0) {
      toast.error("Add at least one task with a title");
      return;
    }

    setIsCreating(true);
    try {
      await onCreate(name.trim(), validTasks);
      setOpen(false);
      setName("");
      setTasks([]);
      toast.success("Template created");
    } catch (error) {
      toast.error("Failed to create template");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-1" />
          Create Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Task Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Template Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., New Member Onboarding"
            />
          </div>

          <div className="space-y-2">
            <Label>Tasks</Label>
            <div className="space-y-2">
              {tasks.map((task, index) => (
                <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={task.title}
                      onChange={(e) => updateTask(index, { title: e.target.value })}
                      placeholder="Task title"
                    />
                    <div className="flex gap-2">
                      <Select 
                        value={task.task_type} 
                        onValueChange={(v) => updateTask(index, { task_type: v as any })}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="follow-up">Follow-up</SelectItem>
                          <SelectItem value="call">Call</SelectItem>
                          <SelectItem value="message">Message</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={task.due_days_offset || ""}
                        onChange={(e) => updateTask(index, { 
                          due_days_offset: e.target.value ? parseInt(e.target.value) : undefined 
                        })}
                        placeholder="Days offset"
                        className="w-[120px]"
                      />
                    </div>
                    <Input
                      value={task.description || ""}
                      onChange={(e) => updateTask(index, { description: e.target.value })}
                      placeholder="Description (optional)"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeTask(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addTask}>
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim() || tasks.length === 0}>
            Create Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Edit Template Dialog
function EditTemplateDialog({ 
  template,
  onUpdate 
}: { 
  template: CRMTaskTemplate;
  onUpdate: (templateId: string, updates: { name?: string; tasks?: CRMTaskTemplate['tasks'] }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(template.name);
  const [tasks, setTasks] = useState<CRMTaskTemplate['tasks']>(template.tasks);
  const [isSaving, setIsSaving] = useState(false);

  const addTask = () => {
    setTasks([...tasks, { title: "", task_type: "follow-up" }]);
  };

  const updateTask = (index: number, updates: Partial<CRMTaskTemplate['tasks'][0]>) => {
    setTasks(tasks.map((t, i) => i === index ? { ...t, ...updates } : t));
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim() || tasks.length === 0) return;
    
    const validTasks = tasks.filter(t => t.title.trim());
    if (validTasks.length === 0) {
      toast.error("Add at least one task with a title");
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(template.id, { name: name.trim(), tasks: validTasks });
      setOpen(false);
      toast.success("Template updated");
    } catch (error) {
      toast.error("Failed to update template");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Template Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., New Member Onboarding"
            />
          </div>

          <div className="space-y-2">
            <Label>Tasks</Label>
            <div className="space-y-2">
              {tasks.map((task, index) => (
                <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={task.title}
                      onChange={(e) => updateTask(index, { title: e.target.value })}
                      placeholder="Task title"
                    />
                    <div className="flex gap-2">
                      <Select 
                        value={task.task_type} 
                        onValueChange={(v) => updateTask(index, { task_type: v as any })}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="follow-up">Follow-up</SelectItem>
                          <SelectItem value="call">Call</SelectItem>
                          <SelectItem value="message">Message</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={task.due_days_offset || ""}
                        onChange={(e) => updateTask(index, { 
                          due_days_offset: e.target.value ? parseInt(e.target.value) : undefined 
                        })}
                        placeholder="Days offset"
                        className="w-[120px]"
                      />
                    </div>
                    <Input
                      value={task.description || ""}
                      onChange={(e) => updateTask(index, { description: e.target.value })}
                      placeholder="Description (optional)"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeTask(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addTask}>
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim() || tasks.length === 0}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}