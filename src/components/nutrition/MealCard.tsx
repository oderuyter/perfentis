import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ChevronDown, Coffee, Sun, Sunset, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NutritionMeal, NutritionEntry, MealType } from "@/hooks/useNutrition";

const mealConfig: Record<MealType, { icon: React.ElementType; label: string }> = {
  breakfast: { icon: Coffee, label: "Breakfast" },
  lunch: { icon: Sun, label: "Lunch" },
  dinner: { icon: Sunset, label: "Dinner" },
  snacks: { icon: Moon, label: "Snacks" },
};

interface MealCardProps {
  meal: NutritionMeal;
  entries: NutritionEntry[];
  onAdd: (mealId: string, mealType: MealType) => void;
  onDeleteEntry: (entryId: string) => void;
}

export function MealCard({ meal, entries, onAdd, onDeleteEntry }: MealCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = mealConfig[meal.meal_type];
  const Icon = config.icon;
  const totalCal = Number(meal.total_calories) || 0;
  const totalP = Number(meal.total_protein_g) || 0;
  const totalC = Number(meal.total_carbs_g) || 0;
  const totalF = Number(meal.total_fat_g) || 0;

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/30 overflow-hidden">
      <button
        onClick={() => entries.length > 0 && setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3.5"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center flex-shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-medium">{config.label}</p>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {totalCal > 0
                ? `${Math.round(totalCal)} kcal · ${Math.round(totalP)}P · ${Math.round(totalC)}C · ${Math.round(totalF)}F`
                : "No entries yet"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                expanded && "rotate-180"
              )}
            />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd(meal.id, meal.meal_type);
            }}
            className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-primary" />
          </button>
        </div>
      </button>

      <AnimatePresence>
        {expanded && entries.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between px-4 py-2.5 border-b border-border/20 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {entry.food_name || "Unknown food"}
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {Math.round(Number(entry.computed_protein_g))}P ·{" "}
                      {Math.round(Number(entry.computed_carbs_g))}C ·{" "}
                      {Math.round(Number(entry.computed_fat_g))}F
                      {entry.quantity_grams !== 100 && ` · ${entry.quantity_grams}g`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium tabular-nums">
                      {Math.round(Number(entry.computed_calories))}
                    </span>
                    <button
                      onClick={() => onDeleteEntry(entry.id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
