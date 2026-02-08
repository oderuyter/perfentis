import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { format, addDays, subDays } from "date-fns";

export type MealType = "breakfast" | "lunch" | "dinner" | "snacks";

export interface NutritionGoals {
  id: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  name: string;
  is_default: boolean;
}

export interface NutritionDay {
  id: string;
  date: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  goal_profile_id: string | null;
}

export interface NutritionMeal {
  id: string;
  nutrition_day_id: string;
  meal_type: MealType;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
}

export interface NutritionEntry {
  id: string;
  nutrition_meal_id: string;
  entry_type: "food" | "meal_template";
  food_id: string | null;
  meal_template_id: string | null;
  food_name: string | null;
  quantity_grams: number;
  servings: number;
  computed_calories: number;
  computed_protein_g: number;
  computed_carbs_g: number;
  computed_fat_g: number;
  created_at: string;
}

export interface Food {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  serving_size_g: number;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  source: string;
  is_approved: boolean;
}

export function useNutrition() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [day, setDay] = useState<NutritionDay | null>(null);
  const [meals, setMeals] = useState<NutritionMeal[]>([]);
  const [entries, setEntries] = useState<Record<string, NutritionEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [weekData, setWeekData] = useState<NutritionDay[]>([]);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  // Fetch goals
  const fetchGoals = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("nutrition_goal_profiles")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .maybeSingle();

    if (data) {
      setGoals(data as unknown as NutritionGoals);
    } else {
      // Create default goals
      const { data: newGoal } = await supabase
        .from("nutrition_goal_profiles")
        .insert({
          user_id: user.id,
          name: "Default",
          calories: 2000,
          protein_g: 150,
          carbs_g: 250,
          fat_g: 65,
          is_default: true,
        })
        .select()
        .single();
      if (newGoal) setGoals(newGoal as unknown as NutritionGoals);
    }
  }, [user]);

  // Fetch or create day
  const fetchDay = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Try to get existing day
    let { data: dayData } = await supabase
      .from("nutrition_days")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", dateStr)
      .maybeSingle();

    if (!dayData) {
      // Create the day
      const { data: newDay } = await supabase
        .from("nutrition_days")
        .insert({
          user_id: user.id,
          date: dateStr,
          goal_profile_id: goals?.id || null,
        })
        .select()
        .single();
      dayData = newDay;
    }

    if (dayData) {
      setDay(dayData as unknown as NutritionDay);

      // Fetch meals
      const { data: mealData } = await supabase
        .from("nutrition_meals")
        .select("*")
        .eq("nutrition_day_id", dayData.id);

      const existingMeals = (mealData || []) as unknown as NutritionMeal[];
      
      // Ensure all 4 meal types exist
      const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snacks"];
      const missingTypes = mealTypes.filter(
        (t) => !existingMeals.some((m) => m.meal_type === t)
      );

      if (missingTypes.length > 0) {
        const { data: newMeals } = await supabase
          .from("nutrition_meals")
          .insert(
            missingTypes.map((t) => ({
              nutrition_day_id: dayData!.id,
              meal_type: t,
            }))
          )
          .select();
        if (newMeals) {
          existingMeals.push(...(newMeals as unknown as NutritionMeal[]));
        }
      }

      setMeals(existingMeals);

      // Fetch entries for all meals
      const mealIds = existingMeals.map((m) => m.id);
      if (mealIds.length > 0) {
        const { data: entryData } = await supabase
          .from("nutrition_log_entries")
          .select("*")
          .in("nutrition_meal_id", mealIds)
          .order("created_at", { ascending: true });

        const grouped: Record<string, NutritionEntry[]> = {};
        (entryData || []).forEach((e: any) => {
          if (!grouped[e.nutrition_meal_id]) grouped[e.nutrition_meal_id] = [];
          grouped[e.nutrition_meal_id].push(e as NutritionEntry);
        });
        setEntries(grouped);
      } else {
        setEntries({});
      }
    }

    setLoading(false);
  }, [user, dateStr, goals?.id]);

  // Fetch week data for the 7-day strip
  const fetchWeekData = useCallback(async () => {
    if (!user) return;
    const startDate = format(subDays(selectedDate, 3), "yyyy-MM-dd");
    const endDate = format(addDays(selectedDate, 3), "yyyy-MM-dd");

    const { data } = await supabase
      .from("nutrition_days")
      .select("id, date, total_calories, total_protein_g, total_carbs_g, total_fat_g")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate);

    setWeekData((data || []) as unknown as NutritionDay[]);
  }, [user, selectedDate]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  useEffect(() => {
    if (goals) fetchDay();
  }, [fetchDay, goals]);

  useEffect(() => {
    fetchWeekData();
  }, [fetchWeekData]);

  // Add food entry
  const addEntry = useCallback(
    async (
      mealId: string,
      food: Food,
      quantityGrams: number = 100,
      servings: number = 1
    ) => {
      const factor = quantityGrams / 100;
      const computed = {
        computed_calories: Number((food.calories_per_100g * factor).toFixed(2)),
        computed_protein_g: Number((food.protein_per_100g * factor).toFixed(2)),
        computed_carbs_g: Number((food.carbs_per_100g * factor).toFixed(2)),
        computed_fat_g: Number((food.fat_per_100g * factor).toFixed(2)),
      };

      const { error } = await supabase.from("nutrition_log_entries").insert({
        nutrition_meal_id: mealId,
        entry_type: "food",
        food_id: food.id,
        food_name: food.name,
        quantity_grams: quantityGrams,
        servings,
        ...computed,
      });

      if (error) {
        toast.error("Failed to add entry");
        return false;
      }

      toast.success("Added to log");
      await fetchDay();
      await fetchWeekData();
      return true;
    },
    [fetchDay, fetchWeekData]
  );

  // Add manual entry (no food_id)
  const addManualEntry = useCallback(
    async (
      mealId: string,
      name: string,
      calories: number,
      protein: number,
      carbs: number,
      fat: number
    ) => {
      const { error } = await supabase.from("nutrition_log_entries").insert({
        nutrition_meal_id: mealId,
        entry_type: "food",
        food_name: name,
        quantity_grams: 100,
        servings: 1,
        computed_calories: calories,
        computed_protein_g: protein,
        computed_carbs_g: carbs,
        computed_fat_g: fat,
      });

      if (error) {
        toast.error("Failed to add entry");
        return false;
      }

      toast.success("Added to log");
      await fetchDay();
      await fetchWeekData();
      return true;
    },
    [fetchDay, fetchWeekData]
  );

  // Delete entry
  const deleteEntry = useCallback(
    async (entryId: string) => {
      const { error } = await supabase
        .from("nutrition_log_entries")
        .delete()
        .eq("id", entryId);

      if (error) {
        toast.error("Failed to delete");
        return;
      }
      await fetchDay();
      await fetchWeekData();
    },
    [fetchDay, fetchWeekData]
  );

  // Update goals
  const updateGoals = useCallback(
    async (newGoals: Partial<NutritionGoals>) => {
      if (!goals) return;
      const { error } = await supabase
        .from("nutrition_goal_profiles")
        .update(newGoals)
        .eq("id", goals.id);

      if (error) {
        toast.error("Failed to update goals");
        return;
      }

      toast.success("Goals updated");
      await fetchGoals();
    },
    [goals, fetchGoals]
  );

  // Search foods
  const searchFoods = useCallback(async (query: string): Promise<Food[]> => {
    if (!query.trim()) return [];
    const { data } = await supabase
      .from("foods")
      .select("*")
      .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
      .limit(20);

    return (data || []) as unknown as Food[];
  }, []);

  const goToDate = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const prevDay = useCallback(() => {
    setSelectedDate((d) => subDays(d, 1));
  }, []);

  const nextDay = useCallback(() => {
    setSelectedDate((d) => addDays(d, 1));
  }, []);

  const getMealByType = useCallback(
    (type: MealType) => meals.find((m) => m.meal_type === type),
    [meals]
  );

  const getEntriesForMeal = useCallback(
    (mealId: string) => entries[mealId] || [],
    [entries]
  );

  return {
    selectedDate,
    dateStr,
    goals,
    day,
    meals,
    entries,
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
    refetch: fetchDay,
  };
}
