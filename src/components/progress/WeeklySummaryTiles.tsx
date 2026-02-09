import { Dumbbell, Route, Calendar, Award, Timer, TrendingUp, TrendingDown } from "lucide-react";
import { WeeklySummary } from "@/hooks/useProgressData";

interface WeeklySummaryTilesProps {
  summary: WeeklySummary;
}

interface TileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  trend?: number;
}

const Tile = ({ icon, label, value, sub, trend }: TileProps) => (
  <div className="min-w-[140px] snap-start card-glass p-4 rounded-2xl flex flex-col gap-1.5">
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
    </div>
    <p className="text-xl font-bold tracking-tight tabular-nums text-foreground">{value}</p>
    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    {trend !== undefined && trend !== 0 && (
      <div className={`flex items-center gap-1 text-xs font-medium ${trend > 0 ? "text-status-success" : "text-muted-foreground"}`}>
        {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {trend > 0 ? "+" : ""}{trend}%
      </div>
    )}
  </div>
);

export const WeeklySummaryTiles = ({ summary }: WeeklySummaryTilesProps) => {
  const volumeStr =
    summary.volume > 0
      ? summary.volume >= 1000
        ? `${(summary.volume / 1000).toFixed(1)}k kg`
        : `${Math.round(summary.volume)} kg`
      : "—";

  const distanceStr =
    summary.distance > 0
      ? summary.distance >= 1000
        ? `${(summary.distance / 1000).toFixed(1)} km`
        : `${Math.round(summary.distance)} m`
      : "—";

  const sessionsStr = summary.planProgress
    ? `${summary.sessions} (${summary.planProgress})`
    : `${summary.sessions}`;

  const timeStr =
    summary.trainingMinutes > 0
      ? summary.trainingMinutes >= 60
        ? `${Math.floor(summary.trainingMinutes / 60)}h ${Math.round(summary.trainingMinutes % 60)}m`
        : `${Math.round(summary.trainingMinutes)}m`
      : "—";

  const volumeTrend =
    summary.prevVolume > 0
      ? Math.round(((summary.volume - summary.prevVolume) / summary.prevVolume) * 100)
      : 0;

  const distanceTrend =
    summary.prevDistance > 0
      ? Math.round(((summary.distance - summary.prevDistance) / summary.prevDistance) * 100)
      : 0;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none -mx-5 px-5">
      <Tile
        icon={<Dumbbell className="h-4 w-4" />}
        label="Volume"
        value={volumeStr}
        sub="This week"
        trend={volumeTrend}
      />
      <Tile
        icon={<Route className="h-4 w-4" />}
        label="Distance"
        value={distanceStr}
        sub="This week"
        trend={distanceTrend}
      />
      <Tile
        icon={<Calendar className="h-4 w-4" />}
        label="Sessions"
        value={sessionsStr}
        sub="This week"
      />
      <Tile
        icon={<Award className="h-4 w-4" />}
        label="PRs"
        value={`${summary.prs}`}
        sub="This week"
      />
      <Tile
        icon={<Timer className="h-4 w-4" />}
        label="Training"
        value={timeStr}
        sub="This week"
      />
    </div>
  );
};
