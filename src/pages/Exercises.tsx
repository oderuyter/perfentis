import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, Search, Upload, Download, FileText, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useExerciseLibrary } from '@/hooks/useExerciseLibrary';
import { ExerciseListItem } from '@/components/exercises/ExerciseListItem';
import { ExerciseFiltersBar } from '@/components/exercises/ExerciseFilters';
import { ExerciseDetailSheet } from '@/components/exercises/ExerciseDetailSheet';
import { CreateExerciseSheet } from '@/components/exercises/CreateExerciseSheet';
import { ExerciseImportSheet } from '@/components/exercises/ExerciseImportSheet';
import type { Exercise } from '@/types/exercise';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Exercises() {
  const {
    exercises,
    groupedExercises,
    allExercises,
    isLoading,
    filters,
    updateFilters,
    clearFilters,
    createExercise,
    updateExercise,
    deleteExercise,
    isCreating,
  } = useExerciseLibrary();

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  const userExercises = allExercises.filter(e => e.source === 'user');

  const handleExportCSV = () => {
    if (userExercises.length === 0) {
      // Download template instead
      downloadCSVTemplate();
      return;
    }

    const csvContent = generateCSV(userExercises);
    downloadFile(csvContent, 'my-exercises.csv', 'text/csv');
  };

  const handleDownloadTemplate = () => {
    downloadCSVTemplate();
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Exercise Library</h1>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <FileText className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowImport(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  {userExercises.length > 0 ? 'Export My Exercises' : 'Download Template'}
                </DropdownMenuItem>
                {userExercises.length > 0 && (
                  <DropdownMenuItem onClick={handleDownloadTemplate}>
                    <FileText className="h-4 w-4 mr-2" />
                    Download Template
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setShowCreate(true)} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={filters.search || ''}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="pl-9 h-10"
          />
          {filters.search && (
            <button
              onClick={() => updateFilters({ search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Filters */}
        <ExerciseFiltersBar
          filters={filters}
          onUpdateFilters={updateFilters}
          onClearFilters={clearFilters}
        />
      </div>

      {/* Exercise List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : exercises.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {filters.search || filters.type || filters.muscleGroup || filters.equipment
                ? 'No exercises match your filters'
                : 'No exercises yet'}
            </p>
            {!filters.search && !filters.type && (
              <Button onClick={() => setShowCreate(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Exercise
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedExercises).map(([category, categoryExercises]) => (
              <div key={category}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                  {category} ({categoryExercises.length})
                </h2>
                <div className="space-y-2">
                  {categoryExercises.map((exercise) => (
                    <ExerciseListItem
                      key={exercise.id}
                      exercise={exercise}
                      onClick={() => setSelectedExercise(exercise)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex-shrink-0 px-4 py-2 bg-muted/30 border-t border-border/50">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{allExercises.filter(e => e.source === 'system').length} system exercises</span>
          <span>{userExercises.length} custom exercises</span>
        </div>
      </div>

      {/* Sheets */}
      <AnimatePresence>
        {selectedExercise && !editingExercise && (
          <ExerciseDetailSheet
            key="detail"
            exercise={selectedExercise}
            onClose={() => setSelectedExercise(null)}
            onEdit={() => {
              setEditingExercise(selectedExercise);
              setSelectedExercise(null);
            }}
            onDelete={async () => {
              await deleteExercise(selectedExercise.exercise_id);
              setSelectedExercise(null);
            }}
          />
        )}
        
        {showCreate && (
          <CreateExerciseSheet
            key="create"
            onClose={() => setShowCreate(false)}
            onCreate={createExercise}
            isCreating={isCreating}
          />
        )}
        
        {showImport && (
          <ExerciseImportSheet
            key="import"
            onClose={() => setShowImport(false)}
            onCreate={createExercise}
          />
        )}
        
        {editingExercise && (
          <CreateExerciseSheet
            key="edit"
            onClose={() => setEditingExercise(null)}
            onCreate={async (input) => {
              await updateExercise({
                ...input,
                exercise_id: editingExercise.exercise_id,
                current_version: editingExercise.version,
              });
            }}
            isCreating={isCreating}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// CSV utilities
function generateCSV(exercises: Exercise[]): string {
  const headers = [
    'name',
    'type',
    'primary_muscle',
    'secondary_muscles',
    'equipment',
    'modality',
    'instructions'
  ];
  
  const rows = exercises.map(ex => [
    ex.name,
    ex.type,
    ex.primary_muscle || '',
    (ex.secondary_muscles || []).join(';'),
    (ex.equipment || []).join(';'),
    ex.modality || '',
    ex.instructions || ''
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

function downloadCSVTemplate(): void {
  const template = `name,type,primary_muscle,secondary_muscles,equipment,modality,instructions
"Bulgarian Split Squat","strength","quadriceps","glutes;hamstrings","dumbbell;bench","","Stand with one foot on a bench behind you. Lower your body until your front thigh is parallel to the floor."
"Interval Sprints","cardio","","","","run","Sprint for 30 seconds, walk for 60 seconds. Repeat."`;
  
  downloadFile(template, 'exercise-template.csv', 'text/csv');
}

function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type: `${type};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
