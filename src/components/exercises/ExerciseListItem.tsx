import { Dumbbell, Activity, User, Clock, AlertCircle } from 'lucide-react';
import type { Exercise } from '@/types/exercise';
import { RECORD_TYPE_LABELS } from '@/types/exercise';
import { getExerciseImage } from '@/utils/equipmentImages';

interface ExerciseListItemProps {
  exercise: Exercise;
  onClick?: () => void;
  showAddButton?: boolean;
  onAdd?: () => void;
}

export function ExerciseListItem({ exercise, onClick, showAddButton, onAdd }: ExerciseListItemProps) {
  const isCustom = exercise.source === 'user';
  const isStrength = exercise.type === 'strength';
  const isPending = exercise.status === 'pending';
  const isRejected = exercise.status === 'rejected';
  
  const exerciseImage = getExerciseImage(exercise);

  // Build subtitle
  const subtitle = isStrength 
    ? exercise.muscle_group_name || exercise.primary_muscle || exercise.type
    : exercise.modality || 'Cardio';

  // Equipment display from DB names
  const equipmentDisplay = (exercise.equipment_names || []).slice(0, 2).join(', ');

  return (
    <button
      onClick={onClick || onAdd}
      className="w-full bg-muted/30 rounded-xl p-3 border border-border/30 flex items-center gap-3 active:scale-[0.98] transition-transform text-left"
    >
      {exerciseImage ? (
        <div className="w-9 h-9 rounded-lg overflow-hidden bg-muted/50 flex-shrink-0">
          <img src={exerciseImage} alt={exercise.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isStrength ? 'bg-primary/10 text-primary' : 'bg-accent/50 text-accent-foreground'
        }`}>
          {isStrength ? <Dumbbell className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{exercise.name}</span>
          {isCustom && (
            <span className={`flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
              isPending ? 'bg-yellow-500/10 text-yellow-600' :
              isRejected ? 'bg-destructive/10 text-destructive' :
              'bg-secondary/50 text-muted-foreground'
            }`}>
              {isPending ? (
                <><Clock className="h-2.5 w-2.5" /> Pending</>
              ) : isRejected ? (
                <><AlertCircle className="h-2.5 w-2.5" /> Private</>
              ) : (
                <><User className="h-2.5 w-2.5" /> Custom</>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground capitalize">{subtitle}</span>
          {exercise.muscle_subgroup_name && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-xs text-muted-foreground">{exercise.muscle_subgroup_name}</span>
            </>
          )}
          {equipmentDisplay && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-xs text-muted-foreground">{equipmentDisplay}</span>
            </>
          )}
        </div>
      </div>
      
      {showAddButton && (
        <div className="text-primary text-lg">+</div>
      )}
    </button>
  );
}