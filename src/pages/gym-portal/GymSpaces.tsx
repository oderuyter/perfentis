import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Users,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ContextType {
  selectedGymId: string | null;
}

interface GymSpace {
  id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  is_active: boolean;
  display_order: number;
}

export default function GymSpaces() {
  const { selectedGymId } = useOutletContext<ContextType>();
  const [spaces, setSpaces] = useState<GymSpace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSpace, setEditingSpace] = useState<GymSpace | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<GymSpace | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    capacity: ""
  });

  useEffect(() => {
    if (selectedGymId) {
      fetchSpaces();
    }
  }, [selectedGymId]);

  const fetchSpaces = async () => {
    if (!selectedGymId) return;
    setIsLoading(true);

    try {
      const { data, error } = await (supabase as any)
        .from("gym_spaces")
        .select("*")
        .eq("gym_id", selectedGymId)
        .order("display_order");

      if (error) throw error;
      setSpaces((data || []) as GymSpace[]);
    } catch (error) {
      console.error("Error fetching spaces:", error);
      toast.error("Failed to load spaces");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setEditingSpace(null);
    setFormData({ name: "", description: "", capacity: "" });
    setShowForm(true);
  };

  const openEdit = (space: GymSpace) => {
    setEditingSpace(space);
    setFormData({
      name: space.name,
      description: space.description || "",
      capacity: space.capacity?.toString() || ""
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGymId || !formData.name) return;

    setIsSaving(true);
    try {
      if (editingSpace) {
        const { error } = await (supabase as any)
          .from("gym_spaces")
          .update({
            name: formData.name,
            description: formData.description || null,
            capacity: formData.capacity ? parseInt(formData.capacity) : null
          })
          .eq("id", editingSpace.id);

        if (error) throw error;
        toast.success("Space updated");
      } else {
        const { error } = await (supabase as any)
          .from("gym_spaces")
          .insert({
            gym_id: selectedGymId,
            name: formData.name,
            description: formData.description || null,
            capacity: formData.capacity ? parseInt(formData.capacity) : null,
            display_order: spaces.length
          });

        if (error) throw error;
        toast.success("Space created");
      }
      setShowForm(false);
      fetchSpaces();
    } catch (error) {
      console.error("Error saving space:", error);
      toast.error("Failed to save space");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (space: GymSpace) => {
    try {
      const { error } = await (supabase as any)
        .from("gym_spaces")
        .update({ is_active: !space.is_active })
        .eq("id", space.id);

      if (error) throw error;
      toast.success(space.is_active ? "Space deactivated" : "Space activated");
      fetchSpaces();
    } catch (error) {
      toast.error("Failed to update space");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const { error } = await (supabase as any)
        .from("gym_spaces")
        .delete()
        .eq("id", deleteConfirm.id);

      if (error) throw error;
      toast.success("Space deleted");
      setDeleteConfirm(null);
      fetchSpaces();
    } catch (error) {
      toast.error("Failed to delete space");
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Gym Spaces</h2>
          <p className="text-muted-foreground">Manage rooms and areas for classes and events</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Space
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : spaces.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Spaces Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create spaces to assign classes and manage bookings by location.
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
          >
            <Plus className="h-4 w-4" />
            Create First Space
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces.map((space) => (
            <div
              key={space.id}
              className={`bg-card rounded-xl border border-border p-4 ${!space.is_active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{space.name}</h3>
                    {!space.is_active && (
                      <span className="text-xs text-muted-foreground">Inactive</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(space)}
                    className="p-1.5 hover:bg-muted rounded-lg"
                    title={space.is_active ? "Deactivate" : "Activate"}
                  >
                    {space.is_active ? (
                      <ToggleRight className="h-5 w-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(space)}
                    className="p-1.5 hover:bg-muted rounded-lg"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(space)}
                    className="p-1.5 hover:bg-destructive/10 rounded-lg text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {space.description && (
                <p className="text-sm text-muted-foreground mb-3">{space.description}</p>
              )}
              
              {space.capacity && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Capacity: {space.capacity}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSpace ? "Edit Space" : "Create Space"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Studio A, Main Gym Floor"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this space..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                placeholder="Maximum number of people"
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
                {editingSpace ? "Save Changes" : "Create Space"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Space?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This will remove the space from all scheduled classes.
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
