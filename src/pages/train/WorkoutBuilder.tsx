import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useWorkoutTemplates } from "@/hooks/useWorkoutTemplates";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedBlockBuilder } from "@/components/workout/UnifiedBlockBuilder";
import {
  type WorkoutBlock,
  parseExerciseDataToBlocks,
  blocksToLegacyItems,
} from "@/types/workout-blocks";
import {
  type WorkoutStructureItem,
  isSuperset,
  isExercise,
} from "@/types/superset";
import type { WorkoutType, DifficultyLevel, WorkoutStructureData } from "@/types/workout-templates";

export default function WorkoutBuilder() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Route is /train/workout/new for creating, /train/workout/:templateId/edit for editing
  const isNew = !templateId || templateId === 'new';
  
  const { createTemplate } = useWorkoutTemplates();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("45");
  const [workoutType, setWorkoutType] = useState<WorkoutType>("mixed");
  const [difficulty, setDifficulty] = useState<DifficultyLevel | "">("");
  const [structuredBlocks, setStructuredBlocks] = useState<WorkoutBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  // Load existing template
  useEffect(() => {
    if (!isNew && templateId && templateId !== 'new') {
      loadTemplate();
    } else {
      setLoading(false);
    }
  }, [templateId, isNew]);

  const loadTemplate = async () => {
    if (!templateId) return;
    
    try {
      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      if (data) {
        setTitle(data.title);
        setDescription(data.description || "");
        setDuration(data.estimated_duration_minutes?.toString() || "45");
        setWorkoutType(data.workout_type as WorkoutType);
        setDifficulty((data.difficulty_level as DifficultyLevel) || "");
        
        // Parse exercise_data - convert to unified blocks
        if (data.exercise_data && Array.isArray(data.exercise_data)) {
          const blocks = parseExerciseDataToBlocks(data.exercise_data);
          setStructuredBlocks(blocks);
        }
      }
    } catch (error) {
      console.error("Error loading template:", error);
      toast.error("Failed to load workout");
    } finally {
      setLoading(false);
    }
  };

  // Count total exercises (including inside supersets)
  const getTotalExerciseCount = () => {
    return structuredBlocks.reduce((count, block) => count + block.items.length, 0);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (getTotalExerciseCount() === 0) {
      toast.error("Please add at least one exercise");
      return;
    }

    setSaving(true);
    try {
      // Convert blocks back to JSONB format for storage
      const exerciseData = blocksToLegacyItems(structuredBlocks);

      if (isNew) {
        await createTemplate.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
          estimated_duration_minutes: parseInt(duration),
          workout_type: workoutType,
          difficulty_level: difficulty || undefined,
          exercise_data: exerciseData,
        });
        toast.success("Workout created!");
        navigate('/train?tab=workouts');
      } else {
        const { error } = await supabase
          .from('workout_templates')
          .update({
            title: title.trim(),
            description: description.trim() || null,
            estimated_duration_minutes: parseInt(duration),
            workout_type: workoutType,
            difficulty_level: difficulty || null,
            exercise_data: JSON.parse(JSON.stringify(exerciseData)),
          })
          .eq('id', templateId);

        if (error) throw error;
        toast.success("Workout updated!");
      }
    } catch (error) {
      console.error("Error saving workout:", error);
      toast.error("Failed to save workout");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-page pt-safe px-4 pb-28">
        <div className="fixed inset-0 gradient-glow pointer-events-none" />
        <header className="relative pt-14 pb-4">
          <Skeleton className="h-8 w-1/2 mb-4" />
        </header>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-page pt-safe px-4 pb-28">
      <div className="fixed inset-0 gradient-glow pointer-events-none" />
      
      {/* Header */}
      <header className="relative pt-14 pb-4">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/train')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        <motion.h1 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold tracking-tight"
        >
          {isNew ? 'Create Workout' : 'Edit Workout'}
        </motion.h1>
      </header>

      {/* Workout Details Form */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Upper Body Strength"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this workout about?"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (mins)</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[15, 30, 45, 60, 75, 90, 120].map(n => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
          </CardContent>
        </Card>

        {/* Exercises - Unified Block Builder */}
        <UnifiedBlockBuilder
          blocks={structuredBlocks}
          onChange={setStructuredBlocks}
          title="Exercises"
        />
      </motion.div>
    </div>
  );
}
