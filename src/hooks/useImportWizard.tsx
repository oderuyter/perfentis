import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useExerciseLibrary } from '@/hooks/useExerciseLibrary';
import { useWorkoutTemplates } from '@/hooks/useWorkoutTemplates';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { findBestMatch, AUTO_MATCH_THRESHOLD } from '@/lib/exerciseMatching';
import type {
  ImportState,
  ImportStep,
  ParsedImport,
  ExerciseMatch,
  ImportValidationError,
  ImportMetadata,
  ImportFileType,
} from '@/types/import';
import type { WorkoutTemplateExercise } from '@/types/workout-templates';
import { logAuditEvent } from '@/hooks/useAuditLog';

const INITIAL_STATE: ImportState = {
  step: 'upload',
  file: null,
  fileType: null,
  parsedData: null,
  exerciseMatches: [],
  validationErrors: [],
  metadata: { owner_scope: 'private' },
  isCoachContext: false,
};

export function useImportWizard(isCoach = false, coachId?: string) {
  const { user } = useAuth();
  const { allExercises } = useExerciseLibrary();
  const { createTemplate } = useWorkoutTemplates();
  const queryClient = useQueryClient();

  const [state, setState] = useState<ImportState>({
    ...INITIAL_STATE,
    isCoachContext: isCoach,
    coachId,
  });
  const [isParsing, setIsParsing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const setStep = useCallback((step: ImportStep) => {
    setState(prev => ({ ...prev, step }));
  }, []);

  const setMetadata = useCallback((metadata: Partial<ImportMetadata>) => {
    setState(prev => ({ ...prev, metadata: { ...prev.metadata, ...metadata } }));
  }, []);

  const reset = useCallback(() => {
    setState({ ...INITIAL_STATE, isCoachContext: isCoach, coachId });
  }, [isCoach, coachId]);

  // Step 1 & 2: Upload and parse file
  const uploadAndParse = useCallback(async (file: File) => {
    if (!user) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const fileType: ImportFileType = ext === 'pdf' ? 'pdf'
      : ext === 'csv' ? 'csv'
      : ext === 'xls' ? 'xls' : 'xlsx';

    setState(prev => ({ ...prev, file, fileType, step: 'detect' }));
    setIsParsing(true);

    try {
      let fileContent: string;

      if (fileType === 'pdf') {
        // For PDFs, we read as text (client extracts text)
        // We'll send raw text to the AI for parsing
        fileContent = await file.text();
      } else {
        // For Excel/CSV, send as base64
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        fileContent = btoa(binary);
      }

      // Create import log
      const { data: logData } = await supabase
        .from('import_logs')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_type: fileType,
          status: 'parsing',
        })
        .select('id')
        .single();

      const importLogId = logData?.id;

      // Call edge function
      const { data, error } = await supabase.functions.invoke('parse-import', {
        body: {
          file_content: fileContent,
          file_type: fileType,
          file_name: file.name,
        },
      });

      if (error) throw error;

      const parsedData = data as ParsedImport;

      // Run exercise matching
      const matches = runExerciseMatching(parsedData);

      // Run validation
      const errors = runValidation(parsedData);

      // Update import log
      if (importLogId) {
        await supabase.from('import_logs').update({
          detected_format: parsedData.detected_format,
          parse_confidence: parsedData.confidence,
          status: 'review',
          total_exercises: matches.length,
          matched_exercises: matches.filter(m => m.decision === 'auto').length,
        }).eq('id', importLogId);
      }

      setState(prev => ({
        ...prev,
        parsedData,
        exerciseMatches: matches,
        validationErrors: errors,
        importLogId,
        step: 'review',
      }));
    } catch (err) {
      console.error('Parse error:', err);
      toast.error('Failed to parse file. Please check the format and try again.');
      setState(prev => ({ ...prev, step: 'upload' }));
    } finally {
      setIsParsing(false);
    }
  }, [user, allExercises]);

  // Run exercise matching
  const runExerciseMatching = useCallback((parsed: ParsedImport): ExerciseMatch[] => {
    const matches: ExerciseMatch[] = [];
    const seen = new Set<string>();

    for (const week of parsed.weeks) {
      for (const workout of week.workouts) {
        for (const exercise of workout.exercises) {
          const key = exercise.name.toLowerCase().trim();
          if (seen.has(key)) continue;
          seen.add(key);

          const results = findBestMatch(exercise.name, allExercises);
          const best = results[0];

          matches.push({
            original_text: exercise.original_text || exercise.name,
            parsed_exercise: exercise,
            matched_exercise_id: best?.exercise.exercise_id,
            matched_exercise_name: best?.exercise.name,
            confidence: best?.confidence || 0,
            decision: best && best.confidence >= AUTO_MATCH_THRESHOLD ? 'auto' : 'pending',
          });
        }
      }
    }

    return matches;
  }, [allExercises]);

  // Run validation
  const runValidation = useCallback((parsed: ParsedImport): ImportValidationError[] => {
    const errors: ImportValidationError[] = [];
    let errorId = 0;

    for (const week of parsed.weeks) {
      for (const workout of week.workouts) {
        if (!workout.name || workout.name === 'Workout') {
          errors.push({
            id: `err-${errorId++}`,
            type: 'no_workout_name',
            message: `Workout in Week ${week.week_number} has no name`,
            location: { week: week.week_number, workout: workout.name },
            fixable: true,
          });
        }

        for (const exercise of workout.exercises) {
          const isCardio = exercise.category === 'cardio';

          if (!isCardio && (exercise.sets === undefined || exercise.sets === '')) {
            errors.push({
              id: `err-${errorId++}`,
              type: 'missing_sets',
              message: `"${exercise.name}" is missing sets`,
              location: { week: week.week_number, workout: workout.name, exercise: exercise.name, field: 'sets' },
              fixable: true,
            });
          }

          if (!isCardio && (exercise.reps === undefined || exercise.reps === '')) {
            errors.push({
              id: `err-${errorId++}`,
              type: 'missing_reps',
              message: `"${exercise.name}" is missing reps`,
              location: { week: week.week_number, workout: workout.name, exercise: exercise.name, field: 'reps' },
              fixable: true,
            });
          }

          // Validate numeric formats
          if (exercise.sets !== undefined && exercise.sets !== '') {
            const setsStr = String(exercise.sets);
            if (!/^\d+(-\d+)?$/.test(setsStr)) {
              errors.push({
                id: `err-${errorId++}`,
                type: 'invalid_number',
                message: `"${exercise.name}" has invalid sets format: "${setsStr}"`,
                location: { week: week.week_number, workout: workout.name, exercise: exercise.name, field: 'sets' },
                fixable: true,
              });
            }
          }

          if (exercise.reps !== undefined && exercise.reps !== '') {
            const repsStr = String(exercise.reps);
            if (!/^\d+(-\d+)?$/.test(repsStr) && !/^\d+\s*(sec|s|min|m)$/i.test(repsStr)) {
              errors.push({
                id: `err-${errorId++}`,
                type: 'invalid_number',
                message: `"${exercise.name}" has invalid reps format: "${repsStr}"`,
                location: { week: week.week_number, workout: workout.name, exercise: exercise.name, field: 'reps' },
                fixable: true,
              });
            }
          }
        }
      }
    }

    return errors;
  }, []);

  // Update a specific match
  const updateMatch = useCallback((index: number, updates: Partial<ExerciseMatch>) => {
    setState(prev => ({
      ...prev,
      exerciseMatches: prev.exerciseMatches.map((m, i) =>
        i === index ? { ...m, ...updates } : m
      ),
    }));
  }, []);

  // Fix a validation error
  const fixError = useCallback((errorId: string, value: string | number) => {
    setState(prev => ({
      ...prev,
      validationErrors: prev.validationErrors.map(e =>
        e.id === errorId ? { ...e, fixed: true, fix_value: value } : e
      ),
    }));
  }, []);

  // Skip a validation error
  const skipError = useCallback((errorId: string) => {
    setState(prev => ({
      ...prev,
      validationErrors: prev.validationErrors.map(e =>
        e.id === errorId ? { ...e, skipped: true } : e
      ),
    }));
  }, []);

  // Update detected format
  const setDetectedFormat = useCallback((format: 'single_workout' | 'split' | 'coach_plan') => {
    setState(prev => ({
      ...prev,
      parsedData: prev.parsedData ? { ...prev.parsedData, detected_format: format } : null,
    }));
  }, []);

  // Update parsed data (for editing workout/week names)
  const updateParsedData = useCallback((data: ParsedImport) => {
    setState(prev => ({ ...prev, parsedData: data }));
  }, []);

  // Check if we can proceed from validation
  const hasBlockingErrors = state.validationErrors.some(e => !e.fixed && !e.skipped);

  // Check if all matches are resolved
  const hasUnresolvedMatches = state.exerciseMatches.some(m => m.decision === 'pending');

  // Create final entities
  const createEntities = useCallback(async () => {
    if (!user || !state.parsedData) return;

    setIsCreating(true);
    try {
      const { parsedData, exerciseMatches, metadata } = state;
      const format = parsedData.detected_format;

      // First, create any custom exercises
      const customExercises: { originalName: string; exerciseId: string }[] = [];
      for (const match of exerciseMatches) {
        if (match.decision === 'custom' && match.custom_exercise_name) {
          const exerciseType = (match.custom_exercise_type || 'strength') as 'strength' | 'cardio';
          const { data: newEx, error } = await supabase
            .from('exercises')
            .insert({
              name: match.custom_exercise_name,
              type: exerciseType,
              source: 'user' as const,
              user_id: user.id,
              primary_muscle: (match.custom_exercise_muscle || null) as any,
              equipment: (match.custom_exercise_equipment || []) as any,
              supports_weight: exerciseType === 'strength',
              supports_reps: exerciseType === 'strength',
              supports_time: exerciseType === 'cardio',
              supports_distance: exerciseType === 'cardio',
            })
            .select('exercise_id')
            .single();

          if (!error && newEx) {
            customExercises.push({
              originalName: match.original_text.toLowerCase().trim(),
              exerciseId: newEx.exercise_id,
            });
          }
        }

        // Create exercise submissions
        if (match.decision === 'submit' && match.custom_exercise_name) {
          await supabase.from('exercise_submissions').insert({
            submitted_by: user.id,
            name: match.custom_exercise_name,
            type: match.custom_exercise_type || 'strength',
            primary_muscle: match.custom_exercise_muscle || null,
            equipment: match.custom_exercise_equipment || [],
          });
        }
      }

      // Build exercise lookup
      const exerciseLookup = new Map<string, string>();
      for (const match of exerciseMatches) {
        const key = match.original_text.toLowerCase().trim();
        if (match.decision === 'auto' || match.decision === 'manual') {
          if (match.matched_exercise_id) exerciseLookup.set(key, match.matched_exercise_id);
        } else if (match.decision === 'custom') {
          const custom = customExercises.find(c => c.originalName === key);
          if (custom) exerciseLookup.set(key, custom.exerciseId);
        }
      }

      const exerciseNameLookup = new Map<string, string>();
      for (const match of exerciseMatches) {
        const key = match.original_text.toLowerCase().trim();
        if (match.decision === 'auto' || match.decision === 'manual') {
          if (match.matched_exercise_name) exerciseNameLookup.set(key, match.matched_exercise_name);
        } else if (match.decision === 'custom') {
          if (match.custom_exercise_name) exerciseNameLookup.set(key, match.custom_exercise_name);
        }
      }

      // Helper to convert parsed exercises to template format
      const toTemplateExercises = (exercises: typeof parsedData.weeks[0]['workouts'][0]['exercises']): WorkoutTemplateExercise[] => {
        return exercises
          .filter(ex => {
            const key = ex.name.toLowerCase().trim();
            return exerciseLookup.has(key);
          })
          .map((ex, idx) => {
            const key = ex.name.toLowerCase().trim();
            const setsStr = String(ex.sets || '3');
            const repsStr = String(ex.reps || '10');

            // Parse sets (handle ranges like "3-5")
            const setsParts = setsStr.split('-').map(s => parseInt(s));
            const sets = setsParts[0] || 3;
            const setsMax = setsParts.length > 1 ? setsParts[1] : undefined;

            // Parse reps (handle ranges like "8-12")
            const repsParts = repsStr.split('-').map(s => parseInt(s));
            const reps = repsParts[0] || 10;
            const repsMax = repsParts.length > 1 ? repsParts[1] : undefined;

            return {
              exercise_id: exerciseLookup.get(key) || '',
              name: exerciseNameLookup.get(key) || ex.name,
              sets,
              reps,
              sets_min: setsMax ? sets : undefined,
              sets_max: setsMax,
              reps_min: repsMax ? reps : undefined,
              reps_max: repsMax,
              load_guidance: ex.load || undefined,
              rest_seconds: ex.rest_seconds,
              notes: ex.notes || undefined,
              order_index: idx,
              exercise_type: ex.category as 'strength' | 'cardio' | undefined,
            };
          });
      };

      const planName = metadata.name_override || parsedData.plan_name || state.file?.name.replace(/\.[^.]+$/, '') || 'Imported';

      if (format === 'single_workout') {
        // Create workout template
        const exercises = parsedData.weeks[0]?.workouts[0]?.exercises || [];
        const templateData = toTemplateExercises(exercises);

        await createTemplate.mutateAsync({
          title: planName,
          workout_type: 'mixed',
          exercise_data: templateData,
          tags: metadata.goal_tags,
        });
      } else if (format === 'split') {
        // Create training split with workouts
        const { data: split, error: splitError } = await supabase
          .from('training_splits')
          .insert({
            owner_user_id: user.id,
            title: planName,
            description: `Imported from ${state.file?.name}`,
            goal_tags: metadata.goal_tags || null,
            weeks_count: parsedData.weeks.length,
            workout_type: 'mixed',
            status: 'private',
            source: 'user',
          })
          .select()
          .single();

        if (splitError) throw splitError;

        for (const week of parsedData.weeks) {
          const { data: splitWeek, error: weekError } = await supabase
            .from('split_weeks')
            .insert({
              split_id: split.id,
              week_number: week.week_number,
              name: week.name || `Week ${week.week_number}`,
            })
            .select()
            .single();

          if (weekError) throw weekError;

          for (let wi = 0; wi < week.workouts.length; wi++) {
            const workout = week.workouts[wi];
            const exerciseData = toTemplateExercises(workout.exercises);

            await supabase.from('split_workouts').insert({
              week_id: splitWeek.id,
              day_label: workout.day_label || workout.name,
              day_number: wi + 1,
              order_index: wi,
              embedded_workout_data: JSON.parse(JSON.stringify(exerciseData)),
            } as any);
          }
        }

        queryClient.invalidateQueries({ queryKey: ['training-splits'] });
      } else if (format === 'coach_plan') {
        // Create coach training plan
        if (!state.coachId && !isCoach) {
          // Athlete importing a plan - create as a split instead
          toast.info('Multi-week plan imported as a training split');
          // Reuse split creation logic
          const { data: split, error: splitError } = await supabase
            .from('training_splits')
            .insert({
              owner_user_id: user.id,
              title: planName,
              description: `Imported multi-week plan from ${state.file?.name}`,
              goal_tags: metadata.goal_tags || null,
              weeks_count: parsedData.weeks.length,
              workout_type: 'mixed',
              status: 'private',
              source: 'user',
            })
            .select()
            .single();

          if (splitError) throw splitError;

          for (const week of parsedData.weeks) {
            const { data: splitWeek } = await supabase
              .from('split_weeks')
              .insert({
                split_id: split.id,
                week_number: week.week_number,
                name: week.name || `Week ${week.week_number}`,
              })
              .select()
              .single();

            if (splitWeek) {
              for (let wi = 0; wi < week.workouts.length; wi++) {
                const workout = week.workouts[wi];
                const exerciseData = toTemplateExercises(workout.exercises);

                await supabase.from('split_workouts').insert({
                  week_id: splitWeek.id,
                  day_label: workout.day_label || workout.name,
                  day_number: wi + 1,
                  order_index: wi,
                  embedded_workout_data: JSON.parse(JSON.stringify(exerciseData)),
                } as any);
              }
            }
          }

          queryClient.invalidateQueries({ queryKey: ['training-splits'] });
        } else {
          // Coach plan creation
          const coachIdToUse = state.coachId || coachId;

          const { data: plan, error: planError } = await supabase
            .from('training_plans')
            .insert([{
              coach_id: coachIdToUse!,
              name: planName,
              description: `Imported from ${state.file?.name}`,
              plan_type: 'program',
              duration_weeks: parsedData.weeks.length,
              is_template: true,
              is_active: true,
            }])
            .select()
            .single();

          if (planError) throw planError;

          for (const week of parsedData.weeks) {
            const { data: planWeek, error: weekError } = await supabase
              .from('plan_weeks')
              .insert({
                plan_id: plan.id,
                week_number: week.week_number,
                name: week.name || `Week ${week.week_number}`,
              })
              .select()
              .single();

            if (weekError) throw weekError;

            for (let wi = 0; wi < week.workouts.length; wi++) {
              const workout = week.workouts[wi];
              const exerciseData = toTemplateExercises(workout.exercises);

              await supabase.from('plan_workouts').insert({
                week_id: planWeek.id,
                name: workout.name || `Workout ${wi + 1}`,
                description: null,
                day_of_week: wi < 7 ? wi + 1 : null,
                order_index: wi,
                exercise_data: JSON.parse(JSON.stringify(exerciseData)),
              });
            }
          }

          queryClient.invalidateQueries({ queryKey: ['training-plans'] });
        }
      }

      // Update import log
      if (state.importLogId) {
        await supabase.from('import_logs').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          created_entity_type: format === 'single_workout' ? 'workout_template'
            : format === 'split' ? 'training_split' : 'training_plan',
          custom_exercises_created: customExercises.length,
          submissions_created: exerciseMatches.filter(m => m.decision === 'submit').length,
          mapping_decisions: JSON.parse(JSON.stringify(exerciseMatches.map(m => ({
            original: m.original_text,
            matched_id: m.matched_exercise_id,
            confidence: m.confidence,
            decision: m.decision,
          })))),
        }).eq('id', state.importLogId);
      }

      // Audit log
      await logAuditEvent({
        action: 'import.completed',
        message: `Imported ${format} "${planName}" from ${state.file?.name}`,
        category: 'import',
        entityType: format,
        metadata: {
          file_type: state.fileType,
          exercises_count: exerciseMatches.length,
          custom_created: customExercises.length,
        },
      });

      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success('Import completed successfully!');
      return true;
    } catch (err) {
      console.error('Create error:', err);
      toast.error('Failed to create imported data');

      if (state.importLogId) {
        await supabase.from('import_logs').update({
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Unknown error',
        }).eq('id', state.importLogId);
      }

      return false;
    } finally {
      setIsCreating(false);
    }
  }, [user, state, allExercises, createTemplate, queryClient, isCoach, coachId]);

  return {
    state,
    isParsing,
    isCreating,
    setStep,
    setMetadata,
    setDetectedFormat,
    updateParsedData,
    uploadAndParse,
    updateMatch,
    fixError,
    skipError,
    hasBlockingErrors,
    hasUnresolvedMatches,
    createEntities,
    reset,
  };
}
