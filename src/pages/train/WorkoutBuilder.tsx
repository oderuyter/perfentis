import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Plus,
  Save,
  GripVertical,
  Trash2,
  Dumbbell,
  Heart,
  Clock,
  Timer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { useExerciseLibrary } from "@/hooks/useExerciseLibrary";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AddExerciseSheet } from "@/components/workout/AddExerciseSheet";
import type { WorkoutType, DifficultyLevel } from "@/types/workout-templates";

interface ExerciseEntry {
  id: string;
  exercise_id: string;
  name: string;
  sets: number;
  reps: string;
  notes?: string;
  rest_seconds?: number;
  exerciseType?: 'strength' | 'cardio';
}

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
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
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
        
        // Parse exercise_data
        if (data.exercise_data && Array.isArray(data.exercise_data)) {
          setExercises(data.exercise_data.map((ex: any, index: number) => ({
            id: `ex-${index}`,
            exercise_id: ex.exercise_id,
            name: ex.name,
            sets: ex.sets || 3,
            reps: ex.reps || '8-12',
            notes: ex.notes,
            rest_seconds: ex.rest_seconds,
            exerciseType: ex.exerciseType || ex.exercise_type,
          })));
        }
      }
    } catch (error) {
      console.error("Error loading template:", error);
      toast.error("Failed to load workout");
    } finally {
      setLoading(false);
    }
  };

  const handleAddExercise = (exercise: { id: string; name: string; sets?: number; version?: number; exerciseType?: 'strength' | 'cardio' }) => {
    const newExercise: ExerciseEntry = {
      id: `ex-${Date.now()}`,
      exercise_id: exercise.id,
      name: exercise.name,
      sets: exercise.sets || 3,
      reps: exercise.exerciseType === 'cardio' ? '' : '8-12',
      rest_seconds: 90, // Default rest
      exerciseType: exercise.exerciseType,
    };
    setExercises(prev => [...prev, newExercise]);
    setShowAddExercise(false);
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setExercises(prev => prev.filter(ex => ex.id !== exerciseId));
  };

  const handleUpdateExercise = (exerciseId: string, updates: Partial<ExerciseEntry>) => {
    setExercises(prev => prev.map(ex => 
      ex.id === exerciseId ? { ...ex, ...updates } : ex
    ));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (exercises.length === 0) {
      toast.error("Please add at least one exercise");
      return;
    }

    setSaving(true);
    try {
      const exerciseData = exercises.map((ex, index) => ({
        exercise_id: ex.exercise_id,
        name: ex.name,
        sets: ex.sets,
        reps: parseInt(ex.reps) || 0,
        reps_min: undefined,
        reps_max: undefined,
        rest_seconds: ex.rest_seconds || 90,
        notes: ex.notes || undefined,
        exercise_type: ex.exerciseType,
        order_index: index,
      }));

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
            exercise_data: exerciseData,
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

        {/* Exercises */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Exercises</CardTitle>
              <Badge variant="secondary">{exercises.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {exercises.length === 0 ? (
              <div className="text-center py-8">
                <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  No exercises added yet
                </p>
                <Button onClick={() => setShowAddExercise(true)} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Exercise
                </Button>
              </div>
            ) : (
              <>
                {exercises.map((exercise, index) => (
                  <div 
                    key={exercise.id}
                    className="p-3 rounded-lg bg-muted/50 space-y-2"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="h-8 w-8 rounded-lg bg-primary/12 flex items-center justify-center flex-shrink-0">
                        {exercise.exerciseType === 'cardio' ? (
                          <Heart className="h-4 w-4 text-primary" />
                        ) : (
                          <Dumbbell className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{exercise.name}</p>
                      </div>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => handleRemoveExercise(exercise.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 pl-10">
                      <Input
                        type="number"
                        value={exercise.sets}
                        onChange={(e) => handleUpdateExercise(exercise.id, { sets: parseInt(e.target.value) || 3 })}
                        className="w-14 h-7 text-xs"
                        min={1}
                        max={10}
                      />
                      <span className="text-xs text-muted-foreground">sets</span>
                      {exercise.exerciseType !== 'cardio' && (
                        <>
                          <span className="text-muted-foreground">×</span>
                          <Input
                            value={exercise.reps}
                            onChange={(e) => handleUpdateExercise(exercise.id, { reps: e.target.value })}
                            className="w-14 h-7 text-xs"
                            placeholder="8-12"
                          />
                          <span className="text-xs text-muted-foreground">reps</span>
                        </>
                      )}
                      <div className="ml-auto flex items-center gap-1">
                        <Timer className="h-3 w-3 text-muted-foreground" />
                        <Select 
                          value={(exercise.rest_seconds || 90).toString()} 
                          onValueChange={(v) => handleUpdateExercise(exercise.id, { rest_seconds: parseInt(v) })}
                        >
                          <SelectTrigger className="h-7 w-20 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[30, 45, 60, 75, 90, 105, 120, 150, 180, 240, 300].map(s => (
                              <SelectItem key={s} value={s.toString()}>
                                {s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  className="w-full mt-3 gap-2"
                  onClick={() => setShowAddExercise(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Exercise
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Add Exercise Sheet */}
      {showAddExercise && (
        <AddExerciseSheet
          onAdd={handleAddExercise}
          onClose={() => setShowAddExercise(false)}
        />
      )}
    </div>
  );
}
