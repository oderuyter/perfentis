import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useOneRepMax,
  reverseEpley,
  roundWeight,
  computeSessionE1RM,
  REP_TABLE_ROWS,
  TIME_RANGE_LABELS,
  type TimeRange,
  type OneRMResult,
} from '@/hooks/useOneRepMax';
import type { ExerciseSet } from '@/types/workout';

interface OneRMPanelProps {
  exerciseId: string;
  exerciseName: string;
  onClose: () => void;
  /** Live sets from current workout session for "Current" tab override */
  sessionSets?: ExerciseSet[];
}

export function OneRMPanel({ exerciseId, exerciseName, onClose, sessionSets }: OneRMPanelProps) {
  const { resultsByRange, isLoading, units } = useOneRepMax(exerciseId);
  const [activeRange, setActiveRange] = useState<TimeRange>('current');
  const weightUnit = units === 'metric' ? 'kg' : 'lbs';

  // If we have live session sets, override the "current" result
  const sessionE1RM = useMemo(() => {
    if (!sessionSets) return 0;
    return computeSessionE1RM(sessionSets);
  }, [sessionSets]);

  const activeResult: OneRMResult = useMemo(() => {
    if (activeRange === 'current' && sessionE1RM > 0) {
      return { e1rm: sessionE1RM, rawBest: sessionE1RM, hasData: true };
    }
    return resultsByRange[activeRange];
  }, [activeRange, resultsByRange, sessionE1RM]);

  const displayE1RM = activeResult.hasData ? roundWeight(activeResult.e1rm, units) : 0;

  const displayWeight = (w: number) => {
    if (units === 'imperial') return roundWeight(w * 2.205, units);
    return roundWeight(w, units);
  };

  const tableRows = useMemo(() => {
    if (!activeResult.hasData) return [];
    return REP_TABLE_ROWS.map(reps => ({
      reps,
      weight: displayWeight(reverseEpley(activeResult.e1rm, reps)),
    }));
  }, [activeResult, units]);

  const ranges: TimeRange[] = ['current', '1m', '3m', '6m', '1y', 'lifetime'];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[120]"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[130] shadow-elevated max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold tracking-tight">
              1RM Calculator: {activeResult.hasData ? `${displayWeight(activeResult.e1rm)}${weightUnit}` : '—'}
            </h2>
            <button onClick={onClose} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground truncate">{exerciseName}</p>
        </div>

        {/* Range Tabs */}
        <div className="px-4 pb-3 flex-shrink-0">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {ranges.map(range => {
              const result = range === 'current' && sessionE1RM > 0
                ? { hasData: true }
                : resultsByRange[range];
              return (
                <button
                  key={range}
                  onClick={() => setActiveRange(range)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1',
                    activeRange === range
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                >
                  {TIME_RANGE_LABELS[range]}
                  {result.hasData && (range === '3m' || range === '6m') && (
                    <Zap className="h-3 w-3" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-footer-safe">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !activeResult.hasData ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No data for this range</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Complete sets with weight & reps to see your estimated 1RM
              </p>
            </div>
          ) : (
            <div>
              {/* Table */}
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left">Reps</th>
                    <th className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {tableRows.map(row => (
                    <tr key={row.reps} className={cn(row.reps === 1 && 'bg-primary/5')}>
                      <td className={cn('py-2.5 px-3 text-base font-semibold tabular-nums', row.reps === 1 && 'text-primary')}>
                        {row.reps}
                      </td>
                      <td className={cn('py-2.5 px-3 text-base font-semibold tabular-nums text-right', row.reps === 1 && 'text-primary')}>
                        {row.weight}{weightUnit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
