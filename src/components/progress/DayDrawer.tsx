import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  ChevronLeft,
  ChevronRight,
  X,
  ArrowLeft,
  Tag,
  Heart,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RunRouteMap } from "@/components/run/RunRouteMap";
import { RunCharts } from "@/components/run/RunCharts";
import { GpsPoint } from "@/types/run";
import { WorkoutDetailSheet } from "@/components/progress/WorkoutDetailSheet";

interface DayDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
}

interface DayWorkout {
  id: string;
  workout_name: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  total_volume: number | null;
  modality: string;
  status: string;
  distance_meters: number | null;
  moving_seconds: number | null;
  avg_pace_sec_per_km: number | null;
  elevation_gain_m: number | null;
  elevation_loss_m: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  min_hr: number | null;
  time_in_zones: Record<string, number> | null;
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
  category: string | null;
  created_at: string;
}

interface RunDetail {
  points: GpsPoint[];
  laps: any[];
}

const PRESET_CATEGORIES = ["Front", "Back", "Right", "Left"];

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

  // Workout detail sheet
  const [selectedWorkout, setSelectedWorkout] = useState<DayWorkout | null>(null);
  const [workoutDetailOpen, setWorkoutDetailOpen] = useState(false);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Category dialog (for upload and re-categorise)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [customLabel, setCustomLabel] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  // Run detail view
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [runDetail, setRunDetail] = useState<RunDetail | null>(null);
  const [runDetailLoading, setRunDetailLoading] = useState(false);

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";

  const fetchCustomCategories = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("progress_photo_categories")
      .select("label")
      .eq("user_id", user.id)
      .order("label");
    setCustomCategories((data || []).map((c: any) => c.label));
  }, [user]);

  useEffect(() => {
    if (open) fetchCustomCategories();
  }, [open, fetchCustomCategories]);

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
      const runsList = allSessions.filter(
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

      if (nutritionRes.data && (nutritionRes.data as any).total_calories > 0) {
        const nd = nutritionRes.data as any;
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

      // Generate signed URLs for private bucket photos
      const rawPhotos = (photosRes.data || []) as any[];
      const photosWithUrls = await Promise.all(
        rawPhotos.map(async (p: any) => {
          let displayUrl = p.image_url;
          // If image_url is a storage path (not a full URL), generate a signed URL
          if (p.image_url && !p.image_url.startsWith('http')) {
            const { data: signedData } = await supabase.storage
              .from('progress-photos')
              .createSignedUrl(p.image_url, 3600); // 1 hour TTL
            if (signedData?.signedUrl) displayUrl = signedData.signedUrl;
          } else if (p.image_url?.includes('/storage/v1/object/public/progress-photos/')) {
            // Legacy public URL – extract path and get signed URL
            const pathMatch = p.image_url.split('/storage/v1/object/public/progress-photos/')[1];
            if (pathMatch) {
              const { data: signedData } = await supabase.storage
                .from('progress-photos')
                .createSignedUrl(decodeURIComponent(pathMatch), 3600);
              if (signedData?.signedUrl) displayUrl = signedData.signedUrl;
            }
          }
          return {
            id: p.id,
            image_url: displayUrl,
            note: p.note,
            category: p.category || null,
            created_at: p.created_at,
          };
        })
      );
      setPhotos(photosWithUrls);

      setCounts({
        workouts: gymWorkouts.length,
        runs: runsList.length,
        habits: dayHabits.filter((h: DayHabit) => h.completed).length,
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
    if (open && selectedDate) {
      fetchDayData();
      setExpandedRunId(null);
      setRunDetail(null);
    }
  }, [open, selectedDate, fetchDayData]);

  // Fetch run route detail
  const fetchRunDetail = useCallback(async (sessionId: string) => {
    setRunDetailLoading(true);
    try {
      const { data: routePoints } = await supabase
        .from("activity_route_points")
        .select("lat, lng, altitude_m, speed_mps, accuracy_m, timestamp")
        .eq("session_id", sessionId)
        .order("idx", { ascending: true });

      const { data: laps } = await supabase
        .from("activity_laps")
        .select("*")
        .eq("session_id", sessionId)
        .order("lap_number", { ascending: true });

      const points: GpsPoint[] = (routePoints || []).map((rp: any) => ({
        lat: rp.lat,
        lng: rp.lng,
        timestamp: new Date(rp.timestamp).getTime(),
        accuracy: rp.accuracy_m || 10,
        altitude: rp.altitude_m,
        speed: rp.speed_mps,
      }));

      setRunDetail({ points, laps: laps || [] });
    } catch (err) {
      console.error("Error fetching run detail:", err);
    } finally {
      setRunDetailLoading(false);
    }
  }, []);

  const handleExpandRun = (sessionId: string) => {
    setExpandedRunId(sessionId);
    fetchRunDetail(sessionId);
  };

  // File selected → open category dialog
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setEditingPhotoId(null);
    setSelectedCategory("");
    setCustomLabel("");
    setCategoryDialogOpen(true);
    e.target.value = "";
  };

  // Open category dialog for existing photo
  const handleRecategorise = (photo: DayPhoto) => {
    setPendingFile(null);
    setEditingPhotoId(photo.id);
    setSelectedCategory(photo.category || "");
    setCustomLabel("");
    setCategoryDialogOpen(true);
  };

  const handleConfirmCategoryAction = async () => {
    if (!user) return;

    let finalCategory = selectedCategory;
    if (selectedCategory === "__custom" && customLabel.trim()) {
      finalCategory = customLabel.trim();
      await supabase
        .from("progress_photo_categories")
        .upsert({ user_id: user.id, label: finalCategory } as any, { onConflict: "user_id,label" });
      fetchCustomCategories();
    }

    // Re-categorise existing photo
    if (editingPhotoId) {
      const { error } = await supabase
        .from("progress_photos")
        .update({ category: finalCategory || null } as any)
        .eq("id", editingPhotoId);
      if (error) {
        toast.error("Failed to update category");
      } else {
        toast.success("Category updated");
        fetchDayData();
      }
      setCategoryDialogOpen(false);
      setEditingPhotoId(null);
      return;
    }

    // Upload new photo
    if (!pendingFile) return;

    const ext = pendingFile.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("progress-photos")
      .upload(path, pendingFile);

    if (uploadError) {
      toast.error("Failed to upload photo");
      return;
    }

    // Store the storage path (not a public URL) since bucket is now private
    const { error: insertError } = await supabase.from("progress_photos").insert({
      user_id: user.id,
      image_url: path,
      category: finalCategory || null,
      created_at: selectedDate?.toISOString() || new Date().toISOString(),
    } as any);

    if (insertError) {
      toast.error("Failed to save photo");
      return;
    }

    toast.success("Photo added");
    setCategoryDialogOpen(false);
    setPendingFile(null);
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

  const allCategories = [...PRESET_CATEGORIES, ...customCategories.filter(c => !PRESET_CATEGORIES.includes(c))];

  const expandedRun = expandedRunId ? runs.find(r => r.id === expandedRunId) : null;

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[66vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle>
              {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Day Details"}
            </DrawerTitle>
          </DrawerHeader>

          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setExpandedRunId(null); }} className="px-4 flex flex-col flex-1 min-h-0">
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

            <div className="mt-3 pb-[env(safe-area-inset-bottom,16px)] flex-1 overflow-y-auto">
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
                          <button
                            key={w.id}
                            className="card-glass p-4 rounded-xl w-full text-left active:scale-[0.98] transition-transform"
                            onClick={() => { setSelectedWorkout(w); setWorkoutDetailOpen(true); }}
                          >
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
                              {w.avg_hr && (
                                <span className="flex items-center gap-1">
                                  <Heart className="h-3 w-3 text-red-500" /> {w.avg_hr} bpm
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Runs Tab */}
                  <TabsContent value="runs" className="mt-0">
                    {expandedRunId && expandedRun ? (
                      /* Expanded run detail view */
                      <div className="space-y-4">
                        <button
                          onClick={() => { setExpandedRunId(null); setRunDetail(null); }}
                          className="flex items-center gap-1 text-sm text-primary"
                        >
                          <ArrowLeft className="h-4 w-4" /> Back to runs
                        </button>

                        {/* Run header */}
                        <div className="card-glass p-4 rounded-xl">
                          <h4 className="font-semibold text-foreground text-sm capitalize mb-2">
                            {expandedRun.modality} — {formatDistance(expandedRun.distance_meters)}
                          </h4>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-muted-foreground">Moving Time</span>
                              <p className="font-semibold text-foreground">{formatDuration(expandedRun.moving_seconds)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Avg Pace</span>
                              <p className="font-semibold text-foreground">{formatPace(expandedRun.avg_pace_sec_per_km)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Elevation ↑</span>
                              <p className="font-semibold text-foreground">{expandedRun.elevation_gain_m ? `${Math.round(expandedRun.elevation_gain_m)}m` : "—"}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Elevation ↓</span>
                              <p className="font-semibold text-foreground">{expandedRun.elevation_loss_m ? `${Math.round(expandedRun.elevation_loss_m)}m` : "—"}</p>
                            </div>
                          </div>
                        </div>

                        {runDetailLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                          </div>
                        ) : runDetail ? (
                          <>
                            {/* Route Map */}
                            {runDetail.points.length > 1 && (
                              <div className="rounded-xl overflow-hidden h-48">
                                <RunRouteMap points={runDetail.points} />
                              </div>
                            )}

                            {/* Charts */}
                            {runDetail.points.length > 2 && (
                              <RunCharts points={runDetail.points} />
                            )}

                            {/* Splits / Laps */}
                            {runDetail.laps.length > 0 && (
                              <div className="card-glass p-4 rounded-xl">
                                <p className="text-xs font-semibold text-muted-foreground mb-2">LAPS</p>
                                <div className="space-y-1">
                                  {runDetail.laps.map((lap: any) => (
                                    <div key={lap.id} className="flex justify-between text-xs py-1 border-b border-border/20 last:border-0">
                                      <span className="text-foreground">Lap {lap.lap_number}</span>
                                      <span className="text-muted-foreground tabular-nums">
                                        {lap.distance_meters_at_mark ? formatDistance(lap.distance_meters_at_mark) : "—"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {runDetail.points.length <= 1 && (
                              <EmptyState text="No route data recorded for this run" />
                            )}
                          </>
                        ) : null}
                      </div>
                    ) : runs.length === 0 ? (
                      <EmptyState text="No runs this day" />
                    ) : (
                      <div className="space-y-3">
                        {runs.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => handleExpandRun(r.id)}
                            className="w-full text-left card-glass p-4 rounded-xl hover:ring-1 hover:ring-primary/30 transition-all"
                          >
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
                            <p className="text-[10px] text-primary mt-2">Tap for map & details →</p>
                          </button>
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
                      onChange={handleFileSelected}
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
                        {photos.map((p, idx) => (
                          <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden bg-muted group">
                            <button
                              onClick={() => {
                                setLightboxIndex(idx);
                                setLightboxOpen(true);
                              }}
                              className="w-full h-full"
                            >
                              <img
                                src={p.image_url}
                                alt={p.category || p.note || "Progress photo"}
                                className="w-full h-full object-cover"
                              />
                            </button>
                            {p.category && (
                              <div className="absolute top-1.5 left-1.5 pointer-events-none">
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 bg-black/60 text-white border-0">
                                  {p.category}
                                </Badge>
                              </div>
                            )}
                            {/* Re-categorise button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRecategorise(p); }}
                              className="absolute bottom-1.5 right-1.5 bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Tag className="h-3 w-3" />
                            </button>
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

      {/* Lightbox */}
      {lightboxOpen && photos.length > 0 && (
        <div
          className="fixed inset-0 z-[300] bg-black flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 text-white/80 hover:text-white p-2"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm tabular-nums">
            {lightboxIndex + 1} / {photos.length}
          </div>

          {photos[lightboxIndex]?.category && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2">
              <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                {photos[lightboxIndex].category}
              </Badge>
            </div>
          )}

          <img
            src={photos[lightboxIndex]?.image_url}
            alt="Progress photo"
            className="max-h-[85vh] max-w-[95vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Re-categorise in lightbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRecategorise(photos[lightboxIndex]);
            }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/20 text-white rounded-full px-4 py-2 text-xs flex items-center gap-1.5 hover:bg-white/30"
          >
            <Tag className="h-3.5 w-3.5" /> {photos[lightboxIndex]?.category || "Categorise"}
          </button>

          {photos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i === 0 ? photos.length - 1 : i - 1));
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {photos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i === photos.length - 1 ? 0 : i + 1));
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}
        </div>
      )}

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-sm z-[400]">
          <DialogHeader>
            <DialogTitle>{editingPhotoId ? "Update Category" : "Categorise Photo"}</DialogTitle>
            <DialogDescription>
              {editingPhotoId ? "Choose a new category for this photo." : "Select a category before uploading."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {allCategories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCustomLabel("");
                  }}
                  className="text-xs"
                >
                  {cat}
                </Button>
              ))}
              <Button
                variant={selectedCategory === "__custom" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("__custom")}
                className="text-xs"
              >
                Custom…
              </Button>
            </div>
            {selectedCategory === "__custom" && (
              <Input
                placeholder="Custom label"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                autoFocus
              />
            )}
            <div className="flex gap-2">
              {!editingPhotoId && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedCategory("");
                    handleConfirmCategoryAction();
                  }}
                >
                  Skip
                </Button>
              )}
              <Button
                className="flex-1"
                onClick={handleConfirmCategoryAction}
                disabled={selectedCategory === "__custom" && !customLabel.trim()}
              >
                {editingPhotoId ? "Save" : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Workout Detail Sheet */}
      <WorkoutDetailSheet
        open={workoutDetailOpen}
        onOpenChange={setWorkoutDetailOpen}
        workout={selectedWorkout}
        onBack={() => setWorkoutDetailOpen(false)}
      />
    </>
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
