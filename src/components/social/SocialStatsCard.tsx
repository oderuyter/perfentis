import { Trophy, Timer, Dumbbell, Footprints, TrendingUp } from "lucide-react";

interface WorkoutStats {
  workout_name?: string;
  date?: string;
  duration_seconds?: number;
  total_volume_kg?: number;
  top_exercises?: string[];
  distance_km?: number;
  avg_pace_min_km?: number;
  elevation_gain_m?: number;
  session_type?: "strength" | "run" | "cardio" | "general";
  is_pr?: boolean;
}

interface SocialStatsCardProps {
  data: WorkoutStats;
  compact?: boolean;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatPace(minPerKm: number): string {
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

export function SocialStatsCard({ data, compact = false }: SocialStatsCardProps) {
  const isRun = data.session_type === "run" || !!data.distance_km;

  return (
    <div className="rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 border border-primary/20 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-2 right-2 w-20 h-20 rounded-full bg-primary" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-primary/50" />
      </div>

      {/* PR Badge */}
      {data.is_pr && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/40 text-yellow-600 dark:text-yellow-400 rounded-full px-2 py-0.5 text-xs font-bold">
          <Trophy className="h-3 w-3" />
          PR
        </div>
      )}

      <div className="relative">
        {/* Workout name */}
        <p className="font-bold text-sm text-foreground truncate pr-12">
          {data.workout_name || "Workout Complete"}
        </p>
        {data.date && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(data.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
          </p>
        )}

        {/* Stats grid */}
        <div className={`grid mt-3 gap-2 ${compact ? "grid-cols-2" : "grid-cols-3"}`}>
          {data.duration_seconds && (
            <div className="flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-sm font-semibold">{formatDuration(data.duration_seconds)}</p>
              </div>
            </div>
          )}

          {isRun && data.distance_km && (
            <div className="flex items-center gap-1.5">
              <Footprints className="h-3.5 w-3.5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Distance</p>
                <p className="text-sm font-semibold">{data.distance_km.toFixed(2)} km</p>
              </div>
            </div>
          )}

          {isRun && data.avg_pace_min_km && (
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Avg Pace</p>
                <p className="text-sm font-semibold">{formatPace(data.avg_pace_min_km)}</p>
              </div>
            </div>
          )}

          {!isRun && data.total_volume_kg && (
            <div className="flex items-center gap-1.5">
              <Dumbbell className="h-3.5 w-3.5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Volume</p>
                <p className="text-sm font-semibold">{Math.round(data.total_volume_kg).toLocaleString()} kg</p>
              </div>
            </div>
          )}

          {isRun && data.elevation_gain_m && (
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Elevation</p>
                <p className="text-sm font-semibold">+{Math.round(data.elevation_gain_m)}m</p>
              </div>
            </div>
          )}
        </div>

        {/* Top exercises (strength) */}
        {!isRun && !compact && data.top_exercises && data.top_exercises.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {data.top_exercises.slice(0, 3).map((ex) => (
              <span key={ex} className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 border border-primary/20">
                {ex}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
