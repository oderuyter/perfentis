import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Dumbbell, Activity, User, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Exercise } from '@/types/exercise';
import { MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS, MODALITY_LABELS } from '@/types/exercise';
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
  
  const isCustom = exercise.source === 'user';
  const isStrength = exercise.type === 'strength';
  const canEdit = isCustom && onEdit;
  const canDelete = isCustom && onDelete;

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
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 shadow-elevated max-h-[70vh] overflow-hidden flex flex-col"
      >
        <div className="p-4 pb-0 relative">
          <button
            onClick={onClose}
            className="absolute top-3 left-1/2 -translate-x-1/2 p-1"
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 pb-safe">
          <div className="pt-6 pb-6">
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                isStrength ? 'bg-primary/10 text-primary' : 'bg-accent/50 text-accent-foreground'
              }`}>
                {isStrength ? <Dumbbell className="h-7 w-7" /> : <Activity className="h-7 w-7" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-semibold">{exercise.name}</h3>
                  {isCustom && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-secondary/50 rounded text-[10px] font-medium text-muted-foreground">
                      <User className="h-2.5 w-2.5" />
                      Custom
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground capitalize">
                  {isStrength ? 'Strength' : 'Cardio'}
                </p>
              </div>
            </div>
            
            {/* Details */}
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
            </div>
            
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
