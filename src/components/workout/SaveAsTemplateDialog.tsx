import { useState } from "react";
import { motion } from "framer-motion";
import { Save, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useWorkoutTemplates } from "@/hooks/useWorkoutTemplates";
import type { WorkoutType, DifficultyLevel } from "@/types/workout-templates";

interface SaveAsTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  exercises: Array<{
    exercise_id: string;
    name: string;
    sets: number;
    reps: number;
    exerciseType?: 'strength' | 'cardio';
    rest_seconds?: number;
  }>;
  suggestedName?: string;
  duration?: number;
}

export function SaveAsTemplateDialog({
  open,
  onClose,
  exercises,
  suggestedName = "",
  duration = 45,
}: SaveAsTemplateDialogProps) {
  const { createTemplate } = useWorkoutTemplates();
  const [title, setTitle] = useState(suggestedName);
  const [description, setDescription] = useState("");
  const [workoutType, setWorkoutType] = useState<WorkoutType>("mixed");
  const [difficulty, setDifficulty] = useState<DifficultyLevel | "">("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setSaving(true);
    try {
      const exerciseData = exercises.map((ex, index) => ({
        exercise_id: ex.exercise_id,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds || 90,
        exercise_type: ex.exerciseType,
        order_index: index,
      }));

      await createTemplate.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        estimated_duration_minutes: duration,
        workout_type: workoutType,
        difficulty_level: difficulty || undefined,
        exercise_data: exerciseData,
      });

      toast.success("Workout saved as template!");
      onClose();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save as Workout Template
          </DialogTitle>
          <DialogDescription>
            Save this workout to reuse it later or share with the community
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Name</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning Strength Routine"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this workout for?"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={workoutType} onValueChange={(v) => setWorkoutType(v as WorkoutType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="cardio">Cardio</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as DifficultyLevel)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="elite">Elite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm font-medium">{exercises.length} exercises</p>
            <p className="text-xs text-muted-foreground mt-1">
              {exercises.map(e => e.name).slice(0, 3).join(', ')}
              {exercises.length > 3 && ` +${exercises.length - 3} more`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
