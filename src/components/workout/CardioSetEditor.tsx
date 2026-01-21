import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Minus, Plus, Pencil, Timer, Route, Gauge, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExerciseSet } from '@/types/workout';
import { 
  formatDuration, 
  parseDuration, 
  calculatePace, 
  calculateSpeed,
  metersToKm,
  metersToMiles,
  kmToMeters,
  milesToMeters
} from '@/types/workout';
import { useProfile } from '@/hooks/useProfile';

function formatHmsDots(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${hours.toString().padStart(2, '0')}.${mins.toString().padStart(2, '0')}.${secs.toString().padStart(2, '0')}`;
}

function parseHmsDots(input: string): number {
  // Accept HH.MM.SS (requested) and HH:MM:SS / MM:SS
  const normalized = input.trim().replace(/\./g, ':');
  return parseDuration(normalized);
}

interface CardioSetEditorProps {
  sets: ExerciseSet[];
  currentSetIndex: number;
  onUpdateSet: (setIndex: number, updates: Partial<ExerciseSet>) => void;
  onSelectSet: (setIndex: number) => void;
}

export function CardioSetEditor({ sets, currentSetIndex, onUpdateSet, onSelectSet }: CardioSetEditorProps) {
  const [editingSet, setEditingSet] = useState<number | null>(null);
  const { profile } = useProfile();
  const units = (profile?.units as 'metric' | 'imperial') || 'metric';

  useEffect(() => {
    setEditingSet(null);
  }, [currentSetIndex]);

  const formatDistance = (meters: number | null) => {
    if (!meters) return '—';
    if (units === 'metric') {
      return `${metersToKm(meters).toFixed(2)}`;
    }
    return `${metersToMiles(meters).toFixed(2)}`;
  };

  const distanceUnit = units === 'metric' ? 'km' : 'mi';
  const speedUnit = units === 'metric' ? 'km/h' : 'mph';
  const paceUnit = units === 'metric' ? 'min/km' : 'min/mi';

  return (
    <div className="space-y-2">
      {sets.map((set, index) => {
        const isCompleted = set.completed;
        const isCurrent = index === currentSetIndex;
        const isRemaining = index > currentSetIndex && !isCompleted;
        const isEditing = editingSet === index;

        const displayTime = set.completedTime ?? set.targetTime;
        const displayDistance = set.completedDistance ?? set.targetDistance;
        const pace = calculatePace(displayTime || 0, displayDistance || 0, units);
        const speed = calculateSpeed(displayTime || 0, displayDistance || 0, units);
        const speedDisplay = displayTime && displayDistance ? speed.toFixed(1) : '—';

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "rounded-xl p-3 border transition-all",
              isCompleted && "bg-accent-subtle/50 border-accent/30",
              isCurrent && !isCompleted && "gradient-card-accent border-accent shadow-md ring-2 ring-accent/20",
              isRemaining && "bg-muted/30 border-border/30 opacity-60",
              !isCurrent && "cursor-pointer active:scale-[0.98]"
            )}
            onClick={() => {
              if (!isCurrent && !isCompleted) {
                onSelectSet(index);
              }
            }}
          >
            {/* Set Header Row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors flex-shrink-0",
                  isCompleted && "bg-accent text-accent-foreground",
                  isCurrent && !isCompleted && "bg-accent text-accent-foreground shadow-sm",
                  isRemaining && "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                
                {/* Display values for non-editing states */}
                {!isCurrent && !isEditing && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className={cn(
                        "font-semibold",
                        isCompleted && "text-foreground",
                        isRemaining && "text-muted-foreground"
                      )}>
                        {displayTime !== null && displayTime !== undefined ? formatHmsDots(displayTime) : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Route className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className={cn(
                        "font-semibold",
                        isCompleted && "text-foreground",
                        isRemaining && "text-muted-foreground"
                      )}>
                        {formatDistance(displayDistance)} {distanceUnit}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className={cn(
                        "font-semibold",
                        isCompleted && "text-foreground",
                        isRemaining && "text-muted-foreground"
                      )}>
                        {pace}
                      </span>
                      <span className="text-xs text-muted-foreground">{paceUnit}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className={cn(
                        "font-semibold",
                        isCompleted && "text-foreground",
                        isRemaining && "text-muted-foreground"
                      )}>
                        {speedDisplay}
                      </span>
                      <span className="text-xs text-muted-foreground">{speedUnit}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Edit button for completed sets */}
              {!isCurrent && isCompleted && !isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSet(index);
                  }}
                  className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Editing Interface */}
            {(isCurrent && !isCompleted) && (
              <ActiveCardioEditor
                time={set.completedTime ?? set.targetTime ?? 0}
                distance={set.completedDistance ?? set.targetDistance ?? 0}
                speed={set.completedSpeed ?? null}
                units={units}
                onUpdate={(time, distance, speed) => {
                  onUpdateSet(index, { 
                    completedTime: time, 
                    completedDistance: distance,
                    completedSpeed: speed 
                  });
                }}
              />
            )}

            {isEditing && (
              <InlineCardioEditor
                time={set.completedTime ?? set.targetTime ?? 0}
                distance={set.completedDistance ?? set.targetDistance ?? 0}
                speed={set.completedSpeed ?? null}
                units={units}
                onUpdate={(time, distance, speed) => {
                  onUpdateSet(index, { 
                    completedTime: time, 
                    completedDistance: distance,
                    completedSpeed: speed 
                  });
                  setEditingSet(null);
                }}
                onCancel={() => setEditingSet(null)}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

interface ActiveCardioEditorProps {
  time: number;
  distance: number;
  speed: number | null;
  units: 'metric' | 'imperial';
  onUpdate: (time: number, distance: number, speed: number | null) => void;
}

function ActiveCardioEditor({ time, distance, speed, units, onUpdate }: ActiveCardioEditorProps) {
  const [editTime, setEditTime] = useState(time);
  const [editDistance, setEditDistance] = useState(
    units === 'metric' ? metersToKm(distance) : metersToMiles(distance)
  );
  const [editSpeed, setEditSpeed] = useState(speed);

  useEffect(() => {
    setEditTime(time);
    setEditDistance(units === 'metric' ? metersToKm(distance) : metersToMiles(distance));
    setEditSpeed(speed);
  }, [time, distance, speed, units]);

  const handleTimeChange = (newTime: number) => {
    setEditTime(newTime);
    const distanceMeters = units === 'metric' ? kmToMeters(editDistance) : milesToMeters(editDistance);
    onUpdate(newTime, distanceMeters, editSpeed);
  };

  const handleDistanceChange = (newDistance: number) => {
    setEditDistance(newDistance);
    const distanceMeters = units === 'metric' ? kmToMeters(newDistance) : milesToMeters(newDistance);
    onUpdate(editTime, distanceMeters, editSpeed);
  };

  const handleSpeedChange = (newSpeed: number | null) => {
    setEditSpeed(newSpeed);
    const distanceMeters = units === 'metric' ? kmToMeters(editDistance) : milesToMeters(editDistance);
    onUpdate(editTime, distanceMeters, newSpeed);
  };

  const distanceUnit = units === 'metric' ? 'km' : 'mi';
  const speedUnit = units === 'metric' ? 'km/h' : 'mph';
  const paceUnit = units === 'metric' ? 'min/km' : 'min/mi';
  const distanceMeters = units === 'metric' ? kmToMeters(editDistance) : milesToMeters(editDistance);
  const pace = calculatePace(editTime, distanceMeters, units);
  const calculatedSpeed = calculateSpeed(editTime, distanceMeters, units);

  return (
    <div className="space-y-3" onClick={e => e.stopPropagation()}>
      {/* Time row */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase w-14 flex-shrink-0 flex items-center gap-1">
          <Timer className="h-3.5 w-3.5" /> Time
        </span>
        <div className="flex-1 flex items-center justify-center gap-2 bg-background/80 rounded-xl p-1 shadow-sm border border-border/50">
          <button
            onClick={() => handleTimeChange(Math.max(0, editTime - 15))}
            className="h-11 w-11 flex items-center justify-center hover:bg-muted rounded-lg transition-colors active:scale-95"
          >
            <Minus className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <input
              type="text"
              value={formatHmsDots(editTime)}
              onChange={e => handleTimeChange(parseHmsDots(e.target.value))}
              className="w-full text-center bg-transparent text-xl font-bold focus:outline-none"
              placeholder="00.00.00"
            />
            <span className="text-xs text-muted-foreground">hh.mm.ss</span>
          </div>
          <button
            onClick={() => handleTimeChange(editTime + 15)}
            className="h-11 w-11 flex items-center justify-center hover:bg-muted rounded-lg transition-colors active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Distance row */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase w-14 flex-shrink-0 flex items-center gap-1">
          <Route className="h-3.5 w-3.5" /> Dist
        </span>
        <div className="flex-1 flex items-center justify-center gap-2 bg-background/80 rounded-xl p-1 shadow-sm border border-border/50">
          <button
            onClick={() => handleDistanceChange(Math.max(0, editDistance - 0.1))}
            className="h-11 w-11 flex items-center justify-center hover:bg-muted rounded-lg transition-colors active:scale-95"
          >
            <Minus className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <input
              type="number"
              inputMode="decimal"
              value={editDistance.toFixed(2)}
              onChange={e => handleDistanceChange(parseFloat(e.target.value) || 0)}
              className="w-full text-center bg-transparent text-xl font-bold focus:outline-none"
              step="0.1"
            />
            <span className="text-xs text-muted-foreground">{distanceUnit}</span>
          </div>
          <button
            onClick={() => handleDistanceChange(editDistance + 0.1)}
            className="h-11 w-11 flex items-center justify-center hover:bg-muted rounded-lg transition-colors active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Pace (auto-calculated) & Speed */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Gauge className="h-3.5 w-3.5" />
            <span className="text-xs uppercase">Pace</span>
          </div>
          <p className="text-lg font-semibold">{pace}</p>
          <span className="text-xs text-muted-foreground">{paceUnit}</span>
        </div>
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Zap className="h-3.5 w-3.5" />
            <span className="text-xs uppercase">Speed</span>
          </div>
          <p className="text-lg font-semibold">{calculatedSpeed || '—'}</p>
          <span className="text-xs text-muted-foreground">{speedUnit}</span>
        </div>
      </div>
    </div>
  );
}

interface InlineCardioEditorProps {
  time: number;
  distance: number;
  speed: number | null;
  units: 'metric' | 'imperial';
  onUpdate: (time: number, distance: number, speed: number | null) => void;
  onCancel: () => void;
}

function InlineCardioEditor({ time, distance, speed, units, onUpdate, onCancel }: InlineCardioEditorProps) {
  const [editTime, setEditTime] = useState(time);
  const [editDistance, setEditDistance] = useState(
    units === 'metric' ? metersToKm(distance) : metersToMiles(distance)
  );

  const distanceUnit = units === 'metric' ? 'km' : 'mi';
  const distanceMeters = units === 'metric' ? kmToMeters(editDistance) : milesToMeters(editDistance);

  return (
    <div className="space-y-3" onClick={e => e.stopPropagation()}>
      {/* Time row */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase w-14 flex-shrink-0 flex items-center gap-1">
          <Timer className="h-3.5 w-3.5" /> Time
        </span>
        <div className="flex-1 flex items-center justify-center gap-2 bg-muted rounded-xl p-1">
          <button
            onClick={() => setEditTime(Math.max(0, editTime - 15))}
            className="h-9 w-9 flex items-center justify-center hover:bg-muted-foreground/10 rounded-lg transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <input
              type="text"
              value={formatHmsDots(editTime)}
              onChange={e => setEditTime(parseHmsDots(e.target.value))}
              className="w-full text-center bg-transparent text-lg font-semibold focus:outline-none"
              placeholder="00.00.00"
            />
            <span className="text-xs text-muted-foreground">hh.mm.ss</span>
          </div>
          <button
            onClick={() => setEditTime(editTime + 15)}
            className="h-9 w-9 flex items-center justify-center hover:bg-muted-foreground/10 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Distance row */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase w-14 flex-shrink-0 flex items-center gap-1">
          <Route className="h-3.5 w-3.5" /> Dist
        </span>
        <div className="flex-1 flex items-center justify-center gap-2 bg-muted rounded-xl p-1">
          <button
            onClick={() => setEditDistance(Math.max(0, editDistance - 0.1))}
            className="h-9 w-9 flex items-center justify-center hover:bg-muted-foreground/10 rounded-lg transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <input
              type="number"
              inputMode="decimal"
              value={editDistance.toFixed(2)}
              onChange={e => setEditDistance(parseFloat(e.target.value) || 0)}
              className="w-full text-center bg-transparent text-lg font-semibold focus:outline-none"
              step="0.1"
            />
            <span className="text-xs text-muted-foreground">{distanceUnit}</span>
          </div>
          <button
            onClick={() => setEditDistance(editDistance + 0.1)}
            className="h-9 w-9 flex items-center justify-center hover:bg-muted-foreground/10 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Confirm button */}
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onUpdate(editTime, distanceMeters, null)}
          className="px-4 py-1.5 bg-accent text-accent-foreground rounded-lg text-sm font-medium flex items-center gap-1.5"
        >
          <Check className="h-4 w-4" />
          Save
        </button>
      </div>
    </div>
  );
}