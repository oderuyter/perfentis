import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dumbbell,
  Route,
  Salad,
  Camera,
  Clock,
  MapPin,
  Check,
  Plus,
  ImageIcon,
  Heart,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DayDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
}

interface DayWorkout {
  id: string;
  workout_name: string;
  started_at: string;
  duration_seconds: number | null;
  total_volume: number | null;
  modality: string;
  distance_meters: number | null;
  moving_seconds: number | null;
  avg_pace_sec_per_km: number | null;
  elevation_gain_m: number | null;
  elevation_loss_m: number | null;
}

interface DayHabit {
  id: string;
  title: string;
  completed: boolean;
}

interface DayNutrition {
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  meals: { meal_type: string; total_calories: number; entries: { food_name: string; computed_calories: number }[] }[];
}

interface DayPhoto {
  id: string;
  image_url: string;
  note: string | null;
  created_at: string;
}

export const DayDrawer = ({ open, onOpenChange, selectedDate }: DayDrawerProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("workouts");
  const [workouts, setWorkouts] = useState<DayWorkout[]>([]);
  const [habits, setHabits] = useState<DayHabit[]>([]);
  const [nutrition, setNutrition] = useState<DayNutrition | null>(null);
  const [photos, setPhotos] = useState<DayPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({ workouts: 0, runs: 0, habits: 0, food: 0, photos: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";

  const fetchDayData = useCallback(async () => {
    if (!user || !selectedDate) return;
    setLoading(true);

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      const [sessionsRes, habitsAllRes, completionsRes, nutritionRes, photosRes] =
        await Promise.all([
          supabase
            .from("workout_sessions")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "completed")
            .gte("started_at", startOfDay.toISOString())
            .lte("started_at", endOfDay.toISOString())
            .order("started_at", { ascending: false }),
          supabase
            .from("habits")
            .select("id, title")
            .eq("user_id", user.id)
            .eq("is_active", true),
          supabase
            .from("habit_completions")
            .select("habit_id")
            .gte("completed_at", startOfDay.toISOString())
            .lte("completed_at", endOfDay.toISOString()),
          supabase
            .from("nutrition_days")
            .select("id, total_calories, total_protein_g, total_carbs_g, total_fat_g")
            .eq("user_id", user.id)
            .eq("date", dateStr)
            .maybeSingle(),
          supabase
            .from("progress_photos")
            .select("*")
            .eq("user_id", user.id)
            .gte("created_at", startOfDay.toISOString())
            .lte("created_at", endOfDay.toISOString())
            .order("created_at", { ascending: false }),
        ]);

      const allSessions = (sessionsRes.data || []) as DayWorkout[];
      const gymWorkouts = allSessions.filter(
        (w) => w.modality !== "run" && w.modality !== "walk"
      );
      const runs = allSessions.filter(
        (w) => w.modality === "run" || w.modality === "walk"
      );
      setWorkouts(allSessions);

      const completedIds = new Set(
        (completionsRes.data || []).map((c: any) => c.habit_id)
      );
      const dayHabits = (habitsAllRes.data || []).map((h: any) => ({
        ...h,
        completed: completedIds.has(h.id),
      }));
      setHabits(dayHabits);

      // Nutrition
      if (nutritionRes.data && (nutritionRes.data as any).total_calories > 0) {
        const nd = nutritionRes.data as any;
        // Fetch meals for this day
        const { data: mealsData } = await supabase
          .from("nutrition_meals")
          .select("id, meal_type, total_calories")
          .eq("nutrition_day_id", nd.id);

        const meals = [];
        for (const meal of mealsData || []) {
          const { data: entriesData } = await supabase
            .from("nutrition_log_entries")
            .select("food_name, computed_calories")
            .eq("nutrition_meal_id", (meal as any).id);
          meals.push({
            meal_type: (meal as any).meal_type,
            total_calories: (meal as any).total_calories || 0,
            entries: (entriesData || []) as any[],
          });
        }

        setNutrition({
          total_calories: nd.total_calories,
          total_protein_g: nd.total_protein_g,
          total_carbs_g: nd.total_carbs_g,
          total_fat_g: nd.total_fat_g,
          meals: meals.filter((m) => m.total_calories > 0 || m.entries.length > 0),
        });
      } else {
        setNutrition(null);
      }

      setPhotos((photosRes.data || []) as DayPhoto[]);

      setCounts({
        workouts: gymWorkouts.length,
        runs: runs.length,
        habits: dayHabits.filter((h) => h.completed).length,
        food: nutritionRes.data && (nutritionRes.data as any).total_calories > 0 ? 1 : 0,
        photos: (photosRes.data || []).length,
      });
    } catch (err) {
      console.error("Error fetching day data:", err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate, dateStr]);

  useEffect(() => {
    if (open && selectedDate) fetchDayData();
  }, [open, selectedDate, fetchDayData]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("progress-photos")
      .upload(path, file);

    if (uploadError) {
      toast.error("Failed to upload photo");
      return;
    }

    const { data: urlData } = supabase.storage.from("progress-photos").getPublicUrl(path);

    const { error: insertError } = await supabase.from("progress_photos").insert({
      user_id: user.id,
      image_url: urlData.publicUrl,
      created_at: selectedDate?.toISOString() || new Date().toISOString(),
    });

    if (insertError) {
      toast.error("Failed to save photo");
      return;
    }

    toast.success("Photo added");
    fetchDayData();
  };

  const formatDuration = (s: number | null) => {
    if (!s) return "—";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  const formatPace = (secPerKm: number | null) => {
    if (!secPerKm) return "—";
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return `${m}:${s.toString().padStart(2, "0")} /km`;
  };

  const formatVolume = (v: number | null) => {
    if (!v) return "—";
    return v >= 1000 ? `${(v / 1000).toFixed(1)}k kg` : `${Math.round(v)} kg`;
  };

  const formatDistance = (m: number | null) => {
    if (!m) return "—";
    return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
  };

  const gymWorkouts = workouts.filter((w) => w.modality !== "run" && w.modality !== "walk");
  const runs = workouts.filter((w) => w.modality === "run" || w.modality === "walk");

  const tabBadge = (count: number) =>
    count > 0 ? (
      <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
        {count}
      </Badge>
    ) : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle>
            {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Day Details"}
          </DrawerTitle>
        </DrawerHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
          <TabsList className="w-full">
            <TabsTrigger value="workouts" className="flex-1 text-xs">
              <Dumbbell className="h-3.5 w-3.5 mr-1" />
              Gym{tabBadge(counts.workouts)}
            </TabsTrigger>
            <TabsTrigger value="runs" className="flex-1 text-xs">
              <Route className="h-3.5 w-3.5 mr-1" />
              Runs{tabBadge(counts.runs)}
            </TabsTrigger>
            <TabsTrigger value="habits" className="flex-1 text-xs">
              <Check className="h-3.5 w-3.5 mr-1" />
              Habits{tabBadge(counts.habits)}
            </TabsTrigger>
            <TabsTrigger value="food" className="flex-1 text-xs">
              <Salad className="h-3.5 w-3.5 mr-1" />
              Food{tabBadge(counts.food)}
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex-1 text-xs">
              <Camera className="h-3.5 w-3.5 mr-1" />
              Photos{tabBadge(counts.photos)}
            </TabsTrigger>
          </TabsList>

          <div className="mt-3 pb-[env(safe-area-inset-bottom,16px)] max-h-[55vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                {/* Workouts Tab */}
                <TabsContent value="workouts" className="mt-0">
                  {gymWorkouts.length === 0 ? (
                    <EmptyState text="No gym workouts this day" />
                  ) : (
                    <div className="space-y-3">
                      {gymWorkouts.map((w) => (
                        <div key={w.id} className="card-glass p-4 rounded-xl">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-foreground text-sm">{w.workout_name}</h4>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(w.started_at), "h:mm a")}
                            </span>
                          </div>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {formatDuration(w.duration_seconds)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Dumbbell className="h-3 w-3" /> {formatVolume(w.total_volume)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Runs Tab */}
                <TabsContent value="runs" className="mt-0">
                  {runs.length === 0 ? (
                    <EmptyState text="No runs this day" />
                  ) : (
                    <div className="space-y-3">
                      {runs.map((r) => (
                        <div key={r.id} className="card-glass p-4 rounded-xl">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-foreground text-sm capitalize">
                              {r.modality} — {formatDistance(r.distance_meters)}
                            </h4>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(r.started_at), "h:mm a")}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {formatDuration(r.moving_seconds)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Route className="h-3 w-3" /> {formatPace(r.avg_pace_sec_per_km)}
                            </span>
                            {(r.elevation_gain_m ?? 0) > 0 && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> ↑{Math.round(r.elevation_gain_m!)}m ↓{Math.round(r.elevation_loss_m || 0)}m
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Habits Tab */}
                <TabsContent value="habits" className="mt-0">
                  {habits.length === 0 ? (
                    <EmptyState text="No habits tracked" />
                  ) : (
                    <div className="space-y-2">
                      {habits.map((h) => (
                        <div
                          key={h.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl",
                            h.completed ? "card-glass" : "bg-muted/30"
                          )}
                        >
                          <div
                            className={cn(
                              "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                              h.completed ? "bg-primary border-primary" : "border-border"
                            )}
                          >
                            {h.completed && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <span
                            className={cn(
                              "text-sm",
                              h.completed ? "text-foreground" : "text-muted-foreground line-through"
                            )}
                          >
                            {h.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Food Tab */}
                <TabsContent value="food" className="mt-0">
                  {!nutrition ? (
                    <EmptyState text="No food logged this day" />
                  ) : (
                    <div className="space-y-4">
                      {/* Macro summary */}
                      <div className="grid grid-cols-4 gap-2">
                        <MacroTile label="Cals" value={`${Math.round(nutrition.total_calories)}`} />
                        <MacroTile label="Protein" value={`${Math.round(nutrition.total_protein_g)}g`} />
                        <MacroTile label="Carbs" value={`${Math.round(nutrition.total_carbs_g)}g`} />
                        <MacroTile label="Fat" value={`${Math.round(nutrition.total_fat_g)}g`} />
                      </div>
                      {nutrition.meals.map((meal, i) => (
                        <div key={i} className="card-glass p-3 rounded-xl">
                          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 capitalize">
                            {meal.meal_type}
                          </p>
                          {meal.entries.map((e, j) => (
                            <div key={j} className="flex justify-between text-sm py-0.5">
                              <span className="text-foreground">{e.food_name || "Unknown"}</span>
                              <span className="text-muted-foreground tabular-nums">
                                {Math.round(e.computed_calories)} cal
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Photos Tab */}
                <TabsContent value="photos" className="mt-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <div className="mb-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Progress Photo
                    </Button>
                  </div>
                  {photos.length === 0 ? (
                    <EmptyState text="No photos this day" />
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {photos.map((p) => (
                        <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                          <img
                            src={p.image_url}
                            alt={p.note || "Progress photo"}
                            className="w-full h-full object-cover"
                          />
                          {p.note && (
                            <div className="absolute bottom-0 inset-x-0 bg-black/50 px-2 py-1">
                              <p className="text-[10px] text-white truncate">{p.note}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </DrawerContent>
    </Drawer>
  );
};

const EmptyState = ({ text }: { text: string }) => (
  <div className="py-10 text-center">
    <p className="text-sm text-muted-foreground">{text}</p>
  </div>
);

const MacroTile = ({ label, value }: { label: string; value: string }) => (
  <div className="card-glass rounded-xl p-2.5 text-center">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-bold tabular-nums text-foreground">{value}</p>
  </div>
);
