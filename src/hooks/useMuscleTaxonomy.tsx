import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MuscleGroupRecord, MuscleSubgroupRecord } from '@/types/exercise';

export function useMuscleTaxonomy() {
  const { data: muscleGroups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ['muscle-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('muscle_groups')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as MuscleGroupRecord[];
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
  });

  const { data: muscleSubgroups = [], isLoading: isLoadingSubgroups } = useQuery({
    queryKey: ['muscle-subgroups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('muscle_subgroups')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as MuscleSubgroupRecord[];
    },
    staleTime: 1000 * 60 * 30,
  });

  const getSubgroupsForGroup = (groupId: string) =>
    muscleSubgroups.filter(s => s.muscle_group_id === groupId);

  const getGroupName = (groupId: string) =>
    muscleGroups.find(g => g.id === groupId)?.name || '';

  const getSubgroupName = (subgroupId: string) =>
    muscleSubgroups.find(s => s.id === subgroupId)?.name || '';

  return {
    muscleGroups,
    muscleSubgroups,
    isLoading: isLoadingGroups || isLoadingSubgroups,
    getSubgroupsForGroup,
    getGroupName,
    getSubgroupName,
  };
}
