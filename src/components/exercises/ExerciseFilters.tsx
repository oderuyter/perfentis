import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExerciseFilters as Filters, ExerciseType, MuscleGroup, EquipmentType } from '@/types/exercise';
import { MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS } from '@/types/exercise';

interface ExerciseFiltersProps {
  filters: Filters;
  onUpdateFilters: (filters: Partial<Filters>) => void;
  onClearFilters: () => void;
}

const muscleGroups: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'abs'
];

const equipmentTypes: EquipmentType[] = [
  'barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 
  'bodyweight', 'pull_up_bar', 'bench'
];

export function ExerciseFiltersBar({ filters, onUpdateFilters, onClearFilters }: ExerciseFiltersProps) {
  const hasActiveFilters = filters.type || filters.muscleGroup || filters.equipment;
  
  return (
    <div className="space-y-3">
      {/* Type filter */}
      <div className="flex gap-2">
        <FilterChip
          label="Strength"
          isActive={filters.type === 'strength'}
          onClick={() => onUpdateFilters({ 
            type: filters.type === 'strength' ? null : 'strength',
            // Clear muscle/equipment if switching to cardio
            muscleGroup: filters.type === 'strength' ? null : filters.muscleGroup,
            equipment: filters.type === 'strength' ? null : filters.equipment,
          })}
        />
        <FilterChip
          label="Cardio"
          isActive={filters.type === 'cardio'}
          onClick={() => onUpdateFilters({ 
            type: filters.type === 'cardio' ? null : 'cardio',
            muscleGroup: null,
            equipment: null,
          })}
        />
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
      
      {/* Muscle group filter (only for strength) */}
      {filters.type !== 'cardio' && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {muscleGroups.map(muscle => (
            <FilterChip
              key={muscle}
              label={MUSCLE_GROUP_LABELS[muscle]}
              isActive={filters.muscleGroup === muscle}
              onClick={() => onUpdateFilters({ 
                muscleGroup: filters.muscleGroup === muscle ? null : muscle 
              })}
              size="sm"
            />
          ))}
        </div>
      )}
      
      {/* Equipment filter (only for strength) */}
      {filters.type !== 'cardio' && filters.muscleGroup && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {equipmentTypes.map(eq => (
            <FilterChip
              key={eq}
              label={EQUIPMENT_LABELS[eq]}
              isActive={filters.equipment === eq}
              onClick={() => onUpdateFilters({ 
                equipment: filters.equipment === eq ? null : eq 
              })}
              size="sm"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ 
  label, 
  isActive, 
  onClick,
  size = 'md'
}: { 
  label: string; 
  isActive: boolean; 
  onClick: () => void;
  size?: 'sm' | 'md';
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-shrink-0 rounded-full border transition-colors
        ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'}
        ${isActive 
          ? 'bg-primary text-primary-foreground border-primary' 
          : 'bg-muted/50 text-muted-foreground border-border/50 hover:border-border'
        }
      `}
    >
      {label}
    </button>
  );
}
