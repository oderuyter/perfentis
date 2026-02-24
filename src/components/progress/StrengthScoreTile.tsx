import { useState } from 'react';
import { Shield, Lock, Scale, ChevronRight } from 'lucide-react';
import { useStrengthScore, type StrengthRange } from '@/hooks/useStrengthScore';
import { StrengthScoreDrawer } from './StrengthScoreDrawer';

export function StrengthScoreTile() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [range, setRange] = useState<StrengthRange>('3m');
  const { result, isLoading } = useStrengthScore(range);

  if (isLoading) return null;

  // Missing bodyweight
  if (result.missingBodyweight) {
    return (
      <div className="card-glass rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <Scale className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Strength Score</p>
            <p className="text-sm text-muted-foreground mt-0.5">Add bodyweight in Profile to calculate</p>
          </div>
        </div>
      </div>
    );
  }

  // Not enough lifts
  if (!result.hasScore) {
    return (
      <div className="card-glass rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Strength Score</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Log {2 - result.coverage} more core lift{2 - result.coverage !== 1 ? 's' : ''} to unlock
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Squat, Bench, Deadlift, OHP</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setDrawerOpen(true)}
        className="w-full card-glass rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 relative">
          <span className="text-lg font-bold text-primary">{Math.round(result.score)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Strength Score</p>
          <p className="text-base font-bold">{result.label}</p>
          <p className="text-xs text-muted-foreground">
            {result.coverage}/4 lifts • {range === '3m' ? '3M' : 'Lifetime'}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </button>

      <StrengthScoreDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        range={range}
        onRangeChange={setRange}
      />
    </>
  );
}
