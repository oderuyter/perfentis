import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMuscleTaxonomy } from '@/hooks/useMuscleTaxonomy';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import type { 
  Exercise, 
  ExerciseFilters, 
  CreateExerciseInput, 
  UpdateExerciseInput,
  MuscleGroup,
  ExerciseType,
  ExerciseRecordType,
} from '@/types/exercise';
import { toast } from 'sonner';

export function useExerciseLibrary(initialFilters?: ExerciseFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ExerciseFilters>(initialFilters || {});
  const { muscleGroups, muscleSubgroups, getGroupName, getSubgroupName } = useMuscleTaxonomy();
  const { equipment: allEquipment, getEquipmentName } = useEquipmentLibrary();

  // Fetch all exercises (system + user's own) with join data
  const { data: exercises = [], isLoading, error, refetch } = useQuery({
    queryKey: ['exercises', user?.id],
    queryFn: async () => {
      // Fetch exercises
      const { data: exerciseData, error: exError } = await supabase
        .from('exercises')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (exError) throw exError;
      
      // Get latest version of each exercise
      const latestVersions = new Map<string, Exercise>();
      for (const exercise of (exerciseData || []) as Exercise[]) {
        // Only show: approved exercises OR user's own exercises
        if (exercise.status === 'approved' || exercise.user_id === user?.id) {
          const existing = latestVersions.get(exercise.exercise_id);
          if (!existing || exercise.version > existing.version) {
            latestVersions.set(exercise.exercise_id, exercise);
          }
        }
      }
      
      const exerciseList = Array.from(latestVersions.values());
      const exerciseIds = exerciseList.map(e => e.id);
      
      // Fetch secondary muscles
      const { data: secondaryData } = await supabase
        .from('exercise_secondary_muscles')
        .select('*')
        .in('exercise_id', exerciseIds);
      
      // Fetch equipment requirements
      const { data: equipmentData } = await supabase
        .from('exercise_equipment')
        .select('*')
        .in('exercise_id', exerciseIds);
      
      // Map join data to exercises
      const secondaryMap = new Map<string, typeof secondaryData>();
      (secondaryData || []).forEach(s => {
        const list = secondaryMap.get(s.exercise_id) || [];
        list.push(s);
        secondaryMap.set(s.exercise_id, list);
      });
      
      const equipmentMap = new Map<string, string[]>();
      (equipmentData || []).forEach(e => {
        const list = equipmentMap.get(e.exercise_id) || [];
        list.push(e.equipment_id);
        equipmentMap.set(e.exercise_id, list);
      });
      
      return exerciseList.map(exercise => ({
        ...exercise,
        secondary_muscle_entries: (secondaryMap.get(exercise.id) || []).map(s => ({
          muscle_group_id: s.muscle_group_id,
          muscle_subgroup_id: s.muscle_subgroup_id || undefined,
        })),
        equipment_ids: equipmentMap.get(exercise.id) || [],
      }));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  // Enrich exercises with display names from taxonomy
  const enrichedExercises = useMemo(() => {
    return exercises.map(exercise => ({
      ...exercise,
      muscle_group_name: exercise.primary_muscle_group_id 
        ? getGroupName(exercise.primary_muscle_group_id) 
        : exercise.primary_muscle 
          ? exercise.primary_muscle.charAt(0).toUpperCase() + exercise.primary_muscle.slice(1).replace('_', ' ')
          : undefined,
      muscle_subgroup_name: exercise.primary_muscle_subgroup_id 
        ? getSubgroupName(exercise.primary_muscle_subgroup_id) 
        : undefined,
      equipment_names: (exercise as any).equipment_ids?.map((id: string) => getEquipmentName(id)).filter(Boolean) || [],
    }));
  }, [exercises, getGroupName, getSubgroupName, getEquipmentName]);

  // Filtered exercises based on search and filters
  const filteredExercises = useMemo(() => {
    return enrichedExercises.filter(exercise => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const nameMatch = exercise.name.toLowerCase().includes(searchLower);
        const muscleMatch = exercise.muscle_group_name?.toLowerCase().includes(searchLower);
        const subgroupMatch = exercise.muscle_subgroup_name?.toLowerCase().includes(searchLower);
        if (!nameMatch && !muscleMatch && !subgroupMatch) return false;
      }

      // Type filter
      if (filters.type && exercise.type !== filters.type) {
        return false;
      }

      // Muscle group filter (DB-driven)
      if (filters.muscleGroupId && exercise.type === 'strength') {
        const hasAsPrimary = exercise.primary_muscle_group_id === filters.muscleGroupId;
        const hasAsSecondary = exercise.secondary_muscle_entries?.some(
          (s: any) => s.muscle_group_id === filters.muscleGroupId
        );
        if (!hasAsPrimary && !hasAsSecondary) return false;
      }
      
      // Legacy muscle group filter
      if (filters.muscleGroup && !filters.muscleGroupId && exercise.type === 'strength') {
        if (exercise.primary_muscle !== filters.muscleGroup && 
            !exercise.secondary_muscles?.includes(filters.muscleGroup)) {
          return false;
        }
      }

      // Equipment filter (DB-driven)
      if (filters.equipmentId && exercise.type === 'strength') {
        if (!(exercise as any).equipment_ids?.includes(filters.equipmentId)) {
          return false;
        }
      }
      
      // Legacy equipment filter
      if (filters.equipment && !filters.equipmentId && exercise.type === 'strength') {
        if (!exercise.equipment?.includes(filters.equipment)) {
          return false;
        }
      }

      // Record type filter
      if (filters.recordType && exercise.record_type !== filters.recordType) {
        return false;
      }

      // Status filter
      if (filters.status && exercise.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [enrichedExercises, filters]);

  // Group exercises by category
  const groupedExercises = useMemo(() => {
    const groups: Record<string, Exercise[]> = {};
    
    for (const exercise of filteredExercises) {
      let category: string;
      if (exercise.type === 'strength') {
        category = exercise.muscle_group_name || exercise.primary_muscle 
          ? (exercise.muscle_group_name || exercise.primary_muscle!.charAt(0).toUpperCase() + exercise.primary_muscle!.slice(1).replace('_', ' '))
          : 'Other';
      } else {
        category = 'Cardio';
      }
      
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(exercise);
    }
    
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

  // Get exercise by ID
  const getExerciseById = useCallback((exerciseId: string, version?: number) => {
    if (version !== undefined) {
      return enrichedExercises.find(e => e.exercise_id === exerciseId && e.version === version);
    }
    return enrichedExercises.find(e => e.exercise_id === exerciseId);
  }, [enrichedExercises]);

  // Get exercises by muscle group
  const getExercisesByMuscle = useCallback((muscleGroup: MuscleGroup | string, excludeId?: string) => {
    return enrichedExercises.filter(e => {
      if (e.exercise_id === excludeId) return false;
      if (e.type !== 'strength') return false;
      
      // Check DB-driven muscle group
      const groupName = muscleGroup.toLowerCase().replace(' ', '_');
      if (e.muscle_group_name?.toLowerCase().replace(' ', '_') === groupName) return true;
      if (e.primary_muscle === groupName) return true;
      if (e.secondary_muscles?.includes(groupName as MuscleGroup)) return true;
      
      return false;
    });
  }, [enrichedExercises]);

  // Create new user exercise
  const createExerciseMutation = useMutation({
    mutationFn: async (input: CreateExerciseInput) => {
      if (!user) throw new Error('Must be logged in');
      
      const recordType = input.record_type || (input.type === 'cardio' ? 'cardio' : 'weight_reps');
      
      const { data, error } = await supabase
        .from('exercises')
        .insert({
          name: input.name,
          type: input.type,
          source: 'user' as const,
          user_id: user.id,
          record_type: recordType,
          status: 'pending',
          primary_muscle: input.primary_muscle || null,
          secondary_muscles: input.secondary_muscles || [],
          equipment: input.equipment || [],
          primary_muscle_group_id: input.primary_muscle_group_id || null,
          primary_muscle_subgroup_id: input.primary_muscle_subgroup_id || null,
          modality: input.modality || null,
          instructions: input.instructions || null,
          image_url: input.image_url || null,
          difficulty: input.difficulty || null,
          tags: input.tags || null,
          video_url: input.video_url || null,
          supports_weight: recordType === 'weight_reps',
          supports_reps: recordType === 'weight_reps' || recordType === 'reps' || recordType === 'reps_duration',
          supports_rpe: recordType === 'weight_reps',
          supports_tempo: recordType === 'weight_reps',
          supports_one_rm_percent: recordType === 'weight_reps',
          supports_time: recordType === 'cardio' || recordType === 'duration' || recordType === 'reps_duration',
          supports_distance: recordType === 'cardio',
          supports_intervals: recordType === 'cardio',
        })
        .select()
        .single();

      if (error) throw error;
      
      // Insert secondary muscles
      if (input.secondary_muscle_entries && input.secondary_muscle_entries.length > 0) {
        const secondaryRows = input.secondary_muscle_entries.map(entry => ({
          exercise_id: data.id,
          muscle_group_id: entry.muscle_group_id,
          muscle_subgroup_id: entry.muscle_subgroup_id || null,
        }));
        await supabase.from('exercise_secondary_muscles').insert(secondaryRows);
      }
      
      // Insert equipment requirements
      if (input.equipment_ids && input.equipment_ids.length > 0) {
        const eqRows = input.equipment_ids.map(eqId => ({
          exercise_id: data.id,
          equipment_id: eqId,
        }));
        await supabase.from('exercise_equipment').insert(eqRows);
      }
      
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
      
      const recordType = input.record_type || (input.type === 'cardio' ? 'cardio' : 'weight_reps');
      
      const { data, error } = await supabase
        .from('exercises')
        .insert({
          exercise_id: input.exercise_id,
          version: input.current_version + 1,
          name: input.name,
          type: input.type,
          source: 'user' as const,
          user_id: user.id,
          record_type: recordType,
          status: 'pending',
          primary_muscle: input.primary_muscle || null,
          secondary_muscles: input.secondary_muscles || [],
          equipment: input.equipment || [],
          primary_muscle_group_id: input.primary_muscle_group_id || null,
          primary_muscle_subgroup_id: input.primary_muscle_subgroup_id || null,
          modality: input.modality || null,
          instructions: input.instructions || null,
          image_url: input.image_url || null,
          difficulty: input.difficulty || null,
          tags: input.tags || null,
          video_url: input.video_url || null,
          supports_weight: recordType === 'weight_reps',
          supports_reps: recordType === 'weight_reps' || recordType === 'reps' || recordType === 'reps_duration',
          supports_rpe: recordType === 'weight_reps',
          supports_tempo: recordType === 'weight_reps',
          supports_one_rm_percent: recordType === 'weight_reps',
          supports_time: recordType === 'cardio' || recordType === 'duration' || recordType === 'reps_duration',
          supports_distance: recordType === 'cardio',
          supports_intervals: recordType === 'cardio',
        })
        .select()
        .single();

      if (error) throw error;
      
      // Insert secondary muscles for new version
      if (input.secondary_muscle_entries && input.secondary_muscle_entries.length > 0) {
        const secondaryRows = input.secondary_muscle_entries.map(entry => ({
          exercise_id: data.id,
          muscle_group_id: entry.muscle_group_id,
          muscle_subgroup_id: entry.muscle_subgroup_id || null,
        }));
        await supabase.from('exercise_secondary_muscles').insert(secondaryRows);
      }
      
      // Insert equipment requirements for new version
      if (input.equipment_ids && input.equipment_ids.length > 0) {
        const eqRows = input.equipment_ids.map(eqId => ({
          exercise_id: data.id,
          equipment_id: eqId,
        }));
        await supabase.from('exercise_equipment').insert(eqRows);
      }
      
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

  // Soft delete exercise
  const deleteExerciseMutation = useMutation({
    mutationFn: async (exerciseId: string) => {
      if (!user) throw new Error('Must be logged in');
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
    allExercises: enrichedExercises,
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