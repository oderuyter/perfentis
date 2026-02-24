import { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Dumbbell, Activity, Check, Camera, X, Clock, Hash, Weight, Search, Plus, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMuscleTaxonomy } from '@/hooks/useMuscleTaxonomy';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import { toast } from 'sonner';
import type { 
  CreateExerciseInput, 
  ExerciseType,
  ExerciseRecordType,
  CardioModality 
} from '@/types/exercise';
import { MODALITY_LABELS, RECORD_TYPE_LABELS } from '@/types/exercise';

interface CreateExerciseSheetProps {
  onClose: () => void;
  onCreate: (input: CreateExerciseInput) => Promise<unknown>;
  isCreating?: boolean;
}

const cardioModalities: CardioModality[] = [
  'run', 'bike', 'row', 'swim', 'elliptical', 'stair_climber', 'jump_rope', 'walking', 'other'
];

const strengthRecordTypes: { value: ExerciseRecordType; icon: any; desc: string }[] = [
  { value: 'weight_reps', icon: Weight, desc: 'Weight & Reps (e.g. Bench Press)' },
  { value: 'reps', icon: Hash, desc: 'Reps Only (e.g. Push-ups)' },
  { value: 'duration', icon: Clock, desc: 'Duration Only (e.g. Plank)' },
  { value: 'reps_duration', icon: Hash, desc: 'Reps & Duration (e.g. Isometric Hold)' },
];

export function CreateExerciseSheet({ onClose, onCreate, isCreating }: CreateExerciseSheetProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { muscleGroups, getSubgroupsForGroup } = useMuscleTaxonomy();
  const { approvedEquipment, createEquipment, isCreating: isCreatingEquipment } = useEquipmentLibrary();
  
  const [step, setStep] = useState<'type' | 'record_type' | 'details'>('type');
  const [type, setType] = useState<ExerciseType | null>(null);
  const [recordType, setRecordType] = useState<ExerciseRecordType>('weight_reps');
  const [name, setName] = useState('');
  
  // DB-driven selections
  const [primaryGroupId, setPrimaryGroupId] = useState<string | null>(null);
  const [primarySubgroupId, setPrimarySubgroupId] = useState<string | null>(null);
  const [secondaryEntries, setSecondaryEntries] = useState<{ muscle_group_id: string; muscle_subgroup_id?: string }[]>([]);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [showSecondaryPicker, setShowSecondaryPicker] = useState(false);
  
  // Equipment search
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [showNewEquipment, setShowNewEquipment] = useState(false);
  const [newEquipmentName, setNewEquipmentName] = useState('');
  
  const [modality, setModality] = useState<CardioModality | null>(null);
  const [instructions, setInstructions] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced' | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const subgroups = primaryGroupId ? getSubgroupsForGroup(primaryGroupId) : [];

  // Equipment filtering
  const filteredEquipment = useMemo(() => {
    if (!equipmentSearch.trim()) return approvedEquipment;
    const q = equipmentSearch.toLowerCase();
    return approvedEquipment.filter(e => e.name.toLowerCase().includes(q));
  }, [approvedEquipment, equipmentSearch]);

  const noEquipmentMatch = equipmentSearch.trim().length > 1 && filteredEquipment.length === 0;

  const handleSelectType = (selectedType: ExerciseType) => {
    setType(selectedType);
    if (selectedType === 'cardio') {
      setRecordType('cardio');
      setStep('details');
    } else {
      setStep('record_type');
    }
  };

  const handleSelectRecordType = (rt: ExerciseRecordType) => {
    setRecordType(rt);
    setStep('details');
  };

  const toggleEquipment = (eqId: string) => {
    setSelectedEquipmentIds(prev => 
      prev.includes(eqId) ? prev.filter(e => e !== eqId) : [...prev, eqId]
    );
  };

  const handleAddNewEquipment = async () => {
    if (!newEquipmentName.trim()) return;
    try {
      const result = await createEquipment({ name: newEquipmentName.trim() });
      if (result?.id) {
        setSelectedEquipmentIds(prev => [...prev, result.id]);
      }
      setNewEquipmentName('');
      setShowNewEquipment(false);
      setEquipmentSearch('');
    } catch {
      // error handled by hook
    }
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be less than 5MB'); return; }

    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('exercise-images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('exercise-images').getPublicUrl(fileName);
      setImageUrl(publicUrl);
      toast.success('Image uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
      setImagePreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreate = async () => {
    if (!type || !name.trim()) return;
    
    await onCreate({
      name: name.trim(),
      type,
      record_type: recordType,
      primary_muscle_group_id: type === 'strength' ? primaryGroupId : null,
      primary_muscle_subgroup_id: type === 'strength' ? primarySubgroupId : null,
      secondary_muscle_entries: type === 'strength' ? secondaryEntries : [],
      equipment_ids: type === 'strength' ? selectedEquipmentIds : [],
      modality: type === 'cardio' ? modality : null,
      instructions: instructions.trim() || undefined,
      image_url: imageUrl,
      difficulty,
    });
    
    onClose();
  };

  const isValid = name.trim() && type && (
    type === 'cardio' || (type === 'strength' && primaryGroupId)
  );

  const selectedGroupName = primaryGroupId ? muscleGroups.find(g => g.id === primaryGroupId)?.name : null;

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
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[130] shadow-elevated max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="p-4 pb-0 relative flex-shrink-0">
          <button onClick={onClose} className="absolute top-3 left-1/2 -translate-x-1/2 p-1">
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </button>
          <h3 className="text-lg font-semibold text-center pt-4 mb-1">Create Exercise</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            {step === 'type' ? 'Choose exercise type' : step === 'record_type' ? 'How is this exercise tracked?' : 'Enter details'}
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
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
                  <p className="text-sm text-muted-foreground">Weight, reps, bodyweight</p>
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
          ) : step === 'record_type' ? (
            <div className="space-y-3 pb-6">
              {strengthRecordTypes.map(rt => {
                const Icon = rt.icon;
                return (
                  <button
                    key={rt.value}
                    onClick={() => handleSelectRecordType(rt.value)}
                    className={`w-full bg-muted/30 rounded-xl p-4 border flex items-center gap-4 active:scale-[0.98] transition-all text-left ${
                      recordType === rt.value ? 'border-primary bg-primary/5' : 'border-border/30'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{RECORD_TYPE_LABELS[rt.value]}</p>
                      <p className="text-xs text-muted-foreground">{rt.desc}</p>
                    </div>
                  </button>
                );
              })}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep('type')} className="flex-1">Back</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5 pb-6">
              {/* Image upload */}
              <div className="space-y-2">
                <Label>Exercise Image (optional)</Label>
                <div className="flex items-start gap-3">
                  {imagePreview ? (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted">
                      <img src={imagePreview} alt="Exercise preview" className="w-full h-full object-cover" />
                      {isUploading && (
                        <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {!isUploading && (
                        <button onClick={handleRemoveImage} className="absolute top-1 right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                          <X className="h-3 w-3 text-destructive-foreground" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <label className="w-20 h-20 rounded-xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
                      <Camera className="h-5 w-5 text-muted-foreground mb-1" />
                      <span className="text-[10px] text-muted-foreground">Add photo</span>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                    </label>
                  )}
                  <p className="text-xs text-muted-foreground flex-1 pt-2">Upload an image. Max 5MB.</p>
                </div>
              </div>
              
              {/* Exercise name */}
              <div className="space-y-2">
                <Label htmlFor="name">Exercise Name *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Incline Hammer Curl" className="h-11" />
              </div>

              {/* Record type badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Record Type:</span>
                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                  {RECORD_TYPE_LABELS[recordType]}
                </span>
                {type === 'strength' && (
                  <button onClick={() => setStep('record_type')} className="text-xs text-primary underline">Change</button>
                )}
              </div>
              
              {type === 'strength' && (
                <>
                  {/* Primary Muscle Group — Dropdown */}
                  <div className="space-y-2">
                    <Label>Primary Muscle Group *</Label>
                    <Select
                      value={primaryGroupId || ''}
                      onValueChange={(v) => {
                        setPrimaryGroupId(v || null);
                        setPrimarySubgroupId(null);
                      }}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select muscle group..." />
                      </SelectTrigger>
                      <SelectContent>
                        {muscleGroups.map(group => (
                          <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Primary Subgroup — Dropdown (only if group selected) */}
                  {subgroups.length > 0 && (
                    <div className="space-y-2">
                      <Label>Sub-muscle (optional)</Label>
                      <Select
                        value={primarySubgroupId || ''}
                        onValueChange={(v) => setPrimarySubgroupId(v || null)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select sub-muscle..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {subgroups.map(sg => (
                            <SelectItem key={sg.id} value={sg.id}>{sg.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Secondary Muscles — Compact multi-select */}
                  <div className="space-y-2">
                    <Label>Secondary Muscles (optional)</Label>
                    {secondaryEntries.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {secondaryEntries.map(entry => {
                          const groupName = muscleGroups.find(g => g.id === entry.muscle_group_id)?.name || '';
                          return (
                            <Badge
                              key={entry.muscle_group_id}
                              variant="secondary"
                              className="gap-1 cursor-pointer hover:bg-destructive/10"
                              onClick={() => setSecondaryEntries(prev => prev.filter(e => e.muscle_group_id !== entry.muscle_group_id))}
                            >
                              {groupName}
                              <X className="h-3 w-3" />
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                    <Popover open={showSecondaryPicker} onOpenChange={setShowSecondaryPicker}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="text-muted-foreground">
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Add secondary muscles
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2" align="start">
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {muscleGroups.filter(g => g.id !== primaryGroupId && !secondaryEntries.some(e => e.muscle_group_id === g.id)).map(group => (
                            <button
                              key={group.id}
                              onClick={() => {
                                setSecondaryEntries(prev => [...prev, { muscle_group_id: group.id }]);
                              }}
                              className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
                            >
                              {group.name}
                            </button>
                          ))}
                          {muscleGroups.filter(g => g.id !== primaryGroupId && !secondaryEntries.some(e => e.muscle_group_id === g.id)).length === 0 && (
                            <p className="text-xs text-muted-foreground px-3 py-2">All groups added</p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  {/* Equipment — Typeahead with chips */}
                  <div className="space-y-2">
                    <Label>Equipment (optional)</Label>
                    {selectedEquipmentIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {selectedEquipmentIds.map(id => {
                          const eq = approvedEquipment.find(e => e.id === id);
                          return (
                            <Badge
                              key={id}
                              variant="secondary"
                              className="gap-1 cursor-pointer hover:bg-destructive/10"
                              onClick={() => toggleEquipment(id)}
                            >
                              {eq?.name || id}
                              <X className="h-3 w-3" />
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                    
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search equipment..."
                        value={equipmentSearch}
                        onChange={(e) => { setEquipmentSearch(e.target.value); setShowNewEquipment(false); }}
                        className="pl-9 h-10"
                      />
                    </div>

                    {equipmentSearch.trim() && (
                      <div className="border border-border/50 rounded-lg max-h-36 overflow-y-auto">
                        {filteredEquipment.filter(e => !selectedEquipmentIds.includes(e.id)).map(eq => (
                          <button
                            key={eq.id}
                            onClick={() => { toggleEquipment(eq.id); setEquipmentSearch(''); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between"
                          >
                            {eq.name}
                            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        ))}
                        {noEquipmentMatch && !showNewEquipment && (
                          <div className="px-3 py-2">
                            <p className="text-xs text-muted-foreground mb-1.5">No equipment found</p>
                            <button
                              onClick={() => { setNewEquipmentName(equipmentSearch.trim()); setShowNewEquipment(true); }}
                              className="text-xs text-primary underline"
                            >
                              Can't find it? Submit new equipment
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Inline new equipment submission */}
                    {showNewEquipment && (
                      <div className="p-3 border border-border/50 rounded-lg bg-muted/20 space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground">This equipment will be available only to you until approved by admin.</p>
                        </div>
                        <Input
                          value={newEquipmentName}
                          onChange={(e) => setNewEquipmentName(e.target.value)}
                          placeholder="Equipment name"
                          className="h-9 text-sm"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowNewEquipment(false)}>Cancel</Button>
                          <Button
                            size="sm"
                            className="flex-1"
                            disabled={!newEquipmentName.trim() || isCreatingEquipment}
                            onClick={handleAddNewEquipment}
                          >
                            {isCreatingEquipment ? 'Submitting...' : 'Submit'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {type === 'cardio' && (
                <div className="space-y-2">
                  <Label>Modality (optional)</Label>
                  <Select
                    value={modality || ''}
                    onValueChange={(v) => setModality(v as CardioModality || null)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select modality..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {cardioModalities.map(mod => (
                        <SelectItem key={mod} value={mod}>{MODALITY_LABELS[mod]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Difficulty */}
              <div className="space-y-2">
                <Label>Difficulty (optional)</Label>
                <Select
                  value={difficulty || ''}
                  onValueChange={(v) => setDifficulty(v as any || null)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select difficulty..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
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
                  onClick={() => setStep(type === 'strength' ? 'record_type' : 'type')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!isValid || isCreating || isUploading}
                  className="flex-1"
                >
                  {isCreating ? 'Creating...' : 'Create Exercise'}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center pb-2">
                Your exercise will be saved as private. You can submit it for global approval later.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
