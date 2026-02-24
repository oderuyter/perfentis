import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, ChevronRight } from 'lucide-react';
import { useClientStrengthScore, type StrengthRange } from '@/hooks/useStrengthScore';
import { roundWeight } from '@/hooks/useOneRepMax';
import { cn } from '@/lib/utils';
import { OneRMPanel } from '@/components/workout/OneRMPanel';
import { formatDistanceToNow } from 'date-fns';

const LIFT_COLORS: Record<string, string> = {
  Squat: 'bg-yellow-500',
  Bench: 'bg-blue-500',
  Deadlift: 'bg-green-500',
  OHP: 'bg-orange-500',
};

interface CoachStrengthScoreCardProps {
  clientUserId: string;
}

export function CoachStrengthScoreCard({ clientUserId }: CoachStrengthScoreCardProps) {
  const [range, setRange] = useState<StrengthRange>('3m');
  const { result, isLoading } = useClientStrengthScore(clientUserId, range);
  const [oneRMExercise, setOneRMExercise] = useState<{ id: string; name: string } | null>(null);

  if (isLoading) return null;

  if (result.missingBodyweight) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Strength Score</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Client needs to add bodyweight</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Strength Score</CardTitle>
            <div className="flex bg-muted/50 rounded-lg p-0.5">
              {(['3m', 'lifetime'] as StrengthRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    'px-2 py-1 rounded-md text-xs font-medium transition-colors',
                    range === r
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {r === '3m' ? '3M' : 'All'}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!result.hasScore ? (
            <div className="text-center py-3">
              <p className="text-sm text-muted-foreground">
                {result.coverage}/4 core lifts logged
              </p>
              <p className="text-xs text-muted-foreground/70">Needs ≥2 to show score</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{Math.round(result.score)}</span>
                </div>
                <div>
                  <p className="font-semibold">{result.label}</p>
                  <p className="text-xs text-muted-foreground">{result.coverage}/4 lifts</p>
                </div>
              </div>

              {result.lifts.map(lift => (
                <div key={lift.canonical} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={cn('h-1.5 w-4 rounded-full', LIFT_COLORS[lift.canonical] || 'bg-primary')} />
                    <span>{lift.canonical}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground tabular-nums">
                      {roundWeight(lift.e1rm, 'metric')}kg
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(lift.liftScore)}
                    </Badge>
                    <button
                      onClick={() => setOneRMExercise({ id: lift.exerciseId, name: lift.exerciseName })}
                      className="text-primary"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {oneRMExercise && (
        <OneRMPanel
          exerciseId={oneRMExercise.id}
          exerciseName={oneRMExercise.name}
          onClose={() => setOneRMExercise(null)}
        />
      )}
    </>
  );
}
