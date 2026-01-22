import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Search, 
  Layers, 
  ChevronRight,
  Plus,
  Star,
  Users,
  User,
  Calendar,
  Target,
  Clock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrainingSplits, useActiveSplit } from "@/hooks/useTrainingSplits";
import { useAuth } from "@/hooks/useAuth";
import type { TrainingSplit, LibraryTab } from "@/types/workout-templates";

export function SplitDirectory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    splits, 
    isLoading, 
    activeTab, 
    setActiveTab, 
    filters, 
    updateFilters,
    clearFilters 
  } = useTrainingSplits();
  const { setActiveSplit, activeSplit } = useActiveSplit();

  const handleViewSplit = (split: TrainingSplit) => {
    navigate(`/train/split/${split.id}`);
  };

  const handleSetActive = (splitId: string) => {
    setActiveSplit.mutate(splitId);
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
          placeholder="Search splits..."
          value={filters.search || ""}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="pl-9 bg-surface-card/50"
        />
      </div>

      {/* Quick Filters */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2">
          {[3, 4, 5, 6].map((days) => {
            const isActive = filters.daysPerWeek === days;
            return (
              <Button
                key={days}
                variant={isActive ? "secondary" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => updateFilters({ daysPerWeek: isActive ? null : days })}
              >
                {days} days/week
              </Button>
            );
          })}
          {[4, 8, 12].map((weeks) => {
            const isActive = filters.weeks === weeks;
            return (
              <Button
                key={weeks}
                variant={isActive ? "secondary" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => updateFilters({ weeks: isActive ? null : weeks })}
              >
                {weeks} weeks
              </Button>
            );
          })}
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
      ) : splits.length === 0 ? (
        <div className="text-center py-8">
          <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium mb-1">
            {activeTab === 'my-library' ? 'No saved splits' : 'No splits found'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {activeTab === 'my-library' 
              ? 'Create a split to organize your training'
              : 'Try adjusting your filters'}
          </p>
          {filters.search || filters.daysPerWeek || filters.weeks ? (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {splits.map((split, index) => (
            <SplitCard 
              key={split.id} 
              split={split} 
              index={index}
              isActive={activeSplit?.split_id === split.id}
              onView={() => handleViewSplit(split)}
              onSetActive={() => handleSetActive(split.id)}
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
            onClick={() => navigate('/train/split/new')}
          >
            <Plus className="h-4 w-4" />
            Create New Split
          </Button>
        </div>
      )}
    </div>
  );
}

interface SplitCardProps {
  split: TrainingSplit;
  index: number;
  isActive: boolean;
  onView: () => void;
  onSetActive: () => void;
}

function SplitCard({ split, index, isActive, onView, onSetActive }: SplitCardProps) {
  const totalWorkouts = split.split_weeks?.reduce(
    (sum, w) => sum + (w.split_workouts?.length || 0),
    0
  ) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index }}
    >
      <div className="card-glass p-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/12 flex items-center justify-center flex-shrink-0">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-base text-foreground">
                  {split.title}
                </h3>
                {isActive && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    Active
                  </Badge>
                )}
              </div>
            </div>
            
            {split.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {split.description}
              </p>
            )}
            
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {split.weeks_count && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-xs">{split.weeks_count} weeks</span>
                </div>
              )}
              {split.days_per_week && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs">{split.days_per_week} days/week</span>
                </div>
              )}
              {totalWorkouts > 0 && (
                <span className="text-xs text-muted-foreground">
                  {totalWorkouts} workouts
                </span>
              )}
              {split.difficulty_level && (
                <Badge variant="outline" className="text-xs capitalize">
                  {split.difficulty_level}
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={onView}>
                View Details
              </Button>
              {!isActive && (
                <Button size="sm" onClick={onSetActive}>
                  Set Active
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
