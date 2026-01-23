// Superset display and editing component for builders
import { useState } from "react";
import { motion } from "framer-motion";
import {
  GripVertical,
  Trash2,
  Plus,
  Layers,
  Timer,
  ChevronDown,
  ChevronUp,
  Settings,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { SupersetBlock as SupersetBlockType, ExerciseItem } from "@/types/superset";

interface SupersetBlockProps {
  superset: SupersetBlockType;
  onUpdate: (updates: Partial<SupersetBlockType>) => void;
  onRemove: () => void;
  onUngroup: () => void;
  onAddExercise: () => void;
  onUpdateExercise: (index: number, updates: Partial<ExerciseItem>) => void;
  onRemoveExercise: (index: number) => void;
  onMoveExercise: (index: number, direction: 'up' | 'down') => void;
  readOnly?: boolean;
}

export function SupersetBlockComponent({
  superset,
  onUpdate,
  onRemove,
  onUngroup,
  onAddExercise,
  onUpdateExercise,
  onRemoveExercise,
  onMoveExercise,
  readOnly = false,
}: SupersetBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const formatRestTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins}m`;
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-0">
        {/* Superset Header */}
        <div className="flex items-center gap-2 p-3 border-b border-primary/10">
          {!readOnly && (
            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-grab" />
          )}
          <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Layers className="h-4 w-4 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            {readOnly ? (
              <p className="font-medium text-sm">{superset.name || 'Superset'}</p>
            ) : (
              <Input
                value={superset.name || ''}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="Superset name..."
                className="h-7 text-sm font-medium bg-transparent border-none px-0 focus-visible:ring-0"
              />
            )}
          </div>

          <Badge variant="secondary" className="text-xs">
            {superset.items.length} exercises
          </Badge>

          {!readOnly && (
            <>
              <Popover open={showSettings} onOpenChange={setShowSettings}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Rounds</Label>
                      <Select
                        value={(superset.rounds || 1).toString()}
                        onValueChange={(v) => onUpdate({ rounds: parseInt(v) })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <SelectItem key={n} value={n.toString()}>
                              {n} round{n > 1 ? 's' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Rest after round</Label>
                      <Select
                        value={(superset.rest_after_round_seconds || 90).toString()}
                        onValueChange={(v) => onUpdate({ rest_after_round_seconds: parseInt(v) })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 30, 45, 60, 75, 90, 120, 150, 180].map((s) => (
                            <SelectItem key={s} value={s.toString()}>
                              {s === 0 ? 'No rest' : formatRestTime(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Rest between exercises</Label>
                      <Select
                        value={(superset.rest_between_exercises_seconds || 0).toString()}
                        onValueChange={(v) => onUpdate({ rest_between_exercises_seconds: parseInt(v) })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 15, 30, 45, 60].map((s) => (
                            <SelectItem key={s} value={s.toString()}>
                              {s === 0 ? 'No rest' : formatRestTime(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onUngroup}
                title="Ungroup superset"
              >
                <Unlink className="h-4 w-4 text-muted-foreground" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onRemove}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Rest info badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground border-b border-primary/10">
          <Timer className="h-3 w-3" />
          <span>
            {superset.rounds && superset.rounds > 1 ? `${superset.rounds} rounds • ` : ''}
            {formatRestTime(superset.rest_after_round_seconds || 90)} rest after round
            {(superset.rest_between_exercises_seconds || 0) > 0 &&
              ` • ${formatRestTime(superset.rest_between_exercises_seconds!)} between exercises`}
          </span>
        </div>

        {/* Exercises */}
        <Collapsible open={isExpanded}>
          <CollapsibleContent>
            <div className="p-3 space-y-2">
              {superset.items.map((exercise, index) => (
                <motion.div
                  key={exercise.id}
                  layout
                  className="flex items-center gap-2 p-2 rounded-lg bg-background/80"
                >
                  {!readOnly && (
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => onMoveExercise(index, 'up')}
                        disabled={index === 0}
                        className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => onMoveExercise(index, 'down')}
                        disabled={index === superset.items.length - 1}
                        className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center text-xs">
                    {String.fromCharCode(65 + index)}
                  </Badge>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{exercise.name}</p>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{exercise.sets}×</span>
                    <span>{exercise.reps || '—'}</span>
                  </div>

                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onRemoveExercise(index)}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  )}
                </motion.div>
              ))}

              {!readOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1"
                  onClick={onAddExercise}
                >
                  <Plus className="h-3 w-3" />
                  Add to Superset
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export default SupersetBlockComponent;
