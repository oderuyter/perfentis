import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Upload, FileText, Check, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { 
  CreateExerciseInput, 
  ExerciseType, 
  MuscleGroup, 
  EquipmentType,
  CardioModality 
} from '@/types/exercise';

interface ExerciseImportSheetProps {
  onClose: () => void;
  onCreate: (input: CreateExerciseInput) => Promise<unknown>;
}

interface ParsedExercise extends CreateExerciseInput {
  _rowIndex: number;
  _error?: string;
}

const VALID_TYPES: ExerciseType[] = ['strength', 'cardio'];
const VALID_MUSCLES: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'abs', 'obliques',
  'lower_back', 'traps', 'lats', 'hip_flexors', 'adductors', 'abductors', 'full_body'
];
const VALID_EQUIPMENT: EquipmentType[] = [
  'barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 
  'bodyweight', 'resistance_band', 'suspension', 'medicine_ball',
  'pull_up_bar', 'dip_bars', 'bench', 'box', 'cardio_machine', 'none'
];
const VALID_MODALITIES: CardioModality[] = [
  'run', 'bike', 'row', 'swim', 'elliptical', 'stair_climber', 
  'jump_rope', 'walking', 'hiking', 'other'
];

export function ExerciseImportSheet({ onClose, onCreate }: ExerciseImportSheetProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [parsedExercises, setParsedExercises] = useState<ParsedExercise[]>([]);
  const [importResults, setImportResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setParsedExercises(parsed);
      setStep('preview');
    };
    reader.readAsText(file);
  }, []);

  const handleImport = async () => {
    const validExercises = parsedExercises.filter(ex => !ex._error);
    if (validExercises.length === 0) {
      toast.error('No valid exercises to import');
      return;
    }

    setStep('importing');
    let success = 0;
    let failed = 0;

    for (const exercise of validExercises) {
      try {
        const { _rowIndex, _error, ...input } = exercise;
        await onCreate(input);
        success++;
      } catch {
        failed++;
      }
    }

    setImportResults({ success, failed });
    setStep('done');
  };

  const handleDownloadTemplate = () => {
    const template = `name,type,primary_muscle,secondary_muscles,equipment,modality,instructions
"Bulgarian Split Squat","strength","quadriceps","glutes;hamstrings","dumbbell;bench","","Stand with one foot on a bench behind you. Lower your body until your front thigh is parallel to the floor."
"Interval Sprints","cardio","","","","run","Sprint for 30 seconds, walk for 60 seconds. Repeat."`;
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'exercise-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const validCount = parsedExercises.filter(ex => !ex._error).length;
  const invalidCount = parsedExercises.filter(ex => ex._error).length;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[69]"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[70] shadow-elevated max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="p-4 pb-0 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 left-1/2 -translate-x-1/2 p-1"
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </button>
          
          <h3 className="text-lg font-semibold text-center pt-4 mb-1">Import Exercises</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            {step === 'upload' && 'Upload a CSV file with your exercises'}
            {step === 'preview' && `${validCount} exercises ready to import`}
            {step === 'importing' && 'Importing exercises...'}
            {step === 'done' && 'Import complete'}
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
          {step === 'upload' && (
            <div className="py-6 space-y-4">
              {/* File upload */}
              <label className="block">
                <div className="w-full border-2 border-dashed border-border/50 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Choose CSV file</p>
                    <p className="text-sm text-muted-foreground">or drag and drop</p>
                  </div>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              
              {/* Template download */}
              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Need a template?</p>
                  <p className="text-xs text-muted-foreground">Download our CSV template with examples</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-1" />
                  Template
                </Button>
              </div>
              
              {/* Format info */}
              <div className="p-4 bg-muted/30 rounded-xl text-sm space-y-2">
                <p className="font-medium">CSV Format</p>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>• <strong>name</strong>: Exercise name (required)</li>
                  <li>• <strong>type</strong>: "strength" or "cardio" (required)</li>
                  <li>• <strong>primary_muscle</strong>: e.g., "chest", "back" (strength only)</li>
                  <li>• <strong>secondary_muscles</strong>: semicolon-separated list</li>
                  <li>• <strong>equipment</strong>: semicolon-separated list</li>
                  <li>• <strong>modality</strong>: e.g., "run", "bike" (cardio only)</li>
                  <li>• <strong>instructions</strong>: How to perform</li>
                </ul>
              </div>
            </div>
          )}
          
          {step === 'preview' && (
            <div className="py-4 space-y-4">
              {/* Summary */}
              <div className="flex gap-3">
                {validCount > 0 && (
                  <div className="flex-1 p-3 bg-green-500/10 rounded-xl flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">{validCount} valid</span>
                  </div>
                )}
                {invalidCount > 0 && (
                  <div className="flex-1 p-3 bg-destructive/10 rounded-xl flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">{invalidCount} invalid</span>
                  </div>
                )}
              </div>
              
              {/* Exercise list */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {parsedExercises.map((exercise, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border ${
                      exercise._error 
                        ? 'border-destructive/30 bg-destructive/5' 
                        : 'border-border/30 bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{exercise.name || '(No name)'}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {exercise.type} • {exercise.primary_muscle || exercise.modality || 'No category'}
                        </p>
                      </div>
                      {exercise._error ? (
                        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                      ) : (
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                    {exercise._error && (
                      <p className="text-xs text-destructive mt-1">{exercise._error}</p>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep('upload')} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={validCount === 0}
                  className="flex-1"
                >
                  Import {validCount} Exercises
                </Button>
              </div>
            </div>
          )}
          
          {step === 'importing' && (
            <div className="py-12 flex flex-col items-center">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">Importing exercises...</p>
            </div>
          )}
          
          {step === 'done' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-semibold">{importResults.success} exercises imported</p>
                {importResults.failed > 0 && (
                  <p className="text-sm text-muted-foreground">{importResults.failed} failed</p>
                )}
              </div>
              <Button onClick={onClose} className="w-full">Done</Button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

function parseCSV(text: string): ParsedExercise[] {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  
  // Parse header
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  const nameIndex = headers.indexOf('name');
  const typeIndex = headers.indexOf('type');
  const primaryMuscleIndex = headers.indexOf('primary_muscle');
  const secondaryMusclesIndex = headers.indexOf('secondary_muscles');
  const equipmentIndex = headers.indexOf('equipment');
  const modalityIndex = headers.indexOf('modality');
  const instructionsIndex = headers.indexOf('instructions');
  
  if (nameIndex === -1 || typeIndex === -1) {
    return [{
      name: '',
      type: 'strength',
      _rowIndex: 0,
      _error: 'CSV must have "name" and "type" columns'
    }];
  }
  
  const exercises: ParsedExercise[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const name = values[nameIndex]?.trim() || '';
    const type = values[typeIndex]?.trim().toLowerCase() as ExerciseType;
    
    let error: string | undefined;
    
    // Validate required fields
    if (!name) {
      error = 'Name is required';
    } else if (!VALID_TYPES.includes(type)) {
      error = `Invalid type "${type}". Must be "strength" or "cardio"`;
    }
    
    // Parse optional fields
    const primaryMuscle = (primaryMuscleIndex >= 0 
      ? values[primaryMuscleIndex]?.trim().toLowerCase() 
      : '') as MuscleGroup | '';
    
    const secondaryMuscles = (secondaryMusclesIndex >= 0 && values[secondaryMusclesIndex]
      ? values[secondaryMusclesIndex].split(';').map(s => s.trim().toLowerCase()).filter(Boolean)
      : []) as MuscleGroup[];
    
    const equipment = (equipmentIndex >= 0 && values[equipmentIndex]
      ? values[equipmentIndex].split(';').map(s => s.trim().toLowerCase()).filter(Boolean)
      : []) as EquipmentType[];
    
    const modality = (modalityIndex >= 0 
      ? values[modalityIndex]?.trim().toLowerCase() 
      : '') as CardioModality | '';
    
    const instructions = instructionsIndex >= 0 ? values[instructionsIndex]?.trim() : '';
    
    // Validate muscle groups
    if (type === 'strength' && primaryMuscle && !VALID_MUSCLES.includes(primaryMuscle as MuscleGroup)) {
      error = `Invalid muscle group "${primaryMuscle}"`;
    }
    
    // Validate equipment
    for (const eq of equipment) {
      if (!VALID_EQUIPMENT.includes(eq)) {
        error = `Invalid equipment "${eq}"`;
        break;
      }
    }
    
    // Validate modality
    if (type === 'cardio' && modality && !VALID_MODALITIES.includes(modality as CardioModality)) {
      error = `Invalid modality "${modality}"`;
    }
    
    // Strength exercises need primary muscle
    if (type === 'strength' && !primaryMuscle && !error) {
      error = 'Strength exercises require a primary muscle group';
    }
    
    exercises.push({
      name,
      type,
      primary_muscle: primaryMuscle || null,
      secondary_muscles: secondaryMuscles,
      equipment,
      modality: modality || null,
      instructions: instructions || undefined,
      _rowIndex: i,
      _error: error,
    });
  }
  
  return exercises;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}
