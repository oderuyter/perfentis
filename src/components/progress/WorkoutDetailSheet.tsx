import { useEffect, useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Clock, Dumbbell, ArrowLeft, Heart, Activity, Timer, Zap, Users, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
} from "recharts";

/* ─── types ─── */

interface WorkoutSession {
  id: string;
  workout_name: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  total_volume: number | null;
  status: string;
  avg_hr?: number | null;
  max_hr?: number | null;
  min_hr?: number | null;
  time_in_zones?: Record<string, number> | null;
}

interface SetLog {
  id: string;
  set_number: number;
  target_weight: number | null;
  target_reps: number | null;
  completed_weight: number | null;
  completed_reps: number | null;
  is_completed: boolean | null;
  rpe: number | null;
  // Cardio fields
  duration_seconds?: number | null;
  distance_meters?: number | null;
  pace_seconds_per_km?: number | null;
  speed_kmh?: number | null;
  calories?: number | null;
}

interface ExerciseLog {
  id: string;
  exercise_name: string;
  exercise_order: number;
  notes: string | null;
  exercise_type?: string | null;
  sets: SetLog[];
}

interface HRChartPoint {
  time: number; // seconds since start
  bpm: number;
}

interface WorkoutDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout: WorkoutSession | null;
  onBack: () => void;
}

/* ─── constants ─── */

const ZONE_COLORS = ["#3b82f6", "#22c55e", "#eab308", "#f97316", "#ef4444"];
const ZONE_LABELS = ["Recovery", "Aerobic", "Tempo", "Threshold", "Max"];

/* ─── helpers ─── */

function formatZoneTime(seconds: number): string {
  if (!seconds || seconds < 1) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}

function formatVolume(volume: number | null) {
  if (!volume) return "—";
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}k kg`;
  return `${volume.toFixed(0)} kg`;
}

function formatCardioTime(seconds: number | null) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatPace(secPerKm: number | null) {
  if (!secPerKm) return null;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

function formatChartTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  return `${m}m`;
}

/* ─── component ─── */

export const WorkoutDetailSheet = ({
  open,
  onOpenChange,
  workout,
  onBack,
}: WorkoutDetailSheetProps) => {
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [hrPoints, setHrPoints] = useState<HRChartPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (workout && open) {
      fetchAll();
    }
  }, [workout, open]);

  const fetchAll = async () => {
    if (!workout) return;
    setLoading(true);
    try {
      await Promise.all([fetchExerciseDetails(), fetchHRSamples()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchExerciseDetails = async () => {
    if (!workout) return;
    const { data: exerciseLogs, error: exerciseError } = await supabase
      .from("exercise_logs")
      .select("*")
      .eq("session_id", workout.id)
      .order("exercise_order", { ascending: true });

    if (exerciseError) { console.error(exerciseError); return; }

    const exercisesWithSets: ExerciseLog[] = await Promise.all(
      (exerciseLogs || []).map(async (exercise: any) => {
        const { data: setLogs } = await supabase
          .from("set_logs")
          .select("*")
          .eq("exercise_log_id", exercise.id)
          .order("set_number", { ascending: true });
        return { ...exercise, sets: setLogs || [] };
      })
    );
    setExercises(exercisesWithSets);
  };

  const fetchHRSamples = async () => {
    if (!workout) return;
    // Fetch HR samples, limit to 2000 and we'll downsample client-side
    const { data, error } = await supabase
      .from("hr_samples")
      .select("timestamp, bpm")
      .eq("session_id", workout.id)
      .order("timestamp", { ascending: true })
      .limit(2000);

    if (error || !data || data.length === 0) {
      setHrPoints([]);
      return;
    }

    const startTime = new Date(workout.started_at).getTime();
    const raw = data.map((s: any) => ({
      time: Math.round((new Date(s.timestamp).getTime() - startTime) / 1000),
      bpm: s.bpm,
    }));

    // Downsample to ~200 points for smooth chart
    if (raw.length > 200) {
      const step = Math.ceil(raw.length / 200);
      const downsampled = raw.filter((_: any, i: number) => i % step === 0);
      setHrPoints(downsampled);
    } else {
      setHrPoints(raw);
    }
  };

  // HR summary values from workout or computed from samples
  const hrSummary = useMemo(() => {
    const avg = workout?.avg_hr;
    const max = workout?.max_hr;
    const min = workout?.min_hr;
    if (avg || max || min) return { avg, max, min };
    if (hrPoints.length === 0) return null;
    const bpms = hrPoints.map(p => p.bpm);
    return {
      avg: Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length),
      max: Math.max(...bpms),
      min: Math.min(...bpms),
    };
  }, [workout, hrPoints]);

  const timeInZones = useMemo(() => {
    if (!workout?.time_in_zones) return null;
    const zones = workout.time_in_zones as Record<string, number>;
    const total = Object.values(zones).reduce((a, b) => a + (b || 0), 0);
    if (total === 0) return null;
    return { zones, total };
  }, [workout]);

  const hasHR = hrPoints.length > 0 || hrSummary !== null || timeInZones !== null;

  const isCardioExercise = (ex: ExerciseLog) => {
    if (ex.exercise_type === "cardio") return true;
    // Infer from sets: if sets have duration/distance but no weight
    return ex.sets.some(s =>
      (s.duration_seconds || s.distance_meters) && !s.completed_weight && !s.target_weight
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 -ml-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <SheetTitle className="text-lg flex-1 truncate">
              {workout?.workout_name || "Workout Details"}
            </SheetTitle>
          </div>
        </SheetHeader>

        {workout && (
          <ScrollArea className="h-[calc(90vh-80px)]">
            <div className="space-y-5 pr-4 pb-8">
              {/* Summary Bar */}
              <div className="flex flex-wrap items-center gap-3 py-3 border-b border-border/50">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(workout.duration_seconds)}</span>
                </div>
                {workout.total_volume && workout.total_volume > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Dumbbell className="h-4 w-4" />
                    <span>{formatVolume(workout.total_volume)}</span>
                  </div>
                )}
                {hrSummary && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span>Avg {hrSummary.avg} bpm</span>
                  </div>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {format(new Date(workout.started_at), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>

              {/* ── Heart Rate Section ── */}
              {hasHR && (
                <section className="space-y-4">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5 text-red-500" /> Heart Rate
                  </h3>

                  {/* Min / Avg / Max tiles */}
                  {hrSummary && (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Min", value: hrSummary.min },
                        { label: "Avg", value: hrSummary.avg },
                        { label: "Max", value: hrSummary.max },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-muted/30 rounded-xl p-3 text-center border border-border/30">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="text-xl font-bold tabular-nums">
                            {value ?? "—"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">bpm</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* HR Line Chart */}
                  {hrPoints.length > 0 && (
                    <div className="bg-muted/20 rounded-xl p-3 border border-border/30">
                      <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={hrPoints} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                          <XAxis
                            dataKey="time"
                            tickFormatter={formatChartTime}
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={false}
                            tickLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            domain={["dataMin - 10", "dataMax + 10"]}
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={false}
                            tickLine={false}
                            width={36}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.[0]) return null;
                              const p = payload[0].payload as HRChartPoint;
                              return (
                                <div className="bg-card border border-border rounded-lg px-2 py-1 text-xs shadow-md">
                                  <span className="font-medium">{p.bpm} bpm</span>
                                  <span className="text-muted-foreground ml-1.5">{formatChartTime(p.time)}</span>
                                </div>
                              );
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="bpm"
                            stroke="#ef4444"
                            strokeWidth={1.5}
                            dot={false}
                            activeDot={{ r: 3, fill: "#ef4444" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Time in Zones */}
                  {timeInZones && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Time in Zones</p>
                      {[1, 2, 3, 4, 5].map(z => {
                        const t = timeInZones.zones[z] || timeInZones.zones[String(z)] || 0;
                        const pct = timeInZones.total > 0 ? (t / timeInZones.total) * 100 : 0;
                        return (
                          <div key={z} className="flex items-center gap-2">
                            <span className="text-xs w-14 text-muted-foreground">
                              Z{z} <span className="hidden sm:inline text-[10px]">{ZONE_LABELS[z - 1]}</span>
                            </span>
                            <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: ZONE_COLORS[z - 1] }}
                              />
                            </div>
                            <span className="text-xs tabular-nums w-10 text-right">
                              {formatZoneTime(t)}
                            </span>
                            <span className="text-[10px] tabular-nums w-8 text-right text-muted-foreground">
                              {pct > 0 ? `${Math.round(pct)}%` : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* ── Exercises ── */}
              <section>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Exercises ({exercises.length})
                </h3>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : exercises.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No exercises logged</p>
                ) : (
                  <div className="space-y-3">
                    {exercises.map((exercise, index) => {
                      const cardio = isCardioExercise(exercise);
                      return (
                        <div
                          key={exercise.id}
                          className="bg-muted/30 rounded-xl p-4 border border-border/30"
                        >
                          {/* Exercise header */}
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              {index + 1}
                            </span>
                            <h4 className="font-semibold text-foreground text-sm flex-1">{exercise.exercise_name}</h4>
                            {cardio && (
                              <span className="text-[10px] bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded">
                                Cardio
                              </span>
                            )}
                          </div>

                          {exercise.notes && (
                            <p className="text-sm text-muted-foreground mb-3 italic">{exercise.notes}</p>
                          )}

                          {/* Sets */}
                          <div className="space-y-1.5">
                            {cardio ? (
                              /* Cardio sets */
                              <>
                                <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground font-medium px-2">
                                  <span>Set</span>
                                  <span className="text-center">Time</span>
                                  <span className="text-center">Distance</span>
                                  <span className="text-center">Pace</span>
                                </div>
                                {exercise.sets.map(set => (
                                  <div
                                    key={set.id}
                                    className={cn(
                                      "grid grid-cols-4 gap-2 text-sm py-2 px-2 rounded-lg",
                                      set.is_completed ? "bg-primary/5" : "bg-muted/50 opacity-60"
                                    )}
                                  >
                                    <span className="font-medium text-foreground">{set.set_number}</span>
                                    <span className="text-center text-foreground">
                                      {formatCardioTime(set.duration_seconds ?? null)}
                                    </span>
                                    <span className="text-center text-foreground">
                                      {set.distance_meters
                                        ? set.distance_meters >= 1000
                                          ? `${(set.distance_meters / 1000).toFixed(2)} km`
                                          : `${set.distance_meters} m`
                                        : "—"}
                                    </span>
                                    <span className="text-center text-muted-foreground">
                                      {formatPace(set.pace_seconds_per_km ?? null) || "—"}
                                    </span>
                                  </div>
                                ))}
                              </>
                            ) : (
                              /* Strength sets */
                              <>
                                <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground font-medium px-2">
                                  <span>Set</span>
                                  <span className="text-center">Weight</span>
                                  <span className="text-center">Reps</span>
                                  <span className="text-center">RPE</span>
                                </div>
                                {exercise.sets.map(set => (
                                  <div
                                    key={set.id}
                                    className={cn(
                                      "grid grid-cols-4 gap-2 text-sm py-2 px-2 rounded-lg",
                                      set.is_completed ? "bg-primary/5" : "bg-muted/50 opacity-60"
                                    )}
                                  >
                                    <span className="font-medium text-foreground">{set.set_number}</span>
                                    <span className="text-center text-foreground">
                                      {set.completed_weight ?? set.target_weight ?? "—"} kg
                                    </span>
                                    <span className="text-center text-foreground">
                                      {set.completed_reps ?? set.target_reps ?? "—"}
                                    </span>
                                    <span className="text-center text-muted-foreground">
                                      {set.rpe ? `@${set.rpe}` : "—"}
                                    </span>
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
};
