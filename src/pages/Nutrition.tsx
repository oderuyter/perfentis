import { useState } from "react";
import { motion } from "framer-motion";
import { format, isToday } from "date-fns";
import { Settings2, ScanBarcode, Search, PenLine, BookTemplate, Library } from "lucide-react";
import { useNutrition, MealType } from "@/hooks/useNutrition";
import { MacroDial } from "@/components/nutrition/MacroDial";
import { DateStrip } from "@/components/nutrition/DateStrip";
import { MealCard } from "@/components/nutrition/MealCard";
import { AddFoodSheet } from "@/components/nutrition/AddFoodSheet";
import { GoalsSheet } from "@/components/nutrition/GoalsSheet";
import { BarcodeScannerSheet } from "@/components/nutrition/BarcodeScannerSheet";
import { MealTemplateBuilderSheet } from "@/components/nutrition/MealTemplateBuilderSheet";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Nutrition() {
  const {
    selectedDate,
    goals,
    day,
    meals,
    loading,
    weekData,
    addEntry,
    addManualEntry,
    deleteEntry,
    updateGoals,
    searchFoods,
    goToDate,
    prevDay,
    nextDay,
    getMealByType,
    getEntriesForMeal,
  } = useNutrition();

  const navigate = useNavigate();
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addMealId, setAddMealId] = useState("");
  const [addMealType, setAddMealType] = useState<MealType>("snacks");
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [barcodeMealId, setBarcodeMealId] = useState("");
  const [barcodeMealType, setBarcodeMealType] = useState<MealType>("snacks");
  const [templateBuilderOpen, setTemplateBuilderOpen] = useState(false);

  const totalCal = Number(day?.total_calories) || 0;
  const totalP = Number(day?.total_protein_g) || 0;
  const totalC = Number(day?.total_carbs_g) || 0;
  const totalF = Number(day?.total_fat_g) || 0;

  const calGoal = goals?.calories || 2000;
  const pGoal = goals?.protein_g || 150;
  const cGoal = goals?.carbs_g || 250;
  const fGoal = goals?.fat_g || 65;

  const handleAddToMeal = (mealId: string, mealType: MealType) => {
    setAddMealId(mealId);
    setAddMealType(mealType);
    setAddSheetOpen(true);
  };

  const handleScanBarcode = () => {
    const snacksMeal = getMealByType("snacks");
    if (snacksMeal) {
      setBarcodeMealId(snacksMeal.id);
      setBarcodeMealType("snacks");
    }
    setBarcodeOpen(true);
  };

  const handleScanBarcodeFromAddSheet = () => {
    setAddSheetOpen(false);
    setBarcodeMealId(addMealId);
    setBarcodeMealType(addMealType);
    setBarcodeOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen px-4 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snacks"];

  return (
    <div className="min-h-screen px-4 pb-footer-safe">
      {/* Header */}
      <header className="pt-5 pb-2 flex items-center justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl font-semibold tracking-tight"
          >
            Nutrition
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 }}
            className="text-muted-foreground text-xs"
          >
            {isToday(selectedDate)
              ? "Today"
              : format(selectedDate, "EEE, MMM d")}
          </motion.p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate("/nutrition/library")}
            className="p-2 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
          >
            <Library className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setGoalsOpen(true)}
            className="p-2 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
          >
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Date Strip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-2"
      >
        <DateStrip
          selectedDate={selectedDate}
          weekData={weekData}
          calorieGoal={calGoal}
          onDateSelect={goToDate}
          onPrev={prevDay}
          onNext={nextDay}
        />
      </motion.div>

      {/* Macro Dials */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="flex items-end justify-center gap-4 mt-5 mb-1"
      >
        <MacroDial label="Protein" consumed={totalP} goal={pGoal} unit="g" colorVar="--status-error" size="sm" />
        <MacroDial label="Calories" consumed={totalCal} goal={calGoal} colorVar="--accent-primary" size="lg" />
        <MacroDial label="Carbs" consumed={totalC} goal={cGoal} unit="g" colorVar="--status-warning" size="sm" />
        <MacroDial label="Fat" consumed={totalF} goal={fGoal} unit="g" colorVar="--status-success" size="sm" />
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="flex gap-2 mt-5 overflow-x-auto no-scrollbar"
      >
        {[
          { icon: ScanBarcode, label: "Scan", action: handleScanBarcode },
          {
            icon: Search,
            label: "Search",
            action: () => {
              const m = getMealByType("snacks");
              if (m) handleAddToMeal(m.id, "snacks");
            },
          },
          {
            icon: PenLine,
            label: "Custom",
            action: () => {
              const m = getMealByType("snacks");
              if (m) handleAddToMeal(m.id, "snacks");
            },
          },
          {
            icon: BookTemplate,
            label: "Template",
            action: () => setTemplateBuilderOpen(true),
          },
        ].map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            onClick={action}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/30 hover:bg-muted/50 transition-colors text-xs font-medium whitespace-nowrap"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </motion.div>

      {/* Meals List */}
      <div className="mt-5 space-y-2.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
          Meals
        </p>
        {mealTypes.map((type, idx) => {
          const meal = getMealByType(type);
          if (!meal) return null;
          return (
            <motion.div
              key={type}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + idx * 0.04 }}
            >
              <MealCard
                meal={meal}
                entries={getEntriesForMeal(meal.id)}
                onAdd={handleAddToMeal}
                onDeleteEntry={deleteEntry}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Add Food Sheet */}
      <AddFoodSheet
        open={addSheetOpen}
        mealType={addMealType}
        mealId={addMealId}
        onClose={() => setAddSheetOpen(false)}
        onSearchFoods={searchFoods}
        onAddFood={addEntry}
        onAddManual={addManualEntry}
        onScanBarcode={handleScanBarcodeFromAddSheet}
      />

      {/* Barcode Scanner Sheet */}
      <BarcodeScannerSheet
        open={barcodeOpen}
        mealType={barcodeMealType}
        mealId={barcodeMealId}
        onClose={() => setBarcodeOpen(false)}
        onAddFood={addEntry}
      />

      {/* Meal Template Builder */}
      <MealTemplateBuilderSheet
        open={templateBuilderOpen}
        onClose={() => setTemplateBuilderOpen(false)}
      />

      {/* Goals Sheet */}
      <GoalsSheet
        open={goalsOpen}
        onOpenChange={setGoalsOpen}
        goals={goals}
        onSave={updateGoals}
      />
    </div>
  );
}
