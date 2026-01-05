import { Dumbbell, Activity, User } from 'lucide-react';
import type { Exercise, EquipmentType } from '@/types/exercise';
import { EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS } from '@/types/exercise';

interface ExerciseListItemProps {
  exercise: Exercise;
  onClick?: () => void;
  showAddButton?: boolean;
  onAdd?: () => void;
}

const equipmentIcons: Partial<Record<EquipmentType, string>> = {
  barbell: '🏋️',
  dumbbell: '💪',
  kettlebell: '🔔',
  cable: '🔗',
  machine: '⚙️',
  bodyweight: '🧍',
  cardio_machine: '🏃',
};

export function ExerciseListItem({ exercise, onClick, showAddButton, onAdd }: ExerciseListItemProps) {
  const isCustom = exercise.source === 'user';
  const isStrength = exercise.type === 'strength';
  
  // Get first 2 equipment icons
  const equipmentDisplay = (exercise.equipment || [])
    .slice(0, 2)
    .map(eq => equipmentIcons[eq] || '•')
    .join(' ');

  return (
    <button
      onClick={onClick || onAdd}
      className="w-full bg-muted/30 rounded-xl p-3 border border-border/30 flex items-center gap-3 active:scale-[0.98] transition-transform text-left"
    >
      {/* Type icon */}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
        isStrength ? 'bg-primary/10 text-primary' : 'bg-accent/50 text-accent-foreground'
      }`}>
        {isStrength ? <Dumbbell className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{exercise.name}</span>
          {isCustom && (
            <span className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-secondary/50 rounded text-[10px] font-medium text-muted-foreground">
              <User className="h-2.5 w-2.5" />
              Custom
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground capitalize">
            {isStrength 
              ? MUSCLE_GROUP_LABELS[exercise.primary_muscle!] || exercise.type
              : exercise.modality || 'Cardio'
            }
          </span>
          {isStrength && equipmentDisplay && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-xs">{equipmentDisplay}</span>
            </>
          )}
        </div>
      </div>
      
      {/* Add indicator */}
      {showAddButton && (
        <div className="text-primary text-lg">+</div>
      )}
    </button>
  );
}
