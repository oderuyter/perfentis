import { Flame, Trophy, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  milestones: { type: string; value: number; achieved: boolean }[];
}

export const StreakCard = ({ currentStreak, longestStreak, milestones }: StreakCardProps) => {
  const nextStreakMilestone = milestones
    .filter(m => m.type === "streak" && !m.achieved)
    .sort((a, b) => a.value - b.value)[0];

  const recentAchievements = milestones
    .filter(m => m.achieved)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  const getStreakMessage = () => {
    if (currentStreak === 0) return "Start your streak today!";
    if (currentStreak === 1) return "Great start! Keep it going!";
    if (currentStreak < 7) return "Building momentum!";
    if (currentStreak < 14) return "You're on fire! 🔥";
    if (currentStreak < 30) return "Unstoppable!";
    return "Legendary consistency!";
  };

  return (
    <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-4 border border-primary/20">
      {/* Main Streak Display */}
      <div className="flex items-center gap-4 mb-4">
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center",
          currentStreak > 0 
            ? "bg-gradient-to-br from-orange-500 to-red-500" 
            : "bg-muted"
        )}>
          <Flame className={cn(
            "h-7 w-7",
            currentStreak > 0 ? "text-white" : "text-muted-foreground"
          )} />
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">
              {currentStreak}
            </span>
            <span className="text-sm text-muted-foreground">
              day{currentStreak !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{getStreakMessage()}</p>
        </div>
      </div>

      {/* Progress to Next Milestone */}
      {nextStreakMilestone && currentStreak > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Next milestone</span>
            <span>{currentStreak} / {nextStreakMilestone.value} days</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((currentStreak / nextStreakMilestone.value) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="flex items-center gap-4 pt-3 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          <div>
            <p className="text-xs text-muted-foreground">Best Streak</p>
            <p className="text-sm font-semibold text-foreground">{longestStreak} days</p>
          </div>
        </div>

        {recentAchievements.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <Target className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Achievements</p>
              <p className="text-sm font-semibold text-foreground">
                {recentAchievements.length} unlocked
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
