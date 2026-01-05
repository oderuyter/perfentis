import { useState } from 'react';
import { ChevronDown, ChevronUp, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExerciseFilters as Filters, ExerciseType, MuscleGroup, EquipmentType } from '@/types/exercise';
import { MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS } from '@/types/exercise';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ExerciseFiltersProps {
  filters: Filters;
  onUpdateFilters: (filters: Partial<Filters>) => void;
  onClearFilters: () => void;
}

const muscleGroups: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'abs', 'lower_back'
];

const equipmentTypes: EquipmentType[] = [
  'barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 
  'bodyweight', 'resistance_band', 'pull_up_bar', 'bench'
];

export function ExerciseFiltersBar({ filters, onUpdateFilters, onClearFilters }: ExerciseFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const hasActiveFilters = filters.type || filters.muscleGroup || filters.equipment;
  const activeFilterCount = [filters.type, filters.muscleGroup, filters.equipment].filter(Boolean).length;
  
  return (
    <div className="space-y-2">
      {/* Type filter - always visible */}
      <div className="flex items-center gap-2">
        <FilterChip
          label="Strength"
          isActive={filters.type === 'strength'}
          onClick={() => onUpdateFilters({ 
            type: filters.type === 'strength' ? null : 'strength',
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
        
        <div className="flex-1" />
        
        {/* More filters toggle */}
        {filters.type !== 'cardio' && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs border transition-colors ${
              isExpanded || filters.muscleGroup || filters.equipment
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-muted/50 text-muted-foreground border-border/50 hover:border-border'
            }`}
          >
            <Filter className="h-3 w-3" />
            Filters
            {activeFilterCount > 1 && (
              <span className="bg-primary text-primary-foreground text-[10px] px-1.5 rounded-full">
                {activeFilterCount - (filters.type ? 1 : 0)}
              </span>
            )}
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
        
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
      
      {/* Expanded filters */}
      {filters.type !== 'cardio' && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="space-y-3 pt-2">
            {/* Muscle group filter */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Muscle Group</p>
              <div className="flex flex-wrap gap-1.5">
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
            </div>
            
            {/* Equipment filter - now independent */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Equipment</p>
              <div className="flex flex-wrap gap-1.5">
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
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
      
      {/* Active filter badges - shown when collapsed */}
      {!isExpanded && (filters.muscleGroup || filters.equipment) && filters.type !== 'cardio' && (
        <div className="flex flex-wrap gap-1.5">
          {filters.muscleGroup && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
              {MUSCLE_GROUP_LABELS[filters.muscleGroup]}
              <button 
                onClick={() => onUpdateFilters({ muscleGroup: null })}
                className="hover:text-primary/70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.equipment && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
              {EQUIPMENT_LABELS[filters.equipment]}
              <button 
                onClick={() => onUpdateFilters({ equipment: null })}
                className="hover:text-primary/70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
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
        ${size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'}
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
