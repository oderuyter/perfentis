import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Edit, Share, Trash2, MoreHorizontal, Clock, Dumbbell, Target, Users } from "lucide-react";
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
import { DIFFICULTY_LABELS, WORKOUT_TYPE_LABELS } from "@/types/workout-templates";
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
            {template.exercise_data?.length || 0} exercises
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
          template.exercise_data?.map((exercise, index) => (
            <Card key={`${exercise.exercise_id}-${index}`} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{exercise.name}</p>
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
                {exercise.notes && (
                  <p className="text-sm text-muted-foreground mt-2 pl-13">{exercise.notes}</p>
                )}
              </CardContent>
            </Card>
          ))
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
