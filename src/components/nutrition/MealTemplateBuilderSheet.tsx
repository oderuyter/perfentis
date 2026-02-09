import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Search, Trash2, GripVertical, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Food } from "@/hooks/useNutrition";

interface TemplateItem {
  food: Food;
  quantity_grams: number;
}

interface MealTemplateBuilderSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  editTemplate?: {
    id: string;
    name: string;
    description: string;
    tags: string[];
    is_public: boolean;
    items: { food_id: string; food_name: string; quantity_grams: number }[];
  } | null;
}

export function MealTemplateBuilderSheet({
  open,
  onClose,
  onSaved,
  editTemplate,
}: MealTemplateBuilderSheetProps) {
  const { user } = useAuth();
  const [name, setName] = useState(editTemplate?.name || "");
  const [description, setDescription] = useState(editTemplate?.description || "");
  const [tags, setTags] = useState(editTemplate?.tags?.join(", ") || "");
  const [isPublic, setIsPublic] = useState(editTemplate?.is_public ?? false);
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setDescription("");
    setTags("");
    setIsPublic(false);
    setItems([]);
    setSearchMode(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 300);
  };

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from("foods")
      .select("*")
      .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
      .limit(15);
    setSearchResults((data || []) as unknown as Food[]);
    setSearching(false);
  }, []);

  const addItem = (food: Food) => {
    setItems((prev) => [...prev, { food, quantity_grams: Number(food.serving_size_g) || 100 }]);
    setSearchMode(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQuantity = (idx: number, grams: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, quantity_grams: grams } : item))
    );
  };

  const totalMacros = items.reduce(
    (acc, item) => {
      const factor = item.quantity_grams / 100;
      return {
        cal: acc.cal + Number(item.food.calories_per_100g) * factor,
        p: acc.p + Number(item.food.protein_per_100g) * factor,
        c: acc.c + Number(item.food.carbs_per_100g) * factor,
        f: acc.f + Number(item.food.fat_per_100g) * factor,
      };
    },
    { cal: 0, p: 0, c: 0, f: 0 }
  );

  const handleSave = async () => {
    if (!name.trim() || items.length === 0 || !user) {
      toast.error("Name and at least one food item required");
      return;
    }
    setSaving(true);

    try {
      const parsedTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      // Compute fingerprint: sorted food_id + rounded grams
      const fingerprintParts = items
        .map((item) => `${item.food.id}:${Math.round(item.quantity_grams)}`)
        .sort();
      const fingerprint = fingerprintParts.join("|");

      if (editTemplate?.id) {
        // Update existing
        await supabase
          .from("meal_templates")
          .update({
            name: name.trim(),
            description: description.trim() || null,
            tags: parsedTags,
            is_public: isPublic,
            fingerprint,
          })
          .eq("id", editTemplate.id);

        // Delete old items and re-insert
        await supabase.from("meal_template_items").delete().eq("meal_template_id", editTemplate.id);
        await supabase.from("meal_template_items").insert(
          items.map((item, idx) => ({
            meal_template_id: editTemplate.id,
            food_id: item.food.id,
            quantity_grams: item.quantity_grams,
            sort_order: idx,
          }))
        );
      } else {
        // Create new
        const { data: template, error } = await supabase
          .from("meal_templates")
          .insert({
            name: name.trim(),
            description: description.trim() || null,
            tags: parsedTags,
            is_public: isPublic,
            is_approved: false,
            fingerprint,
            created_by: user.id,
          })
          .select()
          .single();

        if (error || !template) throw error || new Error("Failed to create template");

        await supabase.from("meal_template_items").insert(
          items.map((item, idx) => ({
            meal_template_id: template.id,
            food_id: item.food.id,
            quantity_grams: item.quantity_grams,
            sort_order: idx,
          }))
        );
      }

      toast.success(editTemplate ? "Template updated" : "Template created");
      handleClose();
      onSaved?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[120]"
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[130] shadow-elevated max-h-[90vh] flex flex-col"
          >
            <div className="p-4 pb-2 flex items-center justify-between flex-shrink-0">
              <h2 className="text-base font-semibold">
                {editTemplate ? "Edit Template" : "New Meal Template"}
              </h2>
              <button onClick={handleClose} className="p-2 rounded-full bg-muted/50">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-footer-safe space-y-4">
              {/* Name & Description */}
              <div className="space-y-2 pt-2">
                <div>
                  <Label className="text-xs">Template Name</Label>
                  <Input
                    placeholder="e.g. High Protein Breakfast"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Description (optional)</Label>
                  <Input
                    placeholder="Brief description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Tags (comma-separated)</Label>
                  <Input
                    placeholder="high-protein, breakfast, quick"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Submit to community</Label>
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-semibold">
                    Foods ({items.length})
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchMode(true)}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Food
                  </Button>
                </div>

                {searchMode && (
                  <div className="space-y-2 mb-3 p-3 rounded-xl bg-muted/20 border border-border/30">
                    <Input
                      placeholder="Search foods..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      autoFocus
                    />
                    {searching && (
                      <div className="text-center py-2">
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                      </div>
                    )}
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {searchResults.map((food) => (
                        <button
                          key={food.id}
                          onClick={() => addItem(food)}
                          className="w-full text-left p-2 rounded-lg hover:bg-muted/40 text-xs"
                        >
                          <span className="font-medium">{food.name}</span>
                          {food.brand && (
                            <span className="text-muted-foreground"> · {food.brand}</span>
                          )}
                          <span className="text-muted-foreground ml-1">
                            ({Number(food.calories_per_100g).toFixed(0)} kcal/100g)
                          </span>
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchMode(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {items.length === 0 && !searchMode ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    No foods added yet. Click "Add Food" to start building your template.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {items.map((item, idx) => (
                      <div
                        key={`${item.food.id}-${idx}`}
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/20 border border-border/20"
                      >
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{item.food.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {((Number(item.food.calories_per_100g) * item.quantity_grams) / 100).toFixed(0)} kcal
                          </p>
                        </div>
                        <Input
                          type="number"
                          value={item.quantity_grams}
                          onChange={(e) => updateQuantity(idx, Number(e.target.value) || 0)}
                          className="w-20 h-8 text-xs text-center"
                        />
                        <span className="text-[10px] text-muted-foreground">g</span>
                        <button
                          onClick={() => removeItem(idx)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals */}
              {items.length > 0 && (
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: "Calories", val: totalMacros.cal.toFixed(0) },
                    { label: "Protein", val: totalMacros.p.toFixed(1) + "g" },
                    { label: "Carbs", val: totalMacros.c.toFixed(1) + "g" },
                    { label: "Fat", val: totalMacros.f.toFixed(1) + "g" },
                  ].map((m) => (
                    <div key={m.label} className="p-2 rounded-xl bg-muted/30">
                      <p className="text-sm font-bold tabular-nums">{m.val}</p>
                      <p className="text-[9px] text-muted-foreground">{m.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Save */}
              <Button
                onClick={handleSave}
                disabled={!name.trim() || items.length === 0 || saving}
                className="w-full"
                size="lg"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : editTemplate ? "Update Template" : "Save Template"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
