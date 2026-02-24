import { useState } from 'react';
import { ChevronDown, ChevronUp, X, Filter } from 'lucide-react';
import { useMuscleTaxonomy } from '@/hooks/useMuscleTaxonomy';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import type { ExerciseFilters as Filters } from '@/types/exercise';
import { RECORD_TYPE_LABELS, ExerciseRecordType } from '@/types/exercise';
import {
  Collapsible,
  CollapsibleContent,
} from '@/components/ui/collapsible';

interface ExerciseFiltersProps {
  filters: Filters;
  onUpdateFilters: (filters: Partial<Filters>) => void;
  onClearFilters: () => void;
}

export function ExerciseFiltersBar({ filters, onUpdateFilters, onClearFilters }: ExerciseFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { muscleGroups, muscleSubgroups, getSubgroupsForGroup } = useMuscleTaxonomy();
  const { approvedEquipment } = useEquipmentLibrary();
  
  const hasActiveFilters = filters.type || filters.muscleGroupId || filters.equipmentId || filters.muscleGroup || filters.equipment || filters.recordType;
  const activeFilterCount = [filters.type, filters.muscleGroupId || filters.muscleGroup, filters.equipmentId || filters.equipment, filters.recordType].filter(Boolean).length;
  
  // Get subgroups for selected muscle group
  const selectedGroupSubgroups = filters.muscleGroupId 
    ? getSubgroupsForGroup(filters.muscleGroupId) 
    : [];

  // Get display names
  const selectedGroupName = filters.muscleGroupId
    ? muscleGroups.find(g => g.id === filters.muscleGroupId)?.name
    : null;
  const selectedEquipmentName = filters.equipmentId
    ? approvedEquipment.find(e => e.id === filters.equipmentId)?.name
    : null;
  
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
            muscleGroupId: null,
            muscleGroup: null,
            equipmentId: null,
            equipment: null,
          })}
        />
        
        <div className="flex-1" />
        
        {filters.type !== 'cardio' && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs border transition-colors ${
              isExpanded || filters.muscleGroupId || filters.equipmentId || filters.muscleGroup || filters.equipment || filters.recordType
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
            {/* Muscle group filter (DB-driven) */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Muscle Group</p>
              <div className="flex flex-wrap gap-1.5">
                {muscleGroups.map(group => (
                  <FilterChip
                    key={group.id}
                    label={group.name}
                    isActive={filters.muscleGroupId === group.id}
                    onClick={() => onUpdateFilters({ 
                      muscleGroupId: filters.muscleGroupId === group.id ? null : group.id,
                      muscleGroup: null,
                    })}
                    size="sm"
                  />
                ))}
              </div>
            </div>
            
            {/* Equipment filter (DB-driven) */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Equipment</p>
              <div className="flex flex-wrap gap-1.5">
                {approvedEquipment.map(eq => (
                  <FilterChip
                    key={eq.id}
                    label={eq.name}
                    isActive={filters.equipmentId === eq.id}
                    onClick={() => onUpdateFilters({ 
                      equipmentId: filters.equipmentId === eq.id ? null : eq.id,
                      equipment: null,
                    })}
                    size="sm"
                  />
                ))}
              </div>
            </div>

            {/* Record type filter */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Record Type</p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.entries(RECORD_TYPE_LABELS) as [ExerciseRecordType, string][]).map(([key, label]) => (
                  <FilterChip
                    key={key}
                    label={label}
                    isActive={filters.recordType === key}
                    onClick={() => onUpdateFilters({ 
                      recordType: filters.recordType === key ? null : key,
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
      {!isExpanded && (filters.muscleGroupId || filters.equipmentId || filters.recordType) && filters.type !== 'cardio' && (
        <div className="flex flex-wrap gap-1.5">
          {selectedGroupName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
              {selectedGroupName}
              <button 
                onClick={() => onUpdateFilters({ muscleGroupId: null })}
                className="hover:text-primary/70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedEquipmentName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
              {selectedEquipmentName}
              <button 
                onClick={() => onUpdateFilters({ equipmentId: null })}
                className="hover:text-primary/70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.recordType && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
              {RECORD_TYPE_LABELS[filters.recordType]}
              <button 
                onClick={() => onUpdateFilters({ recordType: null })}
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