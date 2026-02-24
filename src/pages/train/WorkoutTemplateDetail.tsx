import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Edit, Share, Trash2, MoreHorizontal, Clock, Dumbbell, Target, Users, Layers, Timer, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkoutTemplate, useWorkoutTemplates } from "@/hooks/useWorkoutTemplates";
import { useAuth } from "@/hooks/useAuth";
import { DIFFICULTY_LABELS, WORKOUT_TYPE_LABELS, isTemplateSupersetBlock, type WorkoutStructureData, type WorkoutTemplateExercise } from "@/types/workout-templates";
import { toast } from "sonner";

export default function WorkoutTemplateDetail() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: template, isLoading, error } = useWorkoutTemplate(templateId);
  const { deleteTemplate, incrementUseCount } = useWorkoutTemplates();

  const isOwner = user?.id === template?.owner_user_id;

  const handleStartWorkout = async () => {
    if (templateId) {
      await incrementUseCount(templateId);
      navigate(`/workout/template/${templateId}/active`);
    }
  };

  const handleDelete = async () => {
    if (!templateId) return;
    if (confirm("Delete this workout template? This cannot be undone.")) {
      await deleteTemplate.mutateAsync(templateId);
      navigate("/train?tab=workouts");
    }
  };

  // Count total exercises (including inside supersets)
  const getTotalExercises = () => {
    return (template?.exercise_data || []).reduce((count, item) => {
      if (isTemplateSupersetBlock(item)) {
        return count + item.items.length;
      }
      return count + 1;
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-page pt-safe px-4 pb-28">
        <header className="pt-14 pb-4">
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-4" />
          <div className="flex gap-4">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
        </header>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen gradient-page pt-safe px-4 pb-28 flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">Workout not found</p>
        <Button onClick={() => navigate("/train")}>Back to Train</Button>
      </div>
    );
  }

  // Render a single exercise item
  const renderExercise = (exercise: WorkoutTemplateExercise, index: number, isNested: boolean = false) => (
    <div key={`${exercise.exercise_id}-${index}`} className={`flex items-center gap-3 ${isNested ? '' : 'p-4'}`}>
      <div className={`h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 ${isNested ? 'h-8 w-8' : ''}`}>
        <span className={`font-bold text-primary ${isNested ? 'text-xs' : 'text-sm'}`}>
          {isNested ? String.fromCharCode(65 + index) : index + 1}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${isNested ? 'text-sm' : ''}`}>{exercise.name}</p>
        <p className="text-sm text-muted-foreground">
          {exercise.sets} sets × {exercise.reps_min && exercise.reps_max 
            ? `${exercise.reps_min}-${exercise.reps_max}`
            : exercise.reps} reps
          {exercise.rest_seconds && ` • ${exercise.rest_seconds}s rest`}
        </p>
      </div>
      {exercise.exercise_type && (
        <Badge variant="outline" className="capitalize shrink-0">
          {exercise.exercise_type}
        </Badge>
      )}
    </div>
  );

  // Block type config for display
  const BLOCK_DISPLAY: Record<string, { icon: typeof Dumbbell; label: string; borderClass: string; bgClass: string; iconBg: string }> = {
    superset: { icon: Layers, label: 'Superset', borderClass: 'border-primary/20', bgClass: 'bg-primary/5', iconBg: 'bg-primary/15' },
    emom: { icon: Timer, label: 'EMOM', borderClass: 'border-amber-500/20', bgClass: 'bg-amber-500/5', iconBg: 'bg-amber-500/15' },
    amrap: { icon: Zap, label: 'AMRAP', borderClass: 'border-red-500/20', bgClass: 'bg-red-500/5', iconBg: 'bg-red-500/15' },
    ygig: { icon: Users, label: 'YGIG', borderClass: 'border-blue-500/20', bgClass: 'bg-blue-500/5', iconBg: 'bg-blue-500/15' },
  };

  // Render workout item (exercise or block)
  const renderWorkoutItem = (item: WorkoutStructureData, index: number) => {
    const blockType = (item as any).type as string;
    const isBlock = blockType && BLOCK_DISPLAY[blockType];

    if (isBlock) {
      const display = BLOCK_DISPLAY[blockType];
      const Icon = display.icon;
      const blockItems = (item as any).items || [];
      const blockSettings = (item as any).settings || {};
      const blockName = (item as any).name || display.label;

      // Build summary text
      let summary = `${blockItems.length} exercises`;
      if (blockType === 'superset') {
        const rounds = (item as any).rounds || 1;
        if (rounds > 1) summary += ` • ${rounds} rounds`;
        if ((item as any).rest_after_round_seconds) summary += ` • ${(item as any).rest_after_round_seconds}s rest`;
      } else if (blockType === 'emom') {
        summary += ` • ${blockSettings.rounds || 10} rounds`;
      } else if (blockType === 'amrap') {
        summary += ` • ${Math.floor((blockSettings.time_cap_seconds || 600) / 60)} min cap`;
      } else if (blockType === 'ygig') {
        summary += ` • ${blockSettings.rounds || 3} rounds • ${blockSettings.max_participants || 2} partners`;
      }

      return (
        <Card key={(item as any).id || index} className={`glass-card ${display.borderClass} ${display.bgClass}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`h-10 w-10 rounded-lg ${display.iconBg} flex items-center justify-center shrink-0`}>
                <Icon className="h-5 w-5 text-foreground/70" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{blockName}</p>
                <p className="text-sm text-muted-foreground">{summary}</p>
              </div>
              <Badge variant="secondary" className="shrink-0">{display.label}</Badge>
            </div>
            <div className={`space-y-2 pl-2 border-l-2 ${display.borderClass} ml-5`}>
              {blockItems.map((ex: any, i: number) => renderExercise(ex as WorkoutTemplateExercise, i, true))}
            </div>
          </CardContent>
        </Card>
      );
    }

    // Regular exercise
    const exItem = item as WorkoutTemplateExercise;
    return (
      <Card key={`${exItem.exercise_id}-${index}`} className="glass-card">
        <CardContent className="p-4">
          {renderExercise(exItem, index)}
          {exItem.notes && (
            <p className="text-sm text-muted-foreground mt-2 pl-13">{exItem.notes}</p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen gradient-page pt-safe px-4 pb-28">
      <div className="fixed inset-0 gradient-glow pointer-events-none" />

      {/* Header */}
      <header className="relative pt-14 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/train?tab=workouts")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/train/workout/${templateId}/edit`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Workout
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info("Coming soon!")}>
                  <Share className="h-4 w-4 mr-2" />
                  Share to Community
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            {template.is_curated && <Badge variant="secondary">Curated</Badge>}
            {template.status === "approved" && !template.is_curated && (
              <Badge variant="outline">Community</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{template.title}</h1>
          {template.description && (
            <p className="text-muted-foreground mt-1">{template.description}</p>
          )}
        </motion.div>

        {/* Meta */}
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          {template.estimated_duration_minutes && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {template.estimated_duration_minutes} min
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Dumbbell className="h-4 w-4" />
            {getTotalExercises()} exercises
          </div>
          {template.use_count > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {template.use_count} uses
            </div>
          )}
          {template.difficulty_level && (
            <Badge variant="outline" className="capitalize">
              {DIFFICULTY_LABELS[template.difficulty_level]}
            </Badge>
          )}
          <Badge variant="outline" className="capitalize">
            {WORKOUT_TYPE_LABELS[template.workout_type]}
          </Badge>
        </div>

        {/* Start Button */}
        <Button onClick={handleStartWorkout} className="w-full mt-6" size="lg">
          <Play className="h-5 w-5 mr-2" />
          Start Workout
        </Button>
      </header>

      {/* Exercise List */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-4 space-y-3"
      >
        <h2 className="text-lg font-semibold mb-3">Exercises</h2>
        {template.exercise_data?.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              No exercises in this workout
            </CardContent>
          </Card>
        ) : (
          template.exercise_data?.map((item, index) => renderWorkoutItem(item, index))
        )}
      </motion.div>

      {/* Tags */}
      {template.tags && template.tags.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {template.tags.map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
