import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  GripVertical,
  PoundSterling
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useMembershipLevels, MembershipLevel } from "@/hooks/useGymInvitations";
import { cn } from "@/lib/utils";

interface ContextType {
  selectedGymId: string | null;
}

const BILLING_CYCLES = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "one-time", label: "One-time" },
];

export default function GymMembershipLevels() {
  const { selectedGymId } = useOutletContext<ContextType>();
  const { levels, isLoading, createLevel, updateLevel, deleteLevel } = useMembershipLevels(selectedGymId);

  const [showForm, setShowForm] = useState(false);
  const [editingLevel, setEditingLevel] = useState<MembershipLevel | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MembershipLevel | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    signup_fee: "",
    billing_cycle: "monthly",
    access_notes: ""
  });

  const openCreate = () => {
    setEditingLevel(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      signup_fee: "",
      billing_cycle: "monthly",
      access_notes: ""
    });
    setShowForm(true);
  };

  const openEdit = (level: MembershipLevel) => {
    setEditingLevel(level);
    setFormData({
      name: level.name,
      description: level.description || "",
      price: level.price?.toString() || "",
      signup_fee: (level as any).signup_fee?.toString() || "",
      billing_cycle: level.billing_cycle || "monthly",
      access_notes: level.access_notes || ""
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setIsSaving(true);
    try {
      if (editingLevel) {
        await updateLevel(editingLevel.id, {
          name: formData.name,
          description: formData.description || null,
          price: formData.price ? parseFloat(formData.price) : null,
          billing_cycle: formData.billing_cycle,
          access_notes: formData.access_notes || null
        });
      } else {
        await createLevel({
          name: formData.name,
          description: formData.description || undefined,
          price: formData.price ? parseFloat(formData.price) : undefined,
          billing_cycle: formData.billing_cycle,
          access_notes: formData.access_notes || undefined
        });
      }
      setShowForm(false);
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (level: MembershipLevel) => {
    await updateLevel(level.id, { is_active: !level.is_active });
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteLevel(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  if (!selectedGymId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a gym.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Membership Levels</h2>
          <p className="text-muted-foreground">Configure membership tiers for your gym</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Level
        </button>
      </div>

      {/* Levels List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : levels.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <PoundSterling className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Membership Levels</h3>
          <p className="text-muted-foreground mb-4">
            Create membership levels to assign to members during signup or invitation.
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
          >
            <Plus className="h-4 w-4" />
            Create First Level
          </button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {levels.map((level) => (
              <motion.div
                key={level.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  "p-4 flex items-center gap-4 transition-colors",
                  !level.is_active && "bg-muted/30"
                )}
              >
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{level.name}</h3>
                    {!level.is_active && (
                      <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  {level.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">{level.description}</p>
                  )}
                </div>

                <div className="text-right hidden sm:block">
                  {level.price ? (
                    <div>
                      <span className="font-semibold">£{level.price}</span>
                      <span className="text-sm text-muted-foreground">/{level.billing_cycle}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">No price set</span>
                  )}
                  {(level as any).signup_fee && (
                    <p className="text-xs text-muted-foreground">+ £{(level as any).signup_fee} signup fee</p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(level)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title={level.is_active ? "Deactivate" : "Activate"}
                  >
                    {level.is_active ? (
                      <ToggleRight className="h-5 w-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(level)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(level)}
                    className="p-2 hover:bg-destructive/10 rounded-lg transition-colors text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLevel ? "Edit Membership Level" : "Create Membership Level"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Basic, Premium, VIP"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What's included in this membership level?"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Monthly Fee (£)</Label>
                <div className="relative">
                  <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup_fee">Signup Fee (£)</Label>
                <div className="relative">
                  <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup_fee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.signup_fee}
                    onChange={(e) => setFormData({ ...formData, signup_fee: e.target.value })}
                    placeholder="0.00"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing_cycle">Billing Cycle</Label>
              <Select 
                value={formData.billing_cycle} 
                onValueChange={(v) => setFormData({ ...formData, billing_cycle: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_CYCLES.map((cycle) => (
                    <SelectItem key={cycle.value} value={cycle.value}>
                      {cycle.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="access_notes">Access Notes</Label>
              <Textarea
                id="access_notes"
                value={formData.access_notes}
                onChange={(e) => setFormData({ ...formData, access_notes: e.target.value })}
                placeholder="e.g., 24/7 access, classes included, etc."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!formData.name || isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingLevel ? "Save Changes" : "Create Level"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Membership Level?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This will remove the level from all existing members. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
