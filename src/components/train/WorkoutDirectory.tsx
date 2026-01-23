import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Search, 
  Dumbbell, 
  Heart, 
  Zap, 
  Clock, 
  ChevronRight,
  Plus,
  Star,
  Users,
  User,
  Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkoutTemplates } from "@/hooks/useWorkoutTemplates";
import { useAuth } from "@/hooks/useAuth";
import type { WorkoutTemplate, LibraryTab, WorkoutType } from "@/types/workout-templates";

const typeIcons: Record<WorkoutType, React.ElementType> = {
  strength: Dumbbell,
  cardio: Heart,
  mixed: Zap,
};

export function WorkoutDirectory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    templates, 
    isLoading, 
    activeTab, 
    setActiveTab, 
    filters, 
    updateFilters,
    clearFilters 
  } = useWorkoutTemplates();

  const handleViewWorkout = (template: WorkoutTemplate) => {
    navigate(`/train/workout/${template.id}`);
  };

  return (
    <div className="space-y-4">
      {/* Library Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LibraryTab)}>
        <TabsList className="w-full justify-start gap-1 h-auto p-1 bg-muted/50">
          <TabsTrigger value="curated" className="gap-1.5 text-xs px-3 py-1.5">
            <Star className="h-3.5 w-3.5" />
            Curated
          </TabsTrigger>
          <TabsTrigger value="community" className="gap-1.5 text-xs px-3 py-1.5">
            <Users className="h-3.5 w-3.5" />
            Community
          </TabsTrigger>
          {user && (
            <TabsTrigger value="my-library" className="gap-1.5 text-xs px-3 py-1.5">
              <User className="h-3.5 w-3.5" />
              My Library
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search workouts..."
          value={filters.search || ""}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="pl-9 bg-surface-card/50"
        />
      </div>

      {/* Quick Filters */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2">
          {(['strength', 'cardio', 'mixed'] as WorkoutType[]).map((type) => {
            const Icon = typeIcons[type];
            const isActive = filters.type === type;
            return (
              <Button
                key={type}
                variant={isActive ? "secondary" : "outline"}
                size="sm"
                className="gap-1.5 capitalize"
                onClick={() => updateFilters({ type: isActive ? null : type })}
              >
                <Icon className="h-3.5 w-3.5" />
                {type}
              </Button>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => updateFilters({ duration: filters.duration === 'short' ? null : 'short' })}
          >
            <Clock className="h-3.5 w-3.5" />
            &lt;30 min
          </Button>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-glass p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8">
          <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium mb-1">
            {activeTab === 'my-library' ? 'No saved workouts' : 'No workouts found'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {activeTab === 'my-library' 
              ? 'Complete a workout and save it to your library'
              : 'Try adjusting your filters'}
          </p>
          {filters.search || filters.type || filters.duration ? (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template, index) => (
            <WorkoutCard 
              key={template.id} 
              template={template} 
              index={index}
              onStart={() => handleViewWorkout(template)}
            />
          ))}
        </div>
      )}

      {/* Create New (for My Library tab) */}
      {activeTab === 'my-library' && user && (
        <div className="pt-2">
          <Button 
            variant="outline" 
            className="w-full border-dashed gap-2"
            onClick={() => navigate('/train/workout/new')}
          >
            <Plus className="h-4 w-4" />
            Create New Workout
          </Button>
        </div>
      )}
    </div>
  );
}

interface WorkoutCardProps {
  template: WorkoutTemplate;
  index: number;
  onStart: () => void;
}

function WorkoutCard({ template, index, onStart }: WorkoutCardProps) {
  const TypeIcon = typeIcons[template.workout_type];
  const exerciseCount = template.exercise_data?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index }}
    >
      <button 
        onClick={onStart}
        className="w-full text-left card-glass p-4 active:scale-[0.98] transition-transform"
      >
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/12 flex items-center justify-center flex-shrink-0">
            <TypeIcon className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base text-foreground truncate">
                {template.title}
              </h3>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </div>
            
            {template.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                {template.description}
              </p>
            )}
            
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {template.estimated_duration_minutes && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs">{template.estimated_duration_minutes} min</span>
                </div>
              )}
              <span className="text-xs text-muted-foreground capitalize">
                {template.workout_type}
              </span>
              {exerciseCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {exerciseCount} exercises
                </span>
              )}
              {template.difficulty_level && (
                <Badge variant="outline" className="text-xs capitalize">
                  {template.difficulty_level}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </button>
    </motion.div>
  );
}
