import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Dumbbell, Activity, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { 
  CreateExerciseInput, 
  ExerciseType, 
  MuscleGroup, 
  EquipmentType,
  CardioModality 
} from '@/types/exercise';
import { MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS, MODALITY_LABELS } from '@/types/exercise';

interface CreateExerciseSheetProps {
  onClose: () => void;
  onCreate: (input: CreateExerciseInput) => Promise<unknown>;
  isCreating?: boolean;
}

const muscleGroups: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'abs', 'obliques', 'lower_back'
];

const equipmentTypes: EquipmentType[] = [
  'barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 
  'bodyweight', 'resistance_band', 'pull_up_bar', 'dip_bars', 'bench'
];

const cardioModalities: CardioModality[] = [
  'run', 'bike', 'row', 'swim', 'elliptical', 'stair_climber', 'jump_rope', 'walking', 'other'
];

export function CreateExerciseSheet({ onClose, onCreate, isCreating }: CreateExerciseSheetProps) {
  const [step, setStep] = useState<'type' | 'details'>('type');
  const [type, setType] = useState<ExerciseType | null>(null);
  const [name, setName] = useState('');
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleGroup | null>(null);
  const [equipment, setEquipment] = useState<EquipmentType[]>([]);
  const [modality, setModality] = useState<CardioModality | null>(null);
  const [instructions, setInstructions] = useState('');

  const handleSelectType = (selectedType: ExerciseType) => {
    setType(selectedType);
    setStep('details');
  };

  const toggleEquipment = (eq: EquipmentType) => {
    setEquipment(prev => 
      prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq]
    );
  };

  const handleCreate = async () => {
    if (!type || !name.trim()) return;
    
    await onCreate({
      name: name.trim(),
      type,
      primary_muscle: type === 'strength' ? primaryMuscle : null,
      equipment: type === 'strength' ? equipment : [],
      modality: type === 'cardio' ? modality : null,
      instructions: instructions.trim() || undefined,
    });
    
    onClose();
  };

  const isValid = name.trim() && type && (
    type === 'cardio' || (type === 'strength' && primaryMuscle)
  );

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
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 shadow-elevated max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="p-4 pb-0 relative">
          <button
            onClick={onClose}
            className="absolute top-3 left-1/2 -translate-x-1/2 p-1"
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </button>
          
          <h3 className="text-lg font-semibold text-center pt-4 mb-1">Create Exercise</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            {step === 'type' ? 'Choose exercise type' : 'Enter details'}
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 pb-safe">
          {step === 'type' ? (
            <div className="space-y-3 pb-6">
              <button
                onClick={() => handleSelectType('strength')}
                className="w-full bg-muted/30 rounded-xl p-4 border border-border/30 flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Dumbbell className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Strength</p>
                  <p className="text-sm text-muted-foreground">Weight, reps, sets</p>
                </div>
              </button>
              
              <button
                onClick={() => handleSelectType('cardio')}
                className="w-full bg-muted/30 rounded-xl p-4 border border-border/30 flex items-center gap-4 active:scale-[0.98] transition-transform text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/50 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  <p className="font-semibold">Cardio</p>
                  <p className="text-sm text-muted-foreground">Time, distance, intervals</p>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-5 pb-6">
              {/* Exercise name */}
              <div className="space-y-2">
                <Label htmlFor="name">Exercise Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Incline Hammer Curl"
                  className="h-11"
                />
              </div>
              
              {type === 'strength' && (
                <>
                  {/* Primary muscle group */}
                  <div className="space-y-2">
                    <Label>Primary Muscle Group</Label>
                    <div className="flex flex-wrap gap-2">
                      {muscleGroups.map(muscle => (
                        <button
                          key={muscle}
                          onClick={() => setPrimaryMuscle(muscle)}
                          className={`
                            px-3 py-1.5 rounded-full text-sm border transition-colors
                            ${primaryMuscle === muscle
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/50 text-muted-foreground border-border/50'
                            }
                          `}
                        >
                          {MUSCLE_GROUP_LABELS[muscle]}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Equipment */}
                  <div className="space-y-2">
                    <Label>Equipment (optional)</Label>
                    <div className="flex flex-wrap gap-2">
                      {equipmentTypes.map(eq => (
                        <button
                          key={eq}
                          onClick={() => toggleEquipment(eq)}
                          className={`
                            px-3 py-1.5 rounded-full text-sm border transition-colors flex items-center gap-1.5
                            ${equipment.includes(eq)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/50 text-muted-foreground border-border/50'
                            }
                          `}
                        >
                          {equipment.includes(eq) && <Check className="h-3 w-3" />}
                          {EQUIPMENT_LABELS[eq]}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              {type === 'cardio' && (
                <div className="space-y-2">
                  <Label>Modality (optional)</Label>
                  <div className="flex flex-wrap gap-2">
                    {cardioModalities.map(mod => (
                      <button
                        key={mod}
                        onClick={() => setModality(modality === mod ? null : mod)}
                        className={`
                          px-3 py-1.5 rounded-full text-sm border transition-colors
                          ${modality === mod
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/50 text-muted-foreground border-border/50'
                          }
                        `}
                      >
                        {MODALITY_LABELS[mod]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Instructions */}
              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions (optional)</Label>
                <Textarea
                  id="instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Brief description of how to perform the exercise..."
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('type')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!isValid || isCreating}
                  className="flex-1"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
