import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Flame, 
  Beef, 
  Wheat, 
  Droplet,
  Search,
  ScanBarcode,
  PenLine,
  ChevronRight,
  X,
  Coffee,
  Sun,
  Sunset,
  Moon
} from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface NutritionEntry {
  id: string;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_type: string;
  logged_at: string;
}

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

const mealConfig: Record<MealType, { icon: React.ElementType; label: string; time: string }> = {
  breakfast: { icon: Coffee, label: "Breakfast", time: "Morning" },
  lunch: { icon: Sun, label: "Lunch", time: "Midday" },
  dinner: { icon: Sunset, label: "Dinner", time: "Evening" },
  snack: { icon: Moon, label: "Snacks", time: "Anytime" },
};

// Mock food database for search
const mockFoods = [
  { name: "Chicken Breast (100g)", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "Brown Rice (1 cup)", calories: 216, protein: 5, carbs: 45, fat: 1.8 },
  { name: "Broccoli (100g)", calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  { name: "Salmon (100g)", calories: 208, protein: 20, carbs: 0, fat: 13 },
  { name: "Eggs (2 large)", calories: 143, protein: 13, carbs: 1, fat: 10 },
  { name: "Greek Yogurt (170g)", calories: 100, protein: 17, carbs: 6, fat: 0.7 },
  { name: "Banana", calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { name: "Oatmeal (1 cup)", calories: 158, protein: 6, carbs: 27, fat: 3 },
  { name: "Almonds (28g)", calories: 164, protein: 6, carbs: 6, fat: 14 },
  { name: "Sweet Potato (medium)", calories: 103, protein: 2, carbs: 24, fat: 0.1 },
];

export default function Nutrition() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType>("snack");
  const [addMode, setAddMode] = useState<"search" | "manual" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [manualEntry, setManualEntry] = useState({
    food_name: "",
    calories: "",
    protein_g: "",
    carbs_g: "",
    fat_g: "",
  });

  const today = new Date();

  useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [user]);

  const fetchEntries = async () => {
    if (!user) return;
    
    const start = startOfDay(today);
    const end = endOfDay(today);
    
    const { data, error } = await supabase
      .from("nutrition_entries")
      .select("*")
      .eq("user_id", user.id)
      .gte("logged_at", start.toISOString())
      .lte("logged_at", end.toISOString())
      .order("logged_at", { ascending: true });

    if (error) {
      console.error("Error fetching nutrition entries:", error);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  const handleAddFood = async (food: { name: string; calories: number; protein: number; carbs: number; fat: number }) => {
    if (!user) return;

    const { error } = await supabase
      .from("nutrition_entries")
      .insert({
        user_id: user.id,
        food_name: food.name,
        calories: food.calories,
        protein_g: food.protein,
        carbs_g: food.carbs,
        fat_g: food.fat,
        meal_type: selectedMealType,
        source: "search",
      });

    if (error) {
      toast.error("Failed to add food");
    } else {
      toast.success("Food added");
      fetchEntries();
      setShowAddSheet(false);
      setAddMode(null);
      setSearchQuery("");
    }
  };

  const handleManualAdd = async () => {
    if (!user || !manualEntry.food_name) return;

    const { error } = await supabase
      .from("nutrition_entries")
      .insert({
        user_id: user.id,
        food_name: manualEntry.food_name,
        calories: parseInt(manualEntry.calories) || 0,
        protein_g: parseFloat(manualEntry.protein_g) || 0,
        carbs_g: parseFloat(manualEntry.carbs_g) || 0,
        fat_g: parseFloat(manualEntry.fat_g) || 0,
        meal_type: selectedMealType,
        source: "manual",
      });

    if (error) {
      toast.error("Failed to add food");
    } else {
      toast.success("Food added");
      fetchEntries();
      setShowAddSheet(false);
      setAddMode(null);
      setManualEntry({ food_name: "", calories: "", protein_g: "", carbs_g: "", fat_g: "" });
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const { error } = await supabase
      .from("nutrition_entries")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete");
    } else {
      fetchEntries();
    }
  };

  // Calculate totals
  const totals = entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + (entry.calories || 0),
      protein: acc.protein + (entry.protein_g || 0),
      carbs: acc.carbs + (entry.carbs_g || 0),
      fat: acc.fat + (entry.fat_g || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Group entries by meal type
  const entriesByMeal = entries.reduce((acc, entry) => {
    const type = (entry.meal_type || "snack") as MealType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(entry);
    return acc;
  }, {} as Record<MealType, NutritionEntry[]>);

  const filteredFoods = mockFoods.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen pt-safe px-4 pb-4 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-safe px-4 pb-24">
      {/* Header */}
      <header className="pt-6 pb-4">
        <motion.h1 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight"
        >
          Nutrition
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-muted-foreground text-sm mt-1"
        >
          {format(today, "EEEE, MMMM d")}
        </motion.p>
      </header>

      {/* Daily Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3 mt-4"
      >
        {/* Calories Card */}
        <div className="col-span-2 gradient-card-accent rounded-xl p-5 shadow-card border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="h-5 w-5 text-accent-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Calories
            </p>
          </div>
          <p className="text-3xl font-semibold">{totals.calories}</p>
          <p className="text-sm text-muted-foreground mt-1">kcal consumed</p>
        </div>

        {/* Macros Cards */}
        <div className="bg-card rounded-xl p-4 shadow-card border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Beef className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">Protein</p>
          </div>
          <p className="text-xl font-semibold">{totals.protein.toFixed(1)}g</p>
        </div>

        <div className="bg-card rounded-xl p-4 shadow-card border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Wheat className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">Carbs</p>
          </div>
          <p className="text-xl font-semibold">{totals.carbs.toFixed(1)}g</p>
        </div>

        <div className="col-span-2 bg-card rounded-xl p-4 shadow-card border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Droplet className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">Fat</p>
          </div>
          <p className="text-xl font-semibold">{totals.fat.toFixed(1)}g</p>
        </div>
      </motion.div>

      {/* Meals */}
      <div className="mt-6 space-y-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Today's Meals
        </p>

        {(Object.keys(mealConfig) as MealType[]).map((mealType, idx) => {
          const config = mealConfig[mealType];
          const mealEntries = entriesByMeal[mealType] || [];
          const mealCalories = mealEntries.reduce((sum, e) => sum + (e.calories || 0), 0);

          return (
            <motion.div
              key={mealType}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + idx * 0.05 }}
              className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <config.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{config.label}</p>
                    <p className="text-xs text-muted-foreground">{mealCalories} kcal</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedMealType(mealType);
                    setShowAddSheet(true);
                  }}
                  className="p-2 rounded-full bg-accent hover:bg-accent/80 transition-colors"
                >
                  <Plus className="h-4 w-4 text-accent-foreground" />
                </button>
              </div>

              {mealEntries.length > 0 && (
                <div className="border-t border-border">
                  {mealEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between px-4 py-3 border-b border-border/50 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{entry.food_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.protein_g}g P · {entry.carbs_g}g C · {entry.fat_g}g F
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{entry.calories}</span>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Add Food Sheet */}
      <AnimatePresence>
        {showAddSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[69]"
              onClick={() => {
                setShowAddSheet(false);
                setAddMode(null);
              }}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[70] shadow-elevated max-h-[85vh] overflow-hidden flex flex-col"
            >
              <div className="p-4 pb-0 relative flex-shrink-0">
                <button
                  onClick={() => {
                    setShowAddSheet(false);
                    setAddMode(null);
                  }}
                  className="absolute right-4 top-4 p-2 rounded-full bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
                <h2 className="text-lg font-semibold">
                  Add to {mealConfig[selectedMealType].label}
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-6 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
                {!addMode ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => setAddMode("search")}
                      className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center">
                        <Search className="h-5 w-5 text-accent-foreground" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Search Food</p>
                        <p className="text-sm text-muted-foreground">Find from database</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />
                    </button>

                    <button
                      onClick={() => setAddMode("manual")}
                      className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center">
                        <PenLine className="h-5 w-5 text-accent-foreground" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Manual Entry</p>
                        <p className="text-sm text-muted-foreground">Enter details yourself</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />
                    </button>

                    <button
                      className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/50 opacity-60"
                      disabled
                    >
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <ScanBarcode className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Scan Barcode</p>
                        <p className="text-sm text-muted-foreground">Coming soon</p>
                      </div>
                    </button>
                  </div>
                ) : addMode === "search" ? (
                  <div className="space-y-4">
                    <button
                      onClick={() => setAddMode(null)}
                      className="text-sm text-muted-foreground"
                    >
                      ← Back
                    </button>
                    <Input
                      placeholder="Search foods..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                    <div className="space-y-2">
                      {filteredFoods.map((food, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAddFood(food)}
                          className="w-full flex items-center justify-between p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors text-left"
                        >
                          <div>
                            <p className="font-medium text-sm">{food.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {food.protein}g P · {food.carbs}g C · {food.fat}g F
                            </p>
                          </div>
                          <span className="text-sm font-medium">{food.calories} kcal</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button
                      onClick={() => setAddMode(null)}
                      className="text-sm text-muted-foreground"
                    >
                      ← Back
                    </button>
                    <Input
                      placeholder="Food name"
                      value={manualEntry.food_name}
                      onChange={(e) => setManualEntry({ ...manualEntry, food_name: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Calories"
                        type="number"
                        value={manualEntry.calories}
                        onChange={(e) => setManualEntry({ ...manualEntry, calories: e.target.value })}
                      />
                      <Input
                        placeholder="Protein (g)"
                        type="number"
                        value={manualEntry.protein_g}
                        onChange={(e) => setManualEntry({ ...manualEntry, protein_g: e.target.value })}
                      />
                      <Input
                        placeholder="Carbs (g)"
                        type="number"
                        value={manualEntry.carbs_g}
                        onChange={(e) => setManualEntry({ ...manualEntry, carbs_g: e.target.value })}
                      />
                      <Input
                        placeholder="Fat (g)"
                        type="number"
                        value={manualEntry.fat_g}
                        onChange={(e) => setManualEntry({ ...manualEntry, fat_g: e.target.value })}
                      />
                    </div>
                    <Button
                      onClick={handleManualAdd}
                      className="w-full"
                      disabled={!manualEntry.food_name}
                    >
                      Add Food
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
