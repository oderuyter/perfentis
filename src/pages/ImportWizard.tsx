import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, Upload, FileSpreadsheet, Download, X, AlertTriangle, CheckCircle2, Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import ImportStructureEditor from '@/components/import/ImportStructureEditor';

import { useImportWizard } from '@/hooks/useImportWizard';
import { useExerciseLibrary } from '@/hooks/useExerciseLibrary';
import { findBestMatch } from '@/lib/exerciseMatching';
import { IMPORT_STEPS, STEP_LABELS, IMPORT_FORMAT_LABELS } from '@/types/import';
import type { ImportStep, ExerciseMatch, ImportFormat, ParsedImport, ParsedWeek } from '@/types/import';
import type { MuscleGroup, EquipmentType } from '@/types/exercise';
import { MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS } from '@/types/exercise';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ImportWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isCoach = searchParams.get('context') === 'coach';
  const coachId = searchParams.get('coachId') || undefined;
  const returnTo = searchParams.get('returnTo') || '/train';

  const {
    state, isParsing, isCreating,
    setStep, setMetadata, setDetectedFormat, updateParsedData,
    uploadAndParse, updateMatch, fixError, skipError,
    hasBlockingErrors, hasUnresolvedMatches, createEntities, reset,
  } = useImportWizard(isCoach, coachId);

  const { allExercises } = useExerciseLibrary();
  const [dragOver, setDragOver] = useState(false);
  const [customDialog, setCustomDialog] = useState<{ index: number } | null>(null);
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState<'strength' | 'cardio'>('strength');
  const [customMuscle, setCustomMuscle] = useState('');
  const [customEquipment, setCustomEquipment] = useState<string[]>([]);
  const [searchExercise, setSearchExercise] = useState('');

  const currentStepIndex = IMPORT_STEPS.indexOf(state.step);
  const totalSteps = IMPORT_STEPS.length;

  const handleFileSelect = (file: File) => {
    const validTypes = ['.pdf', '.xlsx', '.xls', '.csv'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(ext)) {
      toast.error('Unsupported file type. Please upload PDF, Excel, or CSV.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum 10MB.');
      return;
    }
    uploadAndParse(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const downloadTemplate = () => {
    const csv = `Type,Plan Name,Week,Day/Workout Name,Exercise Name,Category,Equipment,Sets,Reps,Load,Rest (seconds),Notes,Superset Group
Plan,My Training Plan,1,Push Day,Bench Press,Strength,Barbell,4,8-12,RPE 7,90,Focus on chest contraction,
Plan,My Training Plan,1,Push Day,Overhead Press,Strength,Barbell,3,8-10,RPE 7,90,,
Plan,My Training Plan,1,Push Day,Lateral Raise,Strength,Dumbbell,3,12-15,,60,,A
Plan,My Training Plan,1,Push Day,Tricep Pushdown,Strength,Cable,3,12-15,,60,,A
Plan,My Training Plan,1,Pull Day,Barbell Row,Strength,Barbell,4,8-10,RPE 7,90,,
Plan,My Training Plan,1,Pull Day,Pull Up,Strength,Bodyweight,3,8-12,,90,,
Plan,My Training Plan,1,Pull Day,Face Pull,Strength,Cable,3,15-20,,60,,
Plan,My Training Plan,2,Push Day,Bench Press,Strength,Barbell,4,6-8,RPE 8,120,Increase weight from Week 1,`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workout_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmCreate = async () => {
    const success = await createEntities();
    if (success) {
      navigate(returnTo);
    }
  };

  const openCustomDialog = (index: number) => {
    const match = state.exerciseMatches[index];
    setCustomName(match.original_text);
    setCustomType('strength');
    setCustomMuscle('');
    setCustomEquipment([]);
    setCustomDialog({ index });
  };

  const saveCustomExercise = (submit: boolean) => {
    if (!customDialog || !customName.trim()) return;
    updateMatch(customDialog.index, {
      decision: submit ? 'submit' : 'custom',
      custom_exercise_name: customName.trim(),
      custom_exercise_type: customType,
      custom_exercise_muscle: customMuscle || undefined,
      custom_exercise_equipment: customEquipment.length > 0 ? customEquipment : undefined,
    });
    setCustomDialog(null);
  };

  // Stats for confirmation screen
  const autoMatched = state.exerciseMatches.filter(m => m.decision === 'auto').length;
  const manualMatched = state.exerciseMatches.filter(m => m.decision === 'manual').length;
  const customCreated = state.exerciseMatches.filter(m => m.decision === 'custom').length;
  const submitted = state.exerciseMatches.filter(m => m.decision === 'submit').length;
  const skipped = state.exerciseMatches.filter(m => m.decision === 'skip').length;

  const totalWorkouts = state.parsedData?.weeks.reduce((sum, w) => sum + w.workouts.length, 0) || 0;
  const totalExercises = state.exerciseMatches.length;

  return (
    <div className="min-h-screen gradient-page">
      <div className="fixed inset-0 gradient-glow pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => state.step === 'upload' ? navigate(returnTo) : setStep(IMPORT_STEPS[currentStepIndex - 1])}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Import {isCoach ? 'Plan' : 'Workout / Split'}</h1>
            <p className="text-sm text-muted-foreground">Step {currentStepIndex + 1} of {totalSteps}: {STEP_LABELS[state.step]}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(returnTo)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar */}
        <Progress value={((currentStepIndex + 1) / totalSteps) * 100} className="mb-6 h-1.5" />

        {/* Step 1: Upload */}
        {state.step === 'upload' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle>Upload Your File</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div
                  className={cn(
                    "border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer",
                    dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
                  )}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-1">Drop your file here or click to browse</p>
                  <p className="text-sm text-muted-foreground">Supports PDF, Excel (.xlsx/.xls), and CSV</p>
                  <input
                    id="file-input"
                    type="file"
                    className="hidden"
                    accept=".pdf,.xlsx,.xls,.csv"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  />
                </div>

                {/* Metadata */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Name Override (optional)</Label>
                    <Input
                      placeholder="Custom name for the import"
                      value={state.metadata.name_override || ''}
                      onChange={(e) => setMetadata({ name_override: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Goal Tags (optional)</Label>
                    <Input
                      placeholder="e.g. hypertrophy, strength"
                      onChange={(e) => setMetadata({ goal_tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                    />
                  </div>
                </div>

                {/* Template Download */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Download Template</p>
                      <p className="text-xs text-muted-foreground">Use our recommended format for best results</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Detect (shown briefly during parsing) */}
        {state.step === 'detect' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="py-16 text-center">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
                <h3 className="text-lg font-medium mb-2">Parsing your file...</h3>
                <p className="text-muted-foreground">Detecting structure and extracting exercises</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Review */}
        {state.step === 'review' && state.parsedData && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Detected Structure</CardTitle>
                  <Badge variant="secondary" className="text-sm">
                    {Math.round((state.parsedData.confidence || 0) * 100)}% confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Label>Format:</Label>
                  <Select
                    value={state.parsedData.detected_format}
                    onValueChange={(v) => setDetectedFormat(v as ImportFormat)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single_workout">Single Workout</SelectItem>
                      <SelectItem value="split">Training Split</SelectItem>
                      <SelectItem value="coach_plan">Coach Training Plan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {state.parsedData.plan_name && (
                  <div className="flex items-center gap-3">
                    <Label>Plan Name:</Label>
                    <Input
                      value={state.parsedData.plan_name}
                      onChange={(e) => updateParsedData({ ...state.parsedData!, plan_name: e.target.value })}
                      className="max-w-xs"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Interactive structure editor */}
            <ImportStructureEditor
              parsedData={state.parsedData}
              onUpdate={updateParsedData}
            />

            <div className="flex justify-end">
              <Button onClick={() => setStep('matching')}>
                Continue to Matching <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Exercise Matching */}
        {state.step === 'matching' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Summary bar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-base font-semibold">Exercise Matching</h2>
              <div className="flex gap-2 items-center">
                <Badge variant="default">{autoMatched + manualMatched} matched</Badge>
                {state.exerciseMatches.filter(m => m.decision === 'pending').length > 0 && (
                  <>
                    <Badge variant="destructive">
                      {state.exerciseMatches.filter(m => m.decision === 'pending').length} need review
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        state.exerciseMatches.forEach((match, idx) => {
                          if (match.decision === 'pending' && match.matched_exercise_id && match.confidence > 0) {
                            updateMatch(idx, {
                              decision: 'manual',
                              confidence: match.confidence,
                            });
                          }
                        });
                      }}
                    >
                      <Check className="h-3 w-3 mr-1" /> Accept all suggestions
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Exercise cards — no wrapper Card, native page scroll */}
            <div className="space-y-3">
              {state.exerciseMatches.map((match, idx) => (
                <div key={idx} className={cn(
                  "p-3 rounded-lg border",
                  match.decision === 'auto' ? "border-primary/20 bg-primary/5" :
                  match.decision === 'manual' ? "border-accent/20 bg-accent/5" :
                  match.decision === 'custom' || match.decision === 'submit' ? "border-secondary/30 bg-secondary/5" :
                  match.decision === 'skip' ? "border-muted bg-muted/30" :
                  "border-destructive/30 bg-destructive/5"
                )}>
                  {/* Exercise name + status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm break-words">{match.original_text}</p>
                      {match.decision !== 'pending' && match.decision !== 'skip' && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          → {match.decision === 'custom' || match.decision === 'submit'
                            ? match.custom_exercise_name
                            : match.matched_exercise_name}
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            {match.decision === 'auto' ? `${Math.round(match.confidence * 100)}%` : match.decision}
                          </Badge>
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground shrink-0"
                      onClick={() => updateMatch(idx, { decision: 'skip' })}
                    >
                      Skip
                    </Button>
                  </div>

                  {/* Match dropdown — full width, includes "Create custom" option */}
                  <Select
                    value={match.matched_exercise_id || ''}
                    onValueChange={(v) => {
                      if (v === '__create_custom__') {
                        openCustomDialog(idx);
                        return;
                      }
                      const ex = allExercises.find(e => e.exercise_id === v);
                      if (ex) {
                        updateMatch(idx, {
                          matched_exercise_id: ex.exercise_id,
                          matched_exercise_name: ex.name,
                          confidence: 1,
                          decision: 'manual',
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full h-9 text-sm">
                      <SelectValue placeholder="Select exercise…" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Best fuzzy matches using parsed name, not full original text */}
                      {findBestMatch(match.parsed_exercise.name, allExercises, 10).map((r) => (
                        <SelectItem key={r.exercise.exercise_id} value={r.exercise.exercise_id}>
                          {r.exercise.name} ({Math.round(r.confidence * 100)}%)
                        </SelectItem>
                      ))}
                      {/* Divider + create custom option */}
                      <SelectItem value="__create_custom__" className="text-primary font-medium">
                        <span className="flex items-center gap-1.5">
                          <Plus className="h-3.5 w-3.5" /> Create custom exercise
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('review')}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button onClick={() => setStep('validation')} disabled={hasUnresolvedMatches}>
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 5: Validation */}
        {state.step === 'validation' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {state.validationErrors.length === 0 ? (
                    <><CheckCircle2 className="h-5 w-5 text-primary" /> No Issues Found</>
                  ) : (
                    <><AlertTriangle className="h-5 w-5 text-destructive" /> {state.validationErrors.filter(e => !e.fixed && !e.skipped).length} Issue{state.validationErrors.filter(e => !e.fixed && !e.skipped).length !== 1 ? 's' : ''} to Resolve</>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {state.validationErrors.length === 0 ? (
                  <p className="text-muted-foreground">All data looks valid. You can proceed to create.</p>
                ) : (
                  <div className="space-y-3">
                    {state.validationErrors.map((err) => (
                      <div key={err.id} className={cn(
                        "p-3 rounded-lg border flex items-start gap-3",
                        err.fixed ? "border-primary/20 bg-primary/5" :
                        err.skipped ? "border-muted bg-muted/30" :
                        "border-destructive/30 bg-destructive/5"
                      )}>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{err.message}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {err.location.workout && `${err.location.workout}`}
                            {err.location.exercise && ` → ${err.location.exercise}`}
                          </p>
                        </div>
                        {!err.fixed && !err.skipped && err.fixable && (
                          <div className="flex items-center gap-2">
                            <Input
                              className="w-20 h-8 text-xs"
                              placeholder="Value"
                              onChange={(e) => fixError(err.id, e.target.value)}
                            />
                            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => skipError(err.id)}>
                              Skip
                            </Button>
                          </div>
                        )}
                        {(err.fixed || err.skipped) && (
                          <Badge variant={err.fixed ? "default" : "secondary"} className="text-xs">
                            {err.fixed ? 'Fixed' : 'Skipped'}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('matching')}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button onClick={() => setStep('confirm')} disabled={hasBlockingErrors}>
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 6: Confirm */}
        {state.step === 'confirm' && state.parsedData && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Import Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Creating</p>
                    <p className="font-semibold">{IMPORT_FORMAT_LABELS[state.parsedData.detected_format as ImportFormat]}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-semibold">{state.metadata.name_override || state.parsedData.plan_name || 'Imported'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Workouts</p>
                    <p className="font-semibold">{totalWorkouts}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Exercises Matched</p>
                    <p className="font-semibold">{autoMatched + manualMatched} / {totalExercises}</p>
                  </div>
                  {customCreated > 0 && (
                    <div className="p-3 rounded-lg bg-secondary/10">
                      <p className="text-xs text-muted-foreground">Custom Exercises</p>
                      <p className="font-semibold">{customCreated} to create</p>
                    </div>
                  )}
                  {submitted > 0 && (
                    <div className="p-3 rounded-lg bg-accent/10">
                      <p className="text-xs text-muted-foreground">Library Submissions</p>
                      <p className="font-semibold">{submitted} for approval</p>
                    </div>
                  )}
                  {skipped > 0 && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Skipped</p>
                      <p className="font-semibold text-muted-foreground">{skipped} exercises</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('validation')}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button onClick={handleConfirmCreate} disabled={isCreating} className="min-w-32">
                {isCreating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  <><Check className="h-4 w-4 mr-2" /> Create</>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Custom Exercise Dialog */}
      <Dialog open={!!customDialog} onOpenChange={() => setCustomDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Exercise</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Exercise Name</Label>
              <Input value={customName} onChange={(e) => setCustomName(e.target.value)} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={customType} onValueChange={(v) => setCustomType(v as 'strength' | 'cardio')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="cardio">Cardio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {customType === 'strength' && (
              <div>
                <Label>Primary Muscle</Label>
                <Select value={customMuscle} onValueChange={setCustomMuscle}>
                  <SelectTrigger><SelectValue placeholder="Select muscle group" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MUSCLE_GROUP_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => saveCustomExercise(false)}>
              Create Private
            </Button>
            <Button onClick={() => saveCustomExercise(true)}>
              <Send className="h-4 w-4 mr-2" /> Submit to Library
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
