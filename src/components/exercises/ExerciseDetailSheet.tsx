import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Dumbbell, Activity, User, Edit2, Trash2, Calendar, TrendingUp, Weight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Exercise } from '@/types/exercise';
import { MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS, MODALITY_LABELS } from '@/types/exercise';
import { getExerciseImage } from '@/utils/equipmentImages';
import { useExerciseHistory } from '@/hooks/useExerciseHistory';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ExerciseDetailSheetProps {
  exercise: Exercise;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  onAdd?: () => void;
  showAddButton?: boolean;
}

export function ExerciseDetailSheet({ 
  exercise, 
  onClose, 
  onEdit, 
  onDelete,
  onAdd,
  showAddButton 
}: ExerciseDetailSheetProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  
  const { history, stats, isLoading: isLoadingHistory } = useExerciseHistory(exercise.exercise_id);
  
  const isCustom = exercise.source === 'user';
  const isStrength = exercise.type === 'strength';
  const canEdit = isCustom && onEdit;
  const canDelete = isCustom && onDelete;
  
  const exerciseImage = getExerciseImage(exercise);

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[120]"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[130] shadow-elevated max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="p-4 pb-0 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 left-1/2 -translate-x-1/2 p-1"
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 pb-footer-safe"> 
          <div className="pt-6 pb-6">
            {/* Header with Image */}
            <div className="flex items-start gap-4 mb-4">
              {exerciseImage ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted/50 flex-shrink-0">
                  <img 
                    src={exerciseImage} 
                    alt={exercise.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isStrength ? 'bg-primary/10 text-primary' : 'bg-accent/50 text-accent-foreground'
                }`}>
                  {isStrength ? <Dumbbell className="h-8 w-8" /> : <Activity className="h-8 w-8" />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-semibold truncate">{exercise.name}</h3>
                  {isCustom && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-secondary/50 rounded text-[10px] font-medium text-muted-foreground flex-shrink-0">
                      <User className="h-2.5 w-2.5" />
                      Custom
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground capitalize">
                  {isStrength ? 'Strength' : 'Cardio'}
                </p>
                {stats.lastPerformed && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last performed {formatDistanceToNow(new Date(stats.lastPerformed), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
            
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'details' | 'history')} className="w-full">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                <TabsTrigger value="history" className="flex-1">
                  History {stats.totalSessions > 0 && `(${stats.totalSessions})`}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="mt-0">
                <div className="space-y-4">
                  {isStrength && exercise.primary_muscle && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Muscle Groups
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                          {MUSCLE_GROUP_LABELS[exercise.primary_muscle]}
                        </span>
                        {exercise.secondary_muscles?.map(muscle => (
                          <span key={muscle} className="px-2.5 py-1 bg-muted rounded-full text-sm text-muted-foreground">
                            {MUSCLE_GROUP_LABELS[muscle]}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {isStrength && exercise.equipment && exercise.equipment.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Equipment
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {exercise.equipment.map(eq => (
                          <span key={eq} className="px-2.5 py-1 bg-muted rounded-full text-sm">
                            {EQUIPMENT_LABELS[eq]}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {!isStrength && exercise.modality && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Modality
                      </p>
                      <span className="px-2.5 py-1 bg-accent/50 rounded-full text-sm">
                        {MODALITY_LABELS[exercise.modality]}
                      </span>
                    </div>
                  )}
                  
                  {exercise.instructions && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Instructions
                      </p>
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {exercise.instructions}
                      </p>
                    </div>
                  )}
                  
                  {/* Quick Stats */}
                  {stats.totalSessions > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Your Stats
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-muted/30 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold">{stats.totalSessions}</p>
                          <p className="text-xs text-muted-foreground">Sessions</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold">{stats.totalSets}</p>
                          <p className="text-xs text-muted-foreground">Total Sets</p>
                        </div>
                        {isStrength && stats.bestWeight > 0 && (
                          <div className="bg-muted/30 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold">{stats.bestWeight}</p>
                            <p className="text-xs text-muted-foreground">Best (lbs)</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="history" className="mt-0">
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No history yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Complete a workout with this exercise to see your history
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((entry) => (
                      <div key={entry.id} className="bg-muted/30 rounded-xl p-3 border border-border/30">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">{entry.workout_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(entry.workout_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                          {entry.best_set && isStrength && (
                            <div className="text-right">
                              <p className="text-sm font-semibold text-primary">
                                {entry.best_set.weight} × {entry.best_set.reps}
                              </p>
                              <p className="text-xs text-muted-foreground">Best set</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Sets */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {entry.sets.map((set) => (
                            <div 
                              key={set.set_number}
                              className="px-2 py-1 bg-background/50 rounded text-xs"
                            >
                              {isStrength ? (
                                <span>
                                  {set.completed_weight || 0} × {set.completed_reps || 0}
                                  {set.rpe && <span className="text-muted-foreground ml-1">@{set.rpe}</span>}
                                </span>
                              ) : (
                                <span>Set {set.set_number}</span>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {isStrength && entry.total_volume > 0 && (
                          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/30">
                            <TrendingUp className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {entry.total_volume.toLocaleString()} lbs total volume
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
            
            {/* Actions */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-border/50">
              {canEdit && (
                <Button
                  variant="outline"
                  onClick={onEdit}
                  className="flex-1"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              {showAddButton && onAdd && (
                <Button onClick={onAdd} className="flex-1">
                  Add to Workout
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
      
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exercise?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{exercise.name}" from your library. Your workout history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
