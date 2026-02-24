import { useState } from 'react';
import { Target, ChevronRight } from 'lucide-react';
import { useTopOneRM, roundWeight } from '@/hooks/useOneRepMax';
import { useProfile } from '@/hooks/useProfile';
import { OneRMPanel } from '@/components/workout/OneRMPanel';

export function OneRMTile() {
  const { topExercise, isLoading } = useTopOneRM();
  const { profile } = useProfile();
  const units = (profile?.units as 'metric' | 'imperial') || 'metric';
  const weightUnit = units === 'metric' ? 'kg' : 'lbs';
  const [showPanel, setShowPanel] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedExerciseName, setSelectedExerciseName] = useState('');

  if (isLoading || !topExercise) return null;

  const displayE1rm = units === 'imperial'
    ? roundWeight(topExercise.e1rm * 2.205, units)
    : roundWeight(topExercise.e1rm, units);

  const handleOpen = () => {
    setSelectedExerciseId(topExercise.exerciseId);
    setSelectedExerciseName(topExercise.exerciseName);
    setShowPanel(true);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="w-full card-glass rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Top e1RM</p>
          <p className="text-lg font-bold tabular-nums">{displayE1rm}{weightUnit}</p>
          <p className="text-xs text-muted-foreground truncate">{topExercise.exerciseName}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </button>

      {showPanel && selectedExerciseId && (
        <OneRMPanel
          exerciseId={selectedExerciseId}
          exerciseName={selectedExerciseName}
          onClose={() => setShowPanel(false)}
        />
      )}
    </>
  );
}
