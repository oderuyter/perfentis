// Coach Workout Structure Editor - uses UnifiedBlockBuilder for block-aware editing
import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UnifiedBlockBuilder } from "@/components/workout/UnifiedBlockBuilder";
import {
  type WorkoutBlock,
  parseExerciseDataToBlocks,
  blocksToLegacyItems,
} from "@/types/workout-blocks";

interface CoachWorkoutStructureEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: string;
  workoutName: string;
  initialExerciseData?: any[];
  onSave?: () => void;
}

export function CoachWorkoutStructureEditor({
  open,
  onOpenChange,
  workoutId,
  workoutName,
  initialExerciseData = [],
  onSave,
}: CoachWorkoutStructureEditorProps) {
  const [saving, setSaving] = useState(false);
  const [blocks, setBlocks] = useState<WorkoutBlock[]>([]);

  // Reset when opened with new data
  useEffect(() => {
    if (open) {
      const parsed = parseExerciseDataToBlocks(initialExerciseData);
      setBlocks(parsed);
    }
  }, [open, initialExerciseData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const exerciseData = blocksToLegacyItems(blocks);

      const { error } = await supabase
        .from("plan_workouts")
        .update({ exercise_data: JSON.parse(JSON.stringify(exerciseData)) })
        .eq("id", workoutId);

      if (error) throw error;

      toast.success("Workout exercises saved");
      onSave?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving workout exercises:", error);
      toast.error("Failed to save exercises");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Workout Exercises</SheetTitle>
          <SheetDescription>{workoutName}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4 pb-24">
          <UnifiedBlockBuilder
            blocks={blocks}
            onChange={setBlocks}
            title="Exercises"
          />
        </div>

        <div className="flex gap-2 mt-4 pt-4 border-t sticky bottom-0 bg-background pb-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Exercises'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default CoachWorkoutStructureEditor;
