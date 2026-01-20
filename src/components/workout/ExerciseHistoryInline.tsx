import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { useExerciseHistory } from "@/hooks/useExerciseHistory";
import { usePersonalRecords } from "@/hooks/usePersonalRecords";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ExerciseHistoryInlineProps {
  exerciseId: string;
  className?: string;
  compact?: boolean;
}

export function ExerciseHistoryInline({ 
  exerciseId, 
  className,
  compact = false 
}: ExerciseHistoryInlineProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { history, stats, isLoading } = useExerciseHistory(exerciseId);
  const { getExercisePR } = usePersonalRecords();
  const [prData, setPRData] = useState<{ value: number } | null>(null);

  // Load PR data
  useState(() => {
    getExercisePR(exerciseId).then(setPRData);
  });

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Skeleton className="h-5 w-16" />
      </div>
    );
  }

  if (!history.length) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <History className="h-3.5 w-3.5" />
        <span>No history</span>
      </div>
    );
  }

  const lastSession = history[0];
  const lastBestSet = lastSession?.best_set as { weight: number; reps: number } | undefined;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {lastBestSet && (
          <span className="text-xs text-muted-foreground">
            Last: {lastBestSet.weight}kg × {lastBestSet.reps}
          </span>
        )}
        {prData && (
          <Badge variant="outline" className="text-[10px] py-0 px-1 gap-1 border-gold/30 text-gold">
            <Trophy className="h-2.5 w-2.5" />
            {prData.value}kg
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg bg-muted/30 overflow-hidden", className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-sm hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">History</span>
          {lastBestSet && (
            <span className="text-muted-foreground">
              Last: {lastBestSet.weight}kg × {lastBestSet.reps}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {prData && (
            <Badge variant="outline" className="text-xs gap-1 border-gold/30 text-gold">
              <Trophy className="h-3 w-3" />
              PR: {prData.value}kg
            </Badge>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border/30"
          >
            <div className="p-3 space-y-2">
              {/* Stats summary */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-lg font-semibold">{stats.totalSessions}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Sessions</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-lg font-semibold">{stats.totalSets}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Sets</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-lg font-semibold">{stats.bestWeight || 0}kg</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Best</p>
                </div>
              </div>

              {/* Recent sessions */}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium uppercase">
                  Last {Math.min(5, history.length)} Sessions
                </p>
                {history.slice(0, 5).map((session, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-border/20 last:border-0"
                  >
                    <span className="text-muted-foreground">
                      {new Date(session.workout_date).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      {session.best_set && (
                        <span>
                          {session.best_set.weight}kg × {session.best_set.reps}
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {session.sets.length} sets
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
