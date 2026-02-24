import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { EquipmentRecord } from '@/types/exercise';
import { toast } from 'sonner';

export function useEquipmentLibrary() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as EquipmentRecord[];
    },
    staleTime: 1000 * 60 * 15,
  });

  const approvedEquipment = equipment.filter(e => e.status === 'approved' && e.is_active);

  const createEquipment = useMutation({
    mutationFn: async (input: { name: string; category?: string }) => {
      if (!user) throw new Error('Must be logged in');
      const { data, error } = await supabase
        .from('equipment')
        .insert({
          name: input.name,
          category: input.category || null,
          source: 'user',
          created_by_user_id: user.id,
          status: 'pending',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Equipment submitted for approval');
    },
    onError: () => toast.error('Failed to create equipment'),
  });

  const approveEquipment = useMutation({
    mutationFn: async ({ id, adminNotes }: { id: string; adminNotes?: string }) => {
      const { error } = await supabase
        .from('equipment')
        .update({ status: 'approved', source: 'admin', admin_notes: adminNotes || null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Equipment approved');
    },
  });

  const rejectEquipment = useMutation({
    mutationFn: async ({ id, adminNotes }: { id: string; adminNotes?: string }) => {
      const { error } = await supabase
        .from('equipment')
        .update({ status: 'rejected', admin_notes: adminNotes || null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Equipment rejected');
    },
  });

  const updateEquipment = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; category?: string; is_active?: boolean; admin_notes?: string }) => {
      const { error } = await supabase
        .from('equipment')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Equipment updated');
    },
  });

  const getEquipmentName = (id: string) =>
    equipment.find(e => e.id === id)?.name || '';

  return {
    equipment,
    approvedEquipment,
    isLoading,
    createEquipment: createEquipment.mutateAsync,
    approveEquipment: approveEquipment.mutateAsync,
    rejectEquipment: rejectEquipment.mutateAsync,
    updateEquipment: updateEquipment.mutateAsync,
    getEquipmentName,
    isCreating: createEquipment.isPending,
  };
}
