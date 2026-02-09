import { cn } from "@/lib/utils";

interface MacroDialProps {
  label: string;
  consumed: number;
  goal: number;
  unit?: string;
  size?: "sm" | "lg";
  colorVar: string;
  onClick?: () => void;
}

export function MacroDial({
  label,
  consumed,
  goal,
  unit = "",
  size = "sm",
  colorVar,
  onClick,
}: MacroDialProps) {
  const pct = goal > 0 ? Math.min(consumed / goal, 1.5) : 0;
  const remaining = Math.max(goal - consumed, 0);
  const isOver = consumed > goal;

  const dims = size === "lg" ? { r: 44, stroke: 7, box: 104 } : { r: 30, stroke: 5, box: 74 };
  const circumference = 2 * Math.PI * dims.r;
  const dashOffset = circumference * (1 - Math.min(pct, 1));

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-transform active:scale-95",
        onClick && "cursor-pointer"
      )}
    >
      <div className="relative" style={{ width: dims.box, height: dims.box }}>
        <svg
          viewBox={`0 0 ${dims.box} ${dims.box}`}
          className="transform -rotate-90"
          style={{ width: dims.box, height: dims.box }}
        >
          {/* Background track */}
          <circle
            cx={dims.box / 2}
            cy={dims.box / 2}
            r={dims.r}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={dims.stroke}
            className="opacity-40"
          />
          {/* Progress arc */}
          <circle
            cx={dims.box / 2}
            cy={dims.box / 2}
            r={dims.r}
            fill="none"
            stroke={isOver ? "hsl(var(--destructive))" : `hsl(var(${colorVar}))`}
            strokeWidth={dims.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "font-bold tabular-nums leading-none",
              size === "lg" ? "text-xl" : "text-sm"
            )}
          >
            {Math.round(consumed)}
          </span>
          <span
            className={cn(
              "text-muted-foreground leading-none mt-0.5",
              size === "lg" ? "text-[10px]" : "text-[9px]"
            )}
          >
            / {goal}{unit}
          </span>
        </div>
      </div>
      <span className={cn("font-medium", size === "lg" ? "text-xs" : "text-[10px]")}>
        {label}
      </span>
      <span className={cn("text-muted-foreground", size === "lg" ? "text-[10px]" : "text-[8px]")}>
        {remaining > 0 ? `${Math.round(remaining)} left` : "Goal met"}
      </span>
    </button>
  );
}
