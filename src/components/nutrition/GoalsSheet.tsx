import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { NutritionGoals } from "@/hooks/useNutrition";

interface GoalsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goals: NutritionGoals | null;
  onSave: (goals: Partial<NutritionGoals>) => Promise<void>;
}

export function GoalsSheet({ open, onOpenChange, goals, onSave }: GoalsSheetProps) {
  const [form, setForm] = useState({
    calories: goals?.calories || 2000,
    protein_g: goals?.protein_g || 150,
    carbs_g: goals?.carbs_g || 250,
    fat_g: goals?.fat_g || 65,
  });

  useEffect(() => {
    if (goals) {
      setForm({
        calories: goals.calories,
        protein_g: goals.protein_g,
        carbs_g: goals.carbs_g,
        fat_g: goals.fat_g,
      });
    }
  }, [goals]);

  const handleSave = async () => {
    await onSave(form);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-footer-safe">
        <SheetHeader>
          <SheetTitle>Daily Goals</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          {[
            { key: "calories", label: "Calories (kcal)", icon: "🔥" },
            { key: "protein_g", label: "Protein (g)", icon: "🥩" },
            { key: "carbs_g", label: "Carbs (g)", icon: "🌾" },
            { key: "fat_g", label: "Fat (g)", icon: "💧" },
          ].map((field) => (
            <div key={field.key}>
              <Label className="text-xs flex items-center gap-1.5">
                <span>{field.icon}</span>
                {field.label}
              </Label>
              <Input
                type="number"
                value={(form as any)[field.key]}
                onChange={(e) =>
                  setForm({ ...form, [field.key]: Number(e.target.value) || 0 })
                }
                className="mt-1"
              />
            </div>
          ))}
          <Button onClick={handleSave} className="w-full" size="lg">
            Save Goals
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
