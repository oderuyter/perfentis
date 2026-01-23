import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { 
  WorkoutTemplate, 
  WorkoutStructureData,
  WorkoutFilters,
  LibraryTab,
  WorkoutTemplateStatus
} from '@/types/workout-templates';

export function useWorkoutTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<LibraryTab>('curated');
  const [filters, setFilters] = useState<WorkoutFilters>({
    sort: 'popular',
  });

  // Fetch templates based on active tab
  const { data: templates = [], isLoading, error, refetch } = useQuery({
    queryKey: ['workout-templates', activeTab, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('workout_templates')
        .select('*')
        .order('use_count', { ascending: false });

      switch (activeTab) {
        case 'curated':
          query = query.eq('is_curated', true);
          break;
        case 'community':
          query = query.eq('status', 'approved').eq('is_curated', false);
          break;
        case 'my-library':
          if (!user) return [];
          query = query.eq('owner_user_id', user.id);
          break;
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(t => ({
        ...t,
        exercise_data: Array.isArray(t.exercise_data) 
          ? (t.exercise_data as unknown as WorkoutStructureData[])
          : [],
      })) as WorkoutTemplate[];
    },
    enabled: activeTab !== 'my-library' || !!user,
  });

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let result = [...templates];

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(search) ||
        t.description?.toLowerCase().includes(search) ||
        t.tags?.some(tag => tag.toLowerCase().includes(search))
      );
    }

    // Type filter
    if (filters.type) {
      result = result.filter(t => t.workout_type === filters.type);
    }

    // Difficulty filter
    if (filters.difficulty) {
      result = result.filter(t => t.difficulty_level === filters.difficulty);
    }

    // Duration filter
    if (filters.duration) {
      result = result.filter(t => {
        if (!t.estimated_duration_minutes) return false;
        switch (filters.duration) {
          case 'short': return t.estimated_duration_minutes < 30;
          case 'medium': return t.estimated_duration_minutes >= 30 && t.estimated_duration_minutes <= 60;
          case 'long': return t.estimated_duration_minutes > 60;
          default: return true;
        }
      });
    }

    // Sort
    switch (filters.sort) {
      case 'popular':
        result.sort((a, b) => b.use_count - a.use_count);
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'recommended':
        // Could add recommendation logic here
        result.sort((a, b) => b.use_count - a.use_count);
        break;
    }

    return result;
  }, [templates, filters]);

  // Create template mutation
  const createTemplate = useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      workout_type: 'strength' | 'cardio' | 'mixed';
      estimated_duration_minutes?: number;
      difficulty_level?: string;
      exercise_data: WorkoutStructureData[];
      tags?: string[];
    }) => {
      if (!user) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('workout_templates')
        .insert({
          owner_user_id: user.id,
          title: input.title,
          description: input.description || null,
          workout_type: input.workout_type,
          estimated_duration_minutes: input.estimated_duration_minutes || null,
          difficulty_level: input.difficulty_level || null,
          exercise_data: JSON.parse(JSON.stringify(input.exercise_data)),
          tags: input.tags || null,
          status: 'private',
          source: 'user',
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-templates'] });
      toast.success('Workout saved to your library');
    },
    onError: (error) => {
      console.error('Error creating template:', error);
      toast.error('Failed to save workout');
    },
  });

  // Update template mutation
  const updateTemplate = useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      description?: string;
      workout_type?: 'strength' | 'cardio' | 'mixed';
      estimated_duration_minutes?: number;
      difficulty_level?: string;
      exercise_data?: WorkoutStructureData[];
      tags?: string[];
      status?: WorkoutTemplateStatus;
    }) => {
      const { id, exercise_data, ...rest } = input;
      const updates: Record<string, unknown> = { ...rest };
      if (exercise_data) {
        updates.exercise_data = exercise_data as unknown as Record<string, unknown>[];
      }

      const { data, error } = await supabase
        .from('workout_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-templates'] });
      toast.success('Workout updated');
    },
    onError: (error) => {
      console.error('Error updating template:', error);
      toast.error('Failed to update workout');
    },
  });

  // Submit for approval
  const submitForApproval = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('workout_templates')
        .update({ status: 'submitted' })
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-templates'] });
      toast.success('Workout submitted for community approval');
    },
  });

  // Delete template
  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('workout_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-templates'] });
      toast.success('Workout deleted');
    },
  });

  // Increment use count (when starting a template workout)
  const incrementUseCount = useCallback(async (templateId: string) => {
    try {
      // Get current count and increment
      const { data } = await supabase
        .from('workout_templates')
        .select('use_count')
        .eq('id', templateId)
        .single();
      
      if (data) {
        await supabase
          .from('workout_templates')
          .update({ use_count: (data.use_count || 0) + 1 })
          .eq('id', templateId);
      }
    } catch {
      // Non-critical, just track usage
    }
  }, []);

  const updateFilters = useCallback((newFilters: Partial<WorkoutFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ sort: 'popular' });
  }, []);

  return {
    templates: filteredTemplates,
    allTemplates: templates,
    isLoading,
    error,
    refetch,
    activeTab,
    setActiveTab,
    filters,
    setFilters,
    updateFilters,
    clearFilters,
    createTemplate,
    updateTemplate,
    submitForApproval,
    deleteTemplate,
    incrementUseCount,
    isCreating: createTemplate.isPending,
    isUpdating: updateTemplate.isPending,
  };
}

// Hook for fetching a single template
export function useWorkoutTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: ['workout-template', templateId],
    queryFn: async () => {
      if (!templateId) return null;

      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        exercise_data: Array.isArray(data.exercise_data) 
          ? (data.exercise_data as unknown as WorkoutStructureData[])
          : [],
      } as WorkoutTemplate;
    },
    enabled: !!templateId,
  });
}
