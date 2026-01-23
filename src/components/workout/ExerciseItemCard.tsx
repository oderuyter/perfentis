// Single exercise item card for builders
import {
  GripVertical,
  Trash2,
  Dumbbell,
  Heart,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ExerciseItem } from "@/types/superset";

interface ExerciseItemCardProps {
  exercise: ExerciseItem;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  onUpdate: (updates: Partial<ExerciseItem>) => void;
  onRemove: () => void;
  showSelection?: boolean;
  readOnly?: boolean;
  compact?: boolean;
}

export function ExerciseItemCard({
  exercise,
  isSelected = false,
  onSelect,
  onUpdate,
  onRemove,
  showSelection = false,
  readOnly = false,
  compact = false,
}: ExerciseItemCardProps) {
  const isCardio = exercise.exercise_type === 'cardio';

  return (
    <div
      className={cn(
        "p-3 rounded-lg bg-muted/50 space-y-2",
        isSelected && "ring-2 ring-primary bg-primary/5"
      )}
    >
      <div className="flex items-center gap-3">
        {showSelection && onSelect && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            className="flex-shrink-0"
          />
        )}
        
        {!readOnly && (
          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-grab" />
        )}
        
        <div className="h-8 w-8 rounded-lg bg-primary/12 flex items-center justify-center flex-shrink-0">
          {isCardio ? (
            <Heart className="h-4 w-4 text-primary" />
          ) : (
            <Dumbbell className="h-4 w-4 text-primary" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{exercise.name}</p>
        </div>
        
        {!readOnly && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 flex-shrink-0"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      {!compact && (
        <div className="flex items-center gap-2 pl-0 sm:pl-7">
          <Input
            type="number"
            value={exercise.sets}
            onChange={(e) => onUpdate({ sets: parseInt(e.target.value) || 3 })}
            className="w-14 h-7 text-xs"
            min={1}
            max={10}
            disabled={readOnly}
          />
          <span className="text-xs text-muted-foreground">sets</span>
          
          {!isCardio && (
            <>
              <span className="text-muted-foreground">×</span>
              <Input
                value={exercise.reps || ''}
                onChange={(e) => onUpdate({ reps: e.target.value })}
                className="w-14 h-7 text-xs"
                placeholder="8-12"
                disabled={readOnly}
              />
              <span className="text-xs text-muted-foreground">reps</span>
            </>
          )}
          
          <div className="ml-auto flex items-center gap-1">
            <Timer className="h-3 w-3 text-muted-foreground" />
            <Select
              value={(exercise.rest_seconds || 90).toString()}
              onValueChange={(v) => onUpdate({ rest_seconds: parseInt(v) })}
              disabled={readOnly}
            >
              <SelectTrigger className="h-7 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[30, 45, 60, 75, 90, 105, 120, 150, 180, 240, 300].map((s) => (
                  <SelectItem key={s} value={s.toString()}>
                    {s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExerciseItemCard;
