import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, PenLine, ScanBarcode, ChevronRight, Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Food, MealType } from "@/hooks/useNutrition";

const mealLabels: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

interface AddFoodSheetProps {
  open: boolean;
  mealType: MealType;
  mealId: string;
  onClose: () => void;
  onSearchFoods: (query: string) => Promise<Food[]>;
  onAddFood: (mealId: string, food: Food, grams: number) => Promise<boolean>;
  onAddManual: (
    mealId: string,
    name: string,
    cal: number,
    p: number,
    c: number,
    f: number
  ) => Promise<boolean>;
  onScanBarcode: () => void;
}

type AddMode = "menu" | "search" | "manual" | "preview";

export function AddFoodSheet({
  open,
  mealType,
  mealId,
  onClose,
  onSearchFoods,
  onAddFood,
  onAddManual,
  onScanBarcode,
}: AddFoodSheetProps) {
  const [mode, setMode] = useState<AddMode>("menu");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [manual, setManual] = useState({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  const reset = () => {
    setMode("menu");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedFood(null);
    setQuantity(100);
    setManual({ name: "", calories: "", protein: "", carbs: "", fat: "" });
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 300);
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const results = await onSearchFoods(q);
    setSearchResults(results);
    setSearching(false);
  };

  const handleSelectFood = (food: Food) => {
    setSelectedFood(food);
    setQuantity(Number(food.serving_size_g) || 100);
    setMode("preview");
  };

  const handleConfirmFood = async () => {
    if (!selectedFood) return;
    const ok = await onAddFood(mealId, selectedFood, quantity);
    if (ok) handleClose();
  };

  const handleManualAdd = async () => {
    if (!manual.name) return;
    const ok = await onAddManual(
      mealId,
      manual.name,
      Number(manual.calories) || 0,
      Number(manual.protein) || 0,
      Number(manual.carbs) || 0,
      Number(manual.fat) || 0
    );
    if (ok) handleClose();
  };

  const previewMacros = selectedFood
    ? {
        cal: ((selectedFood.calories_per_100g * quantity) / 100).toFixed(0),
        p: ((selectedFood.protein_per_100g * quantity) / 100).toFixed(1),
        c: ((selectedFood.carbs_per_100g * quantity) / 100).toFixed(1),
        f: ((selectedFood.fat_per_100g * quantity) / 100).toFixed(1),
      }
    : null;

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[69]"
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[70] shadow-elevated max-h-[85vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 pb-2 flex items-center justify-between flex-shrink-0">
              <div>
                {mode !== "menu" && (
                  <button
                    onClick={() => (mode === "preview" ? setMode("search") : setMode("menu"))}
                    className="text-xs text-muted-foreground mb-1"
                  >
                    ← Back
                  </button>
                )}
                <h2 className="text-base font-semibold">
                  Add to {mealLabels[mealType]}
                </h2>
              </div>
              <button onClick={handleClose} className="p-2 rounded-full bg-muted/50">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-footer-safe">
              {mode === "menu" && (
                <div className="space-y-2 py-3">
                  {[
                    { key: "search", icon: Search, label: "Search Food", sub: "Find in database" },
                    { key: "manual", icon: PenLine, label: "Manual Entry", sub: "Enter macros" },
                    { key: "barcode", icon: ScanBarcode, label: "Scan Barcode", sub: "Scan product" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => {
                        if (item.key === "barcode") {
                          onScanBarcode();
                          return;
                        }
                        setMode(item.key as AddMode);
                      }}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {mode === "search" && (
                <div className="space-y-3 py-3">
                  <Input
                    placeholder="Search foods..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    autoFocus
                  />
                  {searching && (
                    <div className="text-center py-4">
                      <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                  )}
                  {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No foods found. Try a different search or add manually.
                    </p>
                  )}
                  <div className="space-y-1">
                    {searchResults.map((food) => (
                      <button
                        key={food.id}
                        onClick={() => handleSelectFood(food)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{food.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {food.brand && `${food.brand} · `}
                            {Number(food.protein_per_100g).toFixed(0)}P · {Number(food.carbs_per_100g).toFixed(0)}C · {Number(food.fat_per_100g).toFixed(0)}F per 100g
                          </p>
                        </div>
                        <span className="text-xs font-medium tabular-nums ml-2">
                          {Number(food.calories_per_100g).toFixed(0)} kcal
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === "preview" && selectedFood && previewMacros && (
                <div className="space-y-5 py-3">
                  <div>
                    <h3 className="font-semibold text-sm">{selectedFood.name}</h3>
                    {selectedFood.brand && (
                      <p className="text-xs text-muted-foreground">{selectedFood.brand}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs">Amount (grams)</Label>
                    <div className="flex items-center gap-3 mt-1.5">
                      <button
                        onClick={() => setQuantity(Math.max(10, quantity - 10))}
                        className="p-2 rounded-lg bg-muted/50"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <Input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                        className="text-center font-semibold"
                      />
                      <button
                        onClick={() => setQuantity(quantity + 10)}
                        className="p-2 rounded-lg bg-muted/50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: "Calories", val: previewMacros.cal, unit: "kcal" },
                      { label: "Protein", val: previewMacros.p, unit: "g" },
                      { label: "Carbs", val: previewMacros.c, unit: "g" },
                      { label: "Fat", val: previewMacros.f, unit: "g" },
                    ].map((m) => (
                      <div
                        key={m.label}
                        className="p-2.5 rounded-xl bg-muted/30"
                      >
                        <p className="text-lg font-bold tabular-nums">{m.val}</p>
                        <p className="text-[9px] text-muted-foreground">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  <Button onClick={handleConfirmFood} className="w-full" size="lg">
                    Add to {mealLabels[mealType]}
                  </Button>
                </div>
              )}

              {mode === "manual" && (
                <div className="space-y-3 py-3">
                  <div>
                    <Label className="text-xs">Food name</Label>
                    <Input
                      placeholder="e.g. Chicken breast"
                      value={manual.name}
                      onChange={(e) => setManual({ ...manual, name: e.target.value })}
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "calories", label: "Calories (kcal)" },
                      { key: "protein", label: "Protein (g)" },
                      { key: "carbs", label: "Carbs (g)" },
                      { key: "fat", label: "Fat (g)" },
                    ].map((field) => (
                      <div key={field.key}>
                        <Label className="text-xs">{field.label}</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={(manual as any)[field.key]}
                          onChange={(e) =>
                            setManual({ ...manual, [field.key]: e.target.value })
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={handleManualAdd}
                    disabled={!manual.name}
                    className="w-full"
                    size="lg"
                  >
                    Add Entry
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
