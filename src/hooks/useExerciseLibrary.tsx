import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { 
  Exercise, 
  ExerciseFilters, 
  CreateExerciseInput, 
  UpdateExerciseInput,
  MuscleGroup,
  ExerciseType
} from '@/types/exercise';
import { toast } from 'sonner';

export function useExerciseLibrary(initialFilters?: ExerciseFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ExerciseFilters>(initialFilters || {});

  // Fetch all exercises (system + user's own)
  const { data: exercises = [], isLoading, error, refetch } = useQuery({
    queryKey: ['exercises', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      // Get latest version of each exercise
      const latestVersions = new Map<string, Exercise>();
      for (const exercise of (data || []) as Exercise[]) {
        const existing = latestVersions.get(exercise.exercise_id);
        if (!existing || exercise.version > existing.version) {
          latestVersions.set(exercise.exercise_id, exercise);
        }
      }
      
      return Array.from(latestVersions.values());
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Filtered exercises based on search and filters
  const filteredExercises = useMemo(() => {
    return exercises.filter(exercise => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const nameMatch = exercise.name.toLowerCase().includes(searchLower);
        const muscleMatch = exercise.primary_muscle?.toLowerCase().includes(searchLower);
        if (!nameMatch && !muscleMatch) return false;
      }

      // Type filter
      if (filters.type && exercise.type !== filters.type) {
        return false;
      }

      // Muscle group filter (strength only)
      if (filters.muscleGroup && exercise.type === 'strength') {
        if (exercise.primary_muscle !== filters.muscleGroup && 
            !exercise.secondary_muscles?.includes(filters.muscleGroup)) {
          return false;
        }
      }

      // Equipment filter (strength only)
      if (filters.equipment && exercise.type === 'strength') {
        if (!exercise.equipment?.includes(filters.equipment)) {
          return false;
        }
      }

      return true;
    });
  }, [exercises, filters]);

  // Group exercises by category (muscle group for strength, modality for cardio)
  const groupedExercises = useMemo(() => {
    const groups: Record<string, Exercise[]> = {};
    
    for (const exercise of filteredExercises) {
      let category: string;
      if (exercise.type === 'strength') {
        category = exercise.primary_muscle 
          ? exercise.primary_muscle.charAt(0).toUpperCase() + exercise.primary_muscle.slice(1).replace('_', ' ')
          : 'Other';
      } else {
        category = 'Cardio';
      }
      
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(exercise);
    }
    
    // Sort categories alphabetically, but keep Cardio at the end
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === 'Cardio') return 1;
      if (b === 'Cardio') return -1;
      return a.localeCompare(b);
    });
    
    const sortedGroups: Record<string, Exercise[]> = {};
    for (const key of sortedKeys) {
      sortedGroups[key] = groups[key];
    }
    
    return sortedGroups;
  }, [filteredExercises]);

  // Get exercise by ID (stable identifier)
  const getExerciseById = useCallback((exerciseId: string, version?: number) => {
    if (version !== undefined) {
      return exercises.find(e => e.exercise_id === exerciseId && e.version === version);
    }
    // Return latest version
    return exercises.find(e => e.exercise_id === exerciseId);
  }, [exercises]);

  // Get exercises by muscle group (for swap suggestions)
  const getExercisesByMuscle = useCallback((muscleGroup: MuscleGroup | string, excludeId?: string) => {
    const muscle = muscleGroup.toLowerCase().replace(' ', '_') as MuscleGroup;
    return exercises.filter(e => 
      e.exercise_id !== excludeId &&
      e.type === 'strength' &&
      (e.primary_muscle === muscle || e.secondary_muscles?.includes(muscle))
    );
  }, [exercises]);

  // Create new user exercise
  const createExerciseMutation = useMutation({
    mutationFn: async (input: CreateExerciseInput) => {
      if (!user) throw new Error('Must be logged in');
      
      const { data, error } = await supabase
        .from('exercises')
        .insert({
          name: input.name,
          type: input.type,
          source: 'user' as const,
          user_id: user.id,
          primary_muscle: input.primary_muscle || null,
          secondary_muscles: input.secondary_muscles || [],
          equipment: input.equipment || [],
          modality: input.modality || null,
          instructions: input.instructions || null,
          // Set appropriate supports flags based on type
          supports_weight: input.type === 'strength',
          supports_reps: input.type === 'strength',
          supports_rpe: input.type === 'strength',
          supports_tempo: input.type === 'strength',
          supports_one_rm_percent: input.type === 'strength',
          supports_time: input.type === 'cardio',
          supports_distance: input.type === 'cardio',
          supports_intervals: input.type === 'cardio',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Exercise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success('Exercise created');
    },
    onError: (error) => {
      toast.error('Failed to create exercise');
      console.error('Create exercise error:', error);
    },
  });

  // Update existing user exercise (creates new version)
  const updateExerciseMutation = useMutation({
    mutationFn: async (input: UpdateExerciseInput) => {
      if (!user) throw new Error('Must be logged in');
      
      // Create new version
      const { data, error } = await supabase
        .from('exercises')
        .insert({
          exercise_id: input.exercise_id,
          version: input.current_version + 1,
          name: input.name,
          type: input.type,
          source: 'user' as const,
          user_id: user.id,
          primary_muscle: input.primary_muscle || null,
          secondary_muscles: input.secondary_muscles || [],
          equipment: input.equipment || [],
          modality: input.modality || null,
          instructions: input.instructions || null,
          supports_weight: input.type === 'strength',
          supports_reps: input.type === 'strength',
          supports_rpe: input.type === 'strength',
          supports_tempo: input.type === 'strength',
          supports_one_rm_percent: input.type === 'strength',
          supports_time: input.type === 'cardio',
          supports_distance: input.type === 'cardio',
          supports_intervals: input.type === 'cardio',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Exercise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success('Exercise updated');
    },
    onError: (error) => {
      toast.error('Failed to update exercise');
      console.error('Update exercise error:', error);
    },
  });

  // Soft delete exercise (mark as inactive)
  const deleteExerciseMutation = useMutation({
    mutationFn: async (exerciseId: string) => {
      if (!user) throw new Error('Must be logged in');
      
      // Mark all versions as inactive
      const { error } = await supabase
        .from('exercises')
        .update({ is_active: false })
        .eq('exercise_id', exerciseId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success('Exercise deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete exercise');
      console.error('Delete exercise error:', error);
    },
  });

  return {
    exercises: filteredExercises,
    groupedExercises,
    allExercises: exercises,
    isLoading,
    error,
    refetch,
    filters,
    setFilters,
    updateFilters: useCallback((newFilters: Partial<ExerciseFilters>) => {
      setFilters(prev => ({ ...prev, ...newFilters }));
    }, []),
    clearFilters: useCallback(() => setFilters({}), []),
    getExerciseById,
    getExercisesByMuscle,
    createExercise: createExerciseMutation.mutateAsync,
    updateExercise: updateExerciseMutation.mutateAsync,
    deleteExercise: deleteExerciseMutation.mutateAsync,
    isCreating: createExerciseMutation.isPending,
    isUpdating: updateExerciseMutation.isPending,
    isDeleting: deleteExerciseMutation.isPending,
  };
}
