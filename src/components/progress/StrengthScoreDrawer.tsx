import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStrengthScore, type StrengthRange, type LiftResult } from '@/hooks/useStrengthScore';
import { roundWeight } from '@/hooks/useOneRepMax';
import { OneRMPanel } from '@/components/workout/OneRMPanel';
import { formatDistanceToNow } from 'date-fns';

interface StrengthScoreDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  range: StrengthRange;
  onRangeChange: (range: StrengthRange) => void;
}

const LIFT_COLORS: Record<string, string> = {
  Squat: 'bg-yellow-500',
  Bench: 'bg-blue-500',
  Deadlift: 'bg-green-500',
  OHP: 'bg-orange-500',
};

export function StrengthScoreDrawer({ open, onOpenChange, range, onRangeChange }: StrengthScoreDrawerProps) {
  const { result, isLoading, units } = useStrengthScore(range);
  const [oneRMExercise, setOneRMExercise] = useState<{ id: string; name: string } | null>(null);
  const weightUnit = units === 'metric' ? 'kg' : 'lbs';

  const displayWeight = (kg: number) => {
    if (units === 'imperial') return roundWeight(kg * 2.205, 'imperial');
    return roundWeight(kg, 'metric');
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[120]"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[130] shadow-elevated max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-3 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold tracking-tight">Strength Score</h2>
                <button onClick={() => onOpenChange(false)} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Range Toggle */}
              <div className="flex bg-muted/50 rounded-xl p-1">
                {(['3m', 'lifetime'] as StrengthRange[]).map(r => (
                  <button
                    key={r}
                    onClick={() => onRangeChange(r)}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                      range === r
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {r === '3m' ? '3M' : 'Lifetime'}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-footer-safe">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !result.hasScore ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {result.missingBodyweight
                      ? 'Add your bodyweight in Profile to see your score'
                      : `Log ${2 - result.coverage} more core lift${2 - result.coverage !== 1 ? 's' : ''} to unlock`}
                  </p>
                  {result.lifts.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Partial Data</p>
                      {result.lifts.map(lift => (
                        <LiftRow
                          key={lift.canonical}
                          lift={lift}
                          weightUnit={weightUnit}
                          displayWeight={displayWeight}
                          onViewOneRM={() => setOneRMExercise({ id: lift.exerciseId, name: lift.exerciseName })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Score Hero */}
                  <div className="flex items-center gap-4 py-2">
                    <div className="relative h-20 w-20 flex-shrink-0">
                      <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                        <circle
                          cx="40" cy="40" r="34"
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={`${(result.score / 100) * 213.6} 213.6`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold">{Math.round(result.score)}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">{result.label}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xl font-bold">Strength Score</p>
                      <p className="text-lg font-semibold text-primary">{result.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Based on {result.lifts.map(l => l.canonical).join(', ')} ({result.coverage}/4 lifts)
                      </p>
                    </div>
                  </div>

                  {/* Weakest lift highlight */}
                  {result.lifts.length > 1 && (() => {
                    const weakest = [...result.lifts].sort((a, b) => a.liftScore - b.liftScore)[0];
                    return (
                      <div className="bg-muted/30 rounded-xl px-3 py-2 text-xs text-muted-foreground">
                        💡 Weakest lift: <span className="font-medium text-foreground">{weakest.canonical}</span> ({Math.round(weakest.liftScore)})
                      </div>
                    );
                  })()}

                  {/* Per-Lift Breakdown */}
                  <div className="space-y-3">
                    {result.lifts.map(lift => (
                      <LiftRow
                        key={lift.canonical}
                        lift={lift}
                        weightUnit={weightUnit}
                        displayWeight={displayWeight}
                        onViewOneRM={() => setOneRMExercise({ id: lift.exerciseId, name: lift.exerciseName })}
                      />
                    ))}

                    {/* Missing lifts */}
                    {result.coverage < 4 && (
                      <div className="text-center py-3">
                        <p className="text-xs text-muted-foreground">
                          Missing: {['Squat', 'Bench', 'Deadlift', 'OHP']
                            .filter(c => !result.lifts.some(l => l.canonical === c))
                            .join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* 1RM Panel */}
          {oneRMExercise && (
            <OneRMPanel
              exerciseId={oneRMExercise.id}
              exerciseName={oneRMExercise.name}
              onClose={() => setOneRMExercise(null)}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}

function LiftRow({
  lift,
  weightUnit,
  displayWeight,
  onViewOneRM,
}: {
  lift: LiftResult;
  weightUnit: string;
  displayWeight: (kg: number) => number;
  onViewOneRM: () => void;
}) {
  return (
    <div className="bg-muted/20 border border-border/40 rounded-xl p-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={cn('h-1.5 w-8 rounded-full', LIFT_COLORS[lift.canonical] || 'bg-primary')} />
            <span className="font-semibold">{lift.canonical}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {displayWeight(lift.e1rm)}{weightUnit} | {lift.ratio.toFixed(2)}× BW
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Last logged {formatDistanceToNow(new Date(lift.lastSeen), { addSuffix: true })}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-bold tabular-nums">{Math.round(lift.liftScore)}</p>
          <p className="text-xs text-muted-foreground">{lift.label}</p>
        </div>
      </div>
      <button
        onClick={onViewOneRM}
        className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <Target className="h-3 w-3" />
        View 1RM table
      </button>
    </div>
  );
}
