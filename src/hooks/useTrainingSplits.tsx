import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { 
  TrainingSplit, 
  SplitWeek,
  SplitWorkout,
  SplitFilters,
  LibraryTab,
  UserActiveSplit,
  SplitWorkoutCompletion,
  WorkoutTemplateExercise
} from '@/types/workout-templates';

export function useTrainingSplits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<LibraryTab>('curated');
  const [filters, setFilters] = useState<SplitFilters>({
    sort: 'popular',
  });

  // Fetch splits based on active tab
  const { data: splits = [], isLoading, error, refetch } = useQuery({
    queryKey: ['training-splits', activeTab, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('training_splits')
        .select(`
          *,
          split_weeks (
            *,
            split_workouts (*)
          )
        `)
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
      
      return (data || []).map((s: any) => ({
        ...s,
        split_weeks: ((s.split_weeks || []) as any[]).sort((a, b) => 
          a.week_number - b.week_number
        ).map((w: any) => ({
          ...w,
          embedded_workout_data: w.embedded_workout_data || null,
          split_workouts: ((w.split_workouts || []) as any[]).sort((a, b) => 
            a.order_index - b.order_index
          ),
        })),
      })) as TrainingSplit[];
    },
    enabled: activeTab !== 'my-library' || !!user,
  });

  // Filter and sort splits
  const filteredSplits = useMemo(() => {
    let result = [...splits];

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(s => 
        s.title.toLowerCase().includes(search) ||
        s.description?.toLowerCase().includes(search) ||
        s.goal_tags?.some(tag => tag.toLowerCase().includes(search))
      );
    }

    // Type filter
    if (filters.type) {
      result = result.filter(s => s.workout_type === filters.type);
    }

    // Difficulty filter
    if (filters.difficulty) {
      result = result.filter(s => s.difficulty_level === filters.difficulty);
    }

    // Weeks filter
    if (filters.weeks) {
      result = result.filter(s => s.weeks_count === filters.weeks);
    }

    // Days per week filter
    if (filters.daysPerWeek) {
      result = result.filter(s => s.days_per_week === filters.daysPerWeek);
    }

    // Sort
    switch (filters.sort) {
      case 'popular':
        result.sort((a, b) => b.use_count - a.use_count);
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    return result;
  }, [splits, filters]);

  // Create split mutation
  const createSplit = useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      goal_tags?: string[];
      weeks_count?: number;
      is_ongoing?: boolean;
      workout_type?: 'strength' | 'cardio' | 'mixed';
      difficulty_level?: string;
      days_per_week?: number;
    }) => {
      if (!user) throw new Error('Must be logged in');

      const { data: split, error: splitError } = await supabase
        .from('training_splits')
        .insert({
          owner_user_id: user.id,
          title: input.title,
          description: input.description || null,
          goal_tags: input.goal_tags || null,
          weeks_count: input.weeks_count || null,
          is_ongoing: input.is_ongoing || false,
          workout_type: input.workout_type || 'mixed',
          difficulty_level: input.difficulty_level || null,
          days_per_week: input.days_per_week || null,
          status: 'private',
          source: 'user',
        })
        .select()
        .single();

      if (splitError) throw splitError;

      // Create initial weeks if count specified
      if (input.weeks_count && input.weeks_count > 0) {
        const weeks = Array.from({ length: input.weeks_count }, (_, i) => ({
          split_id: split.id,
          week_number: i + 1,
          name: `Week ${i + 1}`,
        }));

        const { error: weeksError } = await supabase
          .from('split_weeks')
          .insert(weeks);

        if (weeksError) throw weeksError;
      }

      return split;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-splits'] });
      toast.success('Split created');
    },
    onError: (error) => {
      console.error('Error creating split:', error);
      toast.error('Failed to create split');
    },
  });

  // Update split mutation
  const updateSplit = useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      description?: string;
      goal_tags?: string[];
      workout_type?: 'strength' | 'cardio' | 'mixed';
      difficulty_level?: string;
      days_per_week?: number;
    }) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('training_splits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-splits'] });
      toast.success('Split updated');
    },
  });

  // Delete split
  const deleteSplit = useMutation({
    mutationFn: async (splitId: string) => {
      const { error } = await supabase
        .from('training_splits')
        .delete()
        .eq('id', splitId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-splits'] });
      toast.success('Split deleted');
    },
  });

  // Add week to split
  const addWeek = useMutation({
    mutationFn: async (splitId: string) => {
      // Get current max week number
      const { data: weeks } = await supabase
        .from('split_weeks')
        .select('week_number')
        .eq('split_id', splitId)
        .order('week_number', { ascending: false })
        .limit(1);

      const nextWeek = (weeks?.[0]?.week_number || 0) + 1;

      const { data, error } = await supabase
        .from('split_weeks')
        .insert({
          split_id: splitId,
          week_number: nextWeek,
          name: `Week ${nextWeek}`,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-splits'] });
    },
  });

  // Add workout to week
  const addWorkoutToWeek = useMutation({
    mutationFn: async (input: {
      weekId: string;
      dayLabel?: string;
      dayNumber?: number;
      workoutTemplateId?: string;
      embeddedWorkoutData?: WorkoutTemplateExercise[];
    }) => {
      // Get current max order
      const { data: workouts } = await supabase
        .from('split_workouts')
        .select('order_index')
        .eq('week_id', input.weekId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrder = (workouts?.[0]?.order_index ?? -1) + 1;

      const { data, error } = await supabase
        .from('split_workouts')
        .insert({
          week_id: input.weekId,
          day_label: input.dayLabel || null,
          day_number: input.dayNumber || null,
          order_index: nextOrder,
          workout_template_id: input.workoutTemplateId || null,
          embedded_workout_data: input.embeddedWorkoutData ? JSON.parse(JSON.stringify(input.embeddedWorkoutData)) : null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-splits'] });
    },
  });

  const updateFilters = useCallback((newFilters: Partial<SplitFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ sort: 'popular' });
  }, []);

  return {
    splits: filteredSplits,
    allSplits: splits,
    isLoading,
    error,
    refetch,
    activeTab,
    setActiveTab,
    filters,
    setFilters,
    updateFilters,
    clearFilters,
    createSplit,
    updateSplit,
    deleteSplit,
    addWeek,
    addWorkoutToWeek,
    isCreating: createSplit.isPending,
  };
}

// Hook for active split management
export function useActiveSplit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's active split
  const { data: activeSplit, isLoading, refetch } = useQuery({
    queryKey: ['active-split', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_active_split')
        .select(`
          *,
          training_split:training_splits (
            *,
            split_weeks (
              *,
              split_workouts (*)
            )
          )
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Sort weeks and workouts
      const split = data.training_split as any;
      if (split?.split_weeks) {
        split.split_weeks = split.split_weeks
          .sort((a: SplitWeek, b: SplitWeek) => a.week_number - b.week_number)
          .map((w: any) => ({
            ...w,
            split_workouts: (w.split_workouts || []).sort(
              (a: SplitWorkout, b: SplitWorkout) => a.order_index - b.order_index
            ),
          }));
      }

      return {
        ...data,
        training_split: split,
      } as UserActiveSplit;
    },
    enabled: !!user,
  });

  // Fetch completions for active split
  const { data: completions = [] } = useQuery({
    queryKey: ['split-completions', activeSplit?.split_id],
    queryFn: async () => {
      if (!user || !activeSplit) return [];

      const { data, error } = await supabase
        .from('split_workout_completions')
        .select('*')
        .eq('user_id', user.id)
        .eq('split_id', activeSplit.split_id);

      if (error) throw error;
      return data as SplitWorkoutCompletion[];
    },
    enabled: !!user && !!activeSplit,
  });

  // Calculate next workout
  const nextWorkout = useMemo(() => {
    if (!activeSplit?.training_split?.split_weeks) return null;

    const completedIds = new Set(completions.map(c => c.split_workout_id));
    const currentWeek = activeSplit.training_split.split_weeks.find(
      w => w.week_number === activeSplit.current_week
    );

    if (!currentWeek?.split_workouts) return null;

    // Find first incomplete workout in current week
    const nextInWeek = currentWeek.split_workouts.find(
      w => !completedIds.has(w.id)
    );

    if (nextInWeek) {
      return {
        workout: nextInWeek,
        week: currentWeek,
        weekNumber: activeSplit.current_week,
      };
    }

    // Check next weeks
    for (const week of activeSplit.training_split.split_weeks) {
      if (week.week_number <= activeSplit.current_week) continue;
      
      const nextWorkout = week.split_workouts?.find(w => !completedIds.has(w.id));
      if (nextWorkout) {
        return {
          workout: nextWorkout,
          week,
          weekNumber: week.week_number,
        };
      }
    }

    return null;
  }, [activeSplit, completions]);

  // Calculate progress
  const progress = useMemo(() => {
    if (!activeSplit?.training_split?.split_weeks) {
      return { totalWorkouts: 0, completedWorkouts: 0, percentage: 0 };
    }

    const totalWorkouts = activeSplit.training_split.split_weeks.reduce(
      (sum, w) => sum + (w.split_workouts?.length || 0),
      0
    );
    const completedWorkouts = completions.length;

    return {
      totalWorkouts,
      completedWorkouts,
      percentage: totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0,
    };
  }, [activeSplit, completions]);

  // Set active split
  const setActiveSplit = useMutation({
    mutationFn: async (splitId: string) => {
      if (!user) throw new Error('Must be logged in');

      // Upsert (one active split per user)
      const { error } = await supabase
        .from('user_active_split')
        .upsert({
          user_id: user.id,
          split_id: splitId,
          current_week: 1,
          started_at: new Date().toISOString(),
          activated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      // Increment use count
      try {
        const { data: splitData } = await supabase
          .from('training_splits')
          .select('use_count')
          .eq('id', splitId)
          .single();
        
        if (splitData) {
          await supabase
            .from('training_splits')
            .update({ use_count: (splitData.use_count || 0) + 1 })
            .eq('id', splitId);
        }
      } catch {
        // Non-critical
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-split'] });
      toast.success('Split activated');
    },
  });

  // Clear active split
  const clearActiveSplit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('user_active_split')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-split'] });
      toast.success('Active split cleared');
    },
  });

  // Complete a workout in split
  const completeWorkout = useMutation({
    mutationFn: async (input: {
      splitWorkoutId: string;
      weekId: string;
      workoutSessionId?: string;
    }) => {
      if (!user || !activeSplit) throw new Error('No active split');

      const { error } = await supabase
        .from('split_workout_completions')
        .insert({
          user_id: user.id,
          split_id: activeSplit.split_id,
          week_id: input.weekId,
          split_workout_id: input.splitWorkoutId,
          workout_session_id: input.workoutSessionId || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['split-completions'] });
    },
  });

  return {
    activeSplit,
    isLoading,
    refetch,
    completions,
    nextWorkout,
    progress,
    setActiveSplit,
    clearActiveSplit,
    completeWorkout,
  };
}

// Hook for fetching a single split with full details
export function useTrainingSplit(splitId: string | undefined) {
  return useQuery({
    queryKey: ['training-split', splitId],
    queryFn: async () => {
      if (!splitId) return null;

      const { data, error } = await supabase
        .from('training_splits')
        .select(`
          *,
          split_weeks (
            *,
            split_workouts (
              *,
              workout_template:workout_templates (*)
            )
          )
        `)
        .eq('id', splitId)
        .single();

      if (error) throw error;
      
      // Sort weeks and workouts
      return {
        ...data,
        split_weeks: ((data.split_weeks || []) as any[])
          .sort((a, b) => a.week_number - b.week_number)
          .map((w: any) => ({
            ...w,
            split_workouts: ((w.split_workouts || []) as any[]).sort(
              (a, b) => a.order_index - b.order_index
            ),
          })),
      } as TrainingSplit;
    },
    enabled: !!splitId,
  });
}
