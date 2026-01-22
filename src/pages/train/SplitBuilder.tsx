import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Plus,
  Save,
  Calendar,
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronUp,
  Dumbbell
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useTrainingSplit, useTrainingSplits } from "@/hooks/useTrainingSplits";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { TrainingSplit, SplitWeek, WorkoutType, DifficultyLevel } from "@/types/workout-templates";

export default function SplitBuilder() {
  const { splitId } = useParams<{ splitId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = splitId === 'new';
  
  const { data: existingSplit, isLoading } = useTrainingSplit(isNew ? undefined : splitId);
  const { createSplit, addWeek, addWorkoutToWeek } = useTrainingSplits();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [weeksCount, setWeeksCount] = useState("4");
  const [daysPerWeek, setDaysPerWeek] = useState("4");
  const [workoutType, setWorkoutType] = useState<WorkoutType>("mixed");
  const [difficulty, setDifficulty] = useState<DifficultyLevel | "">("");
  const [saving, setSaving] = useState(false);

  // Load existing split data
  useEffect(() => {
    if (existingSplit) {
      setTitle(existingSplit.title);
      setDescription(existingSplit.description || "");
      setWeeksCount(existingSplit.weeks_count?.toString() || "4");
      setDaysPerWeek(existingSplit.days_per_week?.toString() || "4");
      setWorkoutType(existingSplit.workout_type);
      setDifficulty(existingSplit.difficulty_level || "");
    }
  }, [existingSplit]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const result = await createSplit.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
          weeks_count: parseInt(weeksCount),
          days_per_week: parseInt(daysPerWeek),
          workout_type: workoutType,
          difficulty_level: difficulty || undefined,
        });
        toast.success("Split created");
        navigate(`/train/split/${result.id}/edit`);
      } else {
        // Update existing split
        const { error } = await supabase
          .from('training_splits')
          .update({
            title: title.trim(),
            description: description.trim() || null,
            weeks_count: parseInt(weeksCount),
            days_per_week: parseInt(daysPerWeek),
            workout_type: workoutType,
            difficulty_level: difficulty || null,
          })
          .eq('id', splitId);

        if (error) throw error;
        toast.success("Split updated");
      }
    } catch (error) {
      console.error("Error saving split:", error);
      toast.error("Failed to save split");
    } finally {
      setSaving(false);
    }
  };

  const handleAddWeek = async () => {
    if (!splitId || isNew) return;
    await addWeek.mutateAsync(splitId);
  };

  const handleAddWorkout = async (weekId: string) => {
    await addWorkoutToWeek.mutateAsync({
      weekId,
      dayLabel: `Day ${(existingSplit?.split_weeks?.find(w => w.id === weekId)?.split_workouts?.length || 0) + 1}`,
    });
  };

  if (isLoading && !isNew) {
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
          {isNew ? 'Create Split' : 'Edit Split'}
        </motion.h1>
      </header>

      {/* Split Details Form */}
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
                placeholder="e.g., Push Pull Legs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this split about?"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (weeks)</Label>
                <Select value={weeksCount} onValueChange={setWeeksCount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[4, 6, 8, 10, 12, 16].map(n => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} weeks
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Days per week</Label>
                <Select value={daysPerWeek} onValueChange={setDaysPerWeek}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 4, 5, 6, 7].map(n => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} days
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
          </CardContent>
        </Card>

        {/* Weeks Editor (only for existing splits) */}
        {!isNew && existingSplit?.split_weeks && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Weeks & Workouts</CardTitle>
                <Button size="sm" variant="outline" onClick={handleAddWeek}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Week
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {existingSplit.split_weeks.map((week) => (
                  <AccordionItem key={week.id} value={week.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-sm font-medium">
                          W{week.week_number}
                        </div>
                        <span className="font-medium">{week.name || `Week ${week.week_number}`}</span>
                        <Badge variant="secondary" className="ml-2">
                          {week.split_workouts?.length || 0} workouts
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pl-10">
                        {week.split_workouts?.map((workout, index) => (
                          <div 
                            key={workout.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <div className="h-6 w-6 rounded bg-muted flex items-center justify-center text-xs">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {workout.day_label || `Workout ${workout.order_index + 1}`}
                              </p>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ))}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-2"
                          onClick={() => handleAddWorkout(week.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Workout
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
