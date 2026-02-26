import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useWorkoutPreferences } from "@/hooks/useWorkoutPreferences";
import { useProfile } from "@/hooks/useProfile";
import { Dumbbell, Timer, Hash, RotateCcw, Scale, Volume2, SmartphoneNfc } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface WorkoutDefaultsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WorkoutDefaultsSheet({ isOpen, onClose }: WorkoutDefaultsSheetProps) {
  const { preferences, updatePreferences } = useWorkoutPreferences();
  const { profile } = useProfile();
  const units = profile?.units === "imperial" ? "imperial" : "metric";
  const weightUnit = units === "metric" ? "kg" : "lb";

  const [restSeconds, setRestSeconds] = useState(preferences.default_rest_seconds);
  const [sets, setSets] = useState(preferences.default_sets);
  const [reps, setReps] = useState(preferences.default_reps);
  const [rounding, setRounding] = useState(preferences.weight_rounding_increment);

  useEffect(() => {
    setRestSeconds(preferences.default_rest_seconds);
    setSets(preferences.default_sets);
    setReps(preferences.default_reps);
    setRounding(preferences.weight_rounding_increment);
  }, [preferences]);

  const handleRestChange = (value: number[]) => {
    const v = value[0];
    setRestSeconds(v);
    updatePreferences({ default_rest_seconds: v });
  };

  const handleSetsChange = (value: number[]) => {
    const v = value[0];
    setSets(v);
    updatePreferences({ default_sets: v });
  };

  const handleRepsChange = (value: number[]) => {
    const v = value[0];
    setReps(v);
    updatePreferences({ default_reps: v });
  };

  const roundingOptions = [0.25, 0.5, 1, 2.5, 5];

  const formatRest = (s: number) => {
    if (s >= 60) {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
    }
    return `${s}s`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Workout Defaults
          </SheetTitle>
          <SheetDescription>
            These apply when a program or template doesn't specify values
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-8 pb-8">
          {/* Default Rest Time */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Timer className="h-4 w-4 text-muted-foreground" />
                Default Rest Time
              </Label>
              <span className="text-sm font-semibold text-primary">{formatRest(restSeconds)}</span>
            </div>
            <Slider
              value={[restSeconds]}
              onValueChange={handleRestChange}
              min={15}
              max={300}
              step={15}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>15s</span>
              <span>5m</span>
            </div>
          </div>

          {/* Default Sets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Hash className="h-4 w-4 text-muted-foreground" />
                Default Sets
              </Label>
              <span className="text-sm font-semibold text-primary">{sets}</span>
            </div>
            <Slider
              value={[sets]}
              onValueChange={handleSetsChange}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>10</span>
            </div>
          </div>

          {/* Default Reps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
                Default Reps
              </Label>
              <span className="text-sm font-semibold text-primary">{reps}</span>
            </div>
            <Slider
              value={[reps]}
              onValueChange={handleRepsChange}
              min={1}
              max={30}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>30</span>
            </div>
          </div>

          {/* Weight Prefill Mode */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
              Weight Prefill
            </Label>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/50">
              <Badge variant="secondary" className="text-xs">Smart / Hybrid</Badge>
              <span className="text-xs text-muted-foreground">Uses history when available, propagates in-session</span>
            </div>
          </div>

          {/* Weight Rounding */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Scale className="h-4 w-4 text-muted-foreground" />
              Weight Rounding
            </Label>
            <div className="flex flex-wrap gap-2">
              {roundingOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setRounding(opt);
                    updatePreferences({ weight_rounding_increment: opt });
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    rounding === opt
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-foreground border-border/50 hover:bg-muted"
                  }`}
                >
                  {opt} {weightUnit}
                </button>
              ))}
            </div>
          </div>

          {/* Rest Timer Sound & Haptics */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Rest Timer Feedback</Label>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/30">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Sound</p>
                  <p className="text-xs text-muted-foreground">Play tone when rest completes</p>
                </div>
              </div>
              <Switch
                checked={preferences.rest_timer_sound}
                onCheckedChange={(v) => updatePreferences({ rest_timer_sound: v })}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/30">
              <div className="flex items-center gap-2">
                <SmartphoneNfc className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Haptics</p>
                  <p className="text-xs text-muted-foreground">Vibrate on rest start &amp; completion</p>
                </div>
              </div>
              <Switch
                checked={preferences.rest_timer_haptics}
                onCheckedChange={(v) => updatePreferences({ rest_timer_haptics: v })}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
