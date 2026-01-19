import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  GripVertical,
  Folder,
  FolderPlus,
  Dumbbell,
  Link2,
  Unlink,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { motion, Reorder, useDragControls } from "framer-motion";

interface Category {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  display_order: number;
}

interface EventClass {
  id: string;
  event_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  capacity: number | null;
  display_order: number;
  workouts?: ClassWorkout[];
}

interface ClassWorkout {
  id: string;
  class_id: string;
  workout_id: string;
  display_order: number;
  workout?: Workout;
}

interface Workout {
  id: string;
  title: string;
  workout_type: string;
  scoring_type: string;
}

interface ContextType {
  selectedEventId: string | null;
}

export default function EventClassesWorkouts() {
  const { selectedEventId } = useOutletContext<ContextType>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [classes, setClasses] = useState<EventClass[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  // Dialog states
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [linkWorkoutDialogOpen, setLinkWorkoutDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [editingClass, setEditingClass] = useState<Partial<EventClass> | null>(null);
  const [selectedClassForLink, setSelectedClassForLink] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!selectedEventId) return;
    setLoading(true);

    try {
      // Fetch categories
      const { data: categoriesData, error: catError } = await supabase
        .from("event_class_categories")
        .select("*")
        .eq("event_id", selectedEventId)
        .order("display_order");

      if (catError) throw catError;

      // Fetch classes with linked workouts
      const { data: classesData, error: classError } = await supabase
        .from("event_classes")
        .select(`
          *,
          event_class_workouts (
            id,
            class_id,
            workout_id,
            display_order
          )
        `)
        .eq("event_id", selectedEventId)
        .order("display_order");

      if (classError) throw classError;

      // Fetch all workouts for this event
      const { data: workoutsData, error: workoutError } = await supabase
        .from("event_workouts")
        .select("id, title, workout_type, scoring_type")
        .eq("event_id", selectedEventId)
        .order("display_order");

      if (workoutError) throw workoutError;

      // Map workout details to class workouts
      const workoutMap = new Map(workoutsData?.map((w) => [w.id, w]) || []);
      const enrichedClasses = (classesData || []).map((c: any) => ({
        ...c,
        workouts: (c.event_class_workouts || []).map((cw: any) => ({
          ...cw,
          workout: workoutMap.get(cw.workout_id),
        })),
      }));

      setCategories(categoriesData || []);
      setClasses(enrichedClasses);
      setWorkouts(workoutsData || []);
      
      // Auto-expand all categories
      setExpandedCategories(new Set(categoriesData?.map((c) => c.id) || []));
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Category handlers
  const handleSaveCategory = async () => {
    if (!editingCategory?.name?.trim() || !selectedEventId) {
      toast.error("Category name is required");
      return;
    }

    setSaving(true);
    try {
      if (editingCategory.id) {
        await supabase
          .from("event_class_categories")
          .update({
            name: editingCategory.name,
            description: editingCategory.description || null,
          })
          .eq("id", editingCategory.id);
        toast.success("Category updated");
      } else {
        await supabase.from("event_class_categories").insert({
          event_id: selectedEventId,
          name: editingCategory.name,
          description: editingCategory.description || null,
          display_order: categories.length,
        });
        toast.success("Category created");
      }
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      fetchData();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete this category? Classes will be uncategorized.")) return;

    try {
      await supabase.from("event_class_categories").delete().eq("id", id);
      toast.success("Category deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete category");
    }
  };

  // Class handlers
  const handleSaveClass = async () => {
    if (!editingClass?.name?.trim() || !selectedEventId) {
      toast.error("Class name is required");
      return;
    }

    setSaving(true);
    try {
      if (editingClass.id) {
        await supabase
          .from("event_classes")
          .update({
            name: editingClass.name,
            description: editingClass.description || null,
            category_id: editingClass.category_id || null,
            capacity: editingClass.capacity || null,
          })
          .eq("id", editingClass.id);
        toast.success("Class updated");
      } else {
        await supabase.from("event_classes").insert({
          event_id: selectedEventId,
          name: editingClass.name,
          description: editingClass.description || null,
          category_id: editingClass.category_id || null,
          capacity: editingClass.capacity || null,
          display_order: classes.length,
        });
        toast.success("Class created");
      }
      setClassDialogOpen(false);
      setEditingClass(null);
      fetchData();
    } catch (error) {
      console.error("Error saving class:", error);
      toast.error("Failed to save class");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm("Delete this class? Linked workouts will be unlinked.")) return;

    try {
      await supabase.from("event_classes").delete().eq("id", id);
      toast.success("Class deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete class");
    }
  };

  // Workout linking
  const handleLinkWorkout = async (workoutId: string) => {
    if (!selectedClassForLink) return;

    try {
      const existingLinks = classes.find((c) => c.id === selectedClassForLink)?.workouts || [];
      await supabase.from("event_class_workouts").insert({
        class_id: selectedClassForLink,
        workout_id: workoutId,
        display_order: existingLinks.length,
      });
      toast.success("Workout linked");
      fetchData();
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("Workout already linked to this class");
      } else {
        toast.error("Failed to link workout");
      }
    }
  };

  const handleUnlinkWorkout = async (linkId: string) => {
    try {
      await supabase.from("event_class_workouts").delete().eq("id", linkId);
      toast.success("Workout unlinked");
      fetchData();
    } catch (error) {
      toast.error("Failed to unlink workout");
    }
  };

  // Reorder handlers
  const handleReorderCategories = async (newOrder: Category[]) => {
    setCategories(newOrder);
    const updates = newOrder.map((cat, index) => ({
      id: cat.id,
      display_order: index,
    }));

    for (const update of updates) {
      await supabase
        .from("event_class_categories")
        .update({ display_order: update.display_order })
        .eq("id", update.id);
    }
  };

  const handleReorderClasses = async (categoryId: string | null, newOrder: EventClass[]) => {
    const otherClasses = classes.filter((c) => c.category_id !== categoryId);
    setClasses([...otherClasses, ...newOrder]);

    const updates = newOrder.map((cls, index) => ({
      id: cls.id,
      display_order: index,
    }));

    for (const update of updates) {
      await supabase
        .from("event_classes")
        .update({ display_order: update.display_order })
        .eq("id", update.id);
    }
  };

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleClass = (id: string) => {
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getClassesByCategory = (categoryId: string | null) =>
    classes.filter((c) => c.category_id === categoryId);

  const getLinkedWorkoutIds = (classId: string) => {
    const cls = classes.find((c) => c.id === classId);
    return new Set(cls?.workouts?.map((w) => w.workout_id) || []);
  };

  const availableWorkoutsForClass = (classId: string) => {
    const linkedIds = getLinkedWorkoutIds(classId);
    return workouts.filter((w) => !linkedIds.has(w.id));
  };

  if (!selectedEventId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Folder className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Event Selected</h2>
        <p className="text-muted-foreground">Select an event to manage classes and workouts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Classes & Workouts</h1>
          <p className="text-muted-foreground">
            Organize workouts into categories and classes
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setEditingCategory({})}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory?.id ? "Edit Category" : "New Category"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={editingCategory?.name || ""}
                    onChange={(e) =>
                      setEditingCategory((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Scaled, RX, Masters"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editingCategory?.description || ""}
                    onChange={(e) =>
                      setEditingCategory((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveCategory} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingClass({})}>
                <Plus className="h-4 w-4 mr-2" />
                Add Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingClass?.id ? "Edit Class" : "New Class"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={editingClass?.name || ""}
                    onChange={(e) =>
                      setEditingClass((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Day 1 - Morning Session"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select
                    className="w-full h-10 px-3 border rounded-md bg-background"
                    value={editingClass?.category_id || ""}
                    onChange={(e) =>
                      setEditingClass((prev) => ({
                        ...prev,
                        category_id: e.target.value || null,
                      }))
                    }
                  >
                    <option value="">No Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    value={editingClass?.capacity || ""}
                    onChange={(e) =>
                      setEditingClass((prev) => ({
                        ...prev,
                        capacity: e.target.value ? parseInt(e.target.value) : null,
                      }))
                    }
                    placeholder="Leave empty for unlimited"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editingClass?.description || ""}
                    onChange={(e) =>
                      setEditingClass((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setClassDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveClass} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Categories */}
          <Reorder.Group
            axis="y"
            values={categories}
            onReorder={handleReorderCategories}
            className="space-y-3"
          >
            {categories.map((category) => {
              const isExpanded = expandedCategories.has(category.id);
              const categoryClasses = getClassesByCategory(category.id);

              return (
                <Reorder.Item key={category.id} value={category}>
                  <Card className="overflow-hidden">
                    <div className="flex items-center gap-2 p-4 bg-muted/30">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <button onClick={() => toggleCategory(category.id)} className="p-1">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      <Folder className="h-4 w-4 text-primary" />
                      <span className="font-medium flex-1">{category.name}</span>
                      <Badge variant="secondary">{categoryClasses.length} classes</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingCategory(category);
                          setCategoryDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="p-4 pt-2">
                        {categoryClasses.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            No classes in this category yet
                          </p>
                        ) : (
                          <Reorder.Group
                            axis="y"
                            values={categoryClasses}
                            onReorder={(newOrder) =>
                              handleReorderClasses(category.id, newOrder)
                            }
                            className="space-y-2"
                          >
                            {categoryClasses.map((cls) => (
                              <ClassItem
                                key={cls.id}
                                cls={cls}
                                isExpanded={expandedClasses.has(cls.id)}
                                onToggle={() => toggleClass(cls.id)}
                                onEdit={() => {
                                  setEditingClass(cls);
                                  setClassDialogOpen(true);
                                }}
                                onDelete={() => handleDeleteClass(cls.id)}
                                onLinkWorkout={() => {
                                  setSelectedClassForLink(cls.id);
                                  setLinkWorkoutDialogOpen(true);
                                }}
                                onUnlinkWorkout={handleUnlinkWorkout}
                              />
                            ))}
                          </Reorder.Group>
                        )}
                      </div>
                    )}
                  </Card>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>

          {/* Uncategorized Classes */}
          {getClassesByCategory(null).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  Uncategorized Classes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Reorder.Group
                  axis="y"
                  values={getClassesByCategory(null)}
                  onReorder={(newOrder) => handleReorderClasses(null, newOrder)}
                  className="space-y-2"
                >
                  {getClassesByCategory(null).map((cls) => (
                    <ClassItem
                      key={cls.id}
                      cls={cls}
                      isExpanded={expandedClasses.has(cls.id)}
                      onToggle={() => toggleClass(cls.id)}
                      onEdit={() => {
                        setEditingClass(cls);
                        setClassDialogOpen(true);
                      }}
                      onDelete={() => handleDeleteClass(cls.id)}
                      onLinkWorkout={() => {
                        setSelectedClassForLink(cls.id);
                        setLinkWorkoutDialogOpen(true);
                      }}
                      onUnlinkWorkout={handleUnlinkWorkout}
                    />
                  ))}
                </Reorder.Group>
              </CardContent>
            </Card>
          )}

          {categories.length === 0 && classes.length === 0 && (
            <Card className="p-12 text-center">
              <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No classes yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create categories and classes to organize your event workouts
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setCategoryDialogOpen(true)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
                <Button onClick={() => setClassDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Class
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Link Workout Dialog */}
      <Dialog open={linkWorkoutDialogOpen} onOpenChange={setLinkWorkoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Workout to Class</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedClassForLink && availableWorkoutsForClass(selectedClassForLink).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                All workouts are already linked to this class, or no workouts exist yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {selectedClassForLink &&
                  availableWorkoutsForClass(selectedClassForLink).map((workout) => (
                    <button
                      key={workout.id}
                      onClick={() => {
                        handleLinkWorkout(workout.id);
                        setLinkWorkoutDialogOpen(false);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                    >
                      <Dumbbell className="h-5 w-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{workout.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {workout.workout_type} • {workout.scoring_type}
                        </p>
                      </div>
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Class Item Component
function ClassItem({
  cls,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onLinkWorkout,
  onUnlinkWorkout,
}: {
  cls: EventClass;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLinkWorkout: () => void;
  onUnlinkWorkout: (linkId: string) => void;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item value={cls} dragListener={false} dragControls={controls}>
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 p-3 bg-background">
          <div
            onPointerDown={(e) => controls.start(e)}
            className="cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <button onClick={onToggle} className="p-1">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <span className="font-medium flex-1">{cls.name}</span>
          {cls.capacity && (
            <Badge variant="outline" className="text-xs">
              Cap: {cls.capacity}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            {cls.workouts?.length || 0} workouts
          </Badge>
          <Button variant="ghost" size="icon" onClick={onLinkWorkout}>
            <Link2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {isExpanded && (
          <div className="p-3 pt-0 space-y-2">
            {cls.description && (
              <p className="text-sm text-muted-foreground">{cls.description}</p>
            )}
            {(!cls.workouts || cls.workouts.length === 0) ? (
              <p className="text-sm text-muted-foreground py-2 text-center">
                No workouts linked yet
              </p>
            ) : (
              <div className="space-y-1">
                {cls.workouts.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-2 p-2 rounded bg-muted/30"
                  >
                    <Dumbbell className="h-4 w-4 text-primary shrink-0" />
                    <span className="flex-1 text-sm">
                      {link.workout?.title || "Unknown Workout"}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onUnlinkWorkout(link.id)}
                    >
                      <Unlink className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Reorder.Item>
  );
}
