import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Offer {
  id: string;
  scope: 'global' | 'gym';
  gym_id: string | null;
  title: string;
  brand_name: string;
  description_short: string | null;
  description_full: string | null;
  offer_type: 'code' | 'affiliate' | 'both';
  discount_code: string | null;
  affiliate_url: string | null;
  category_id: string | null;
  regions: string[];
  starts_at: string | null;
  expires_at: string | null;
  terms_url: string | null;
  featured: boolean;
  status: 'active' | 'archived' | 'disabled';
  media_logo_url: string | null;
  media_cover_url: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  category?: OfferCategory;
  gym?: { id: string; name: string } | null;
}

export interface OfferCategory {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export function useOfferCategories() {
  return useQuery({
    queryKey: ['offer-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offer_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as OfferCategory[];
    }
  });
}

export function useOffers(filters?: {
  categoryId?: string;
  offerType?: 'code' | 'affiliate' | 'both';
  region?: string;
  search?: string;
  gymId?: string;
  scope?: 'global' | 'gym';
}) {
  return useQuery({
    queryKey: ['offers', filters],
    queryFn: async () => {
      let query = supabase
        .from('offers')
        .select(`
          *,
          category:offer_categories(*),
          gym:gyms(id, name)
        `)
        .eq('status', 'active' as const)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters?.offerType) {
        query = query.eq('offer_type', filters.offerType as 'code' | 'affiliate' | 'both');
      }
      if (filters?.scope) {
        query = query.eq('scope', filters.scope as 'global' | 'gym');
      }
      if (filters?.gymId) {
        query = query.eq('gym_id', filters.gymId);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,brand_name.ilike.%${filters.search}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Offer[];
    }
  });
}

export function useOffer(offerId: string | undefined) {
  return useQuery({
    queryKey: ['offer', offerId],
    enabled: !!offerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select(`
          *,
          category:offer_categories(*),
          gym:gyms(id, name)
        `)
        .eq('id', offerId)
        .single();
      
      if (error) throw error;
      return data as Offer;
    }
  });
}

export function useHasActiveMembership() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['has-active-membership', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .is('suspended_at', null)
        .limit(1);
      
      if (error) throw error;
      return data && data.length > 0;
    }
  });
}

export function useTrackOfferEvent() {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ offerId, eventType, metadata }: {
      offerId: string;
      eventType: 'view' | 'affiliate_click' | 'code_copy' | 'unlock_click' | 'report_expired';
      metadata?: Record<string, unknown>;
    }) => {
      const { error } = await supabase
        .from('offer_events')
        .insert([{
          offer_id: offerId,
          user_id: user?.id || null,
          event_type: eventType as 'view' | 'affiliate_click' | 'code_copy' | 'unlock_click' | 'report_expired',
          metadata: (metadata || {}) as Record<string, never>
        }]);
      
      if (error) throw error;
    }
  });
}

export function useCreateOffer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (offer: Partial<Offer>) => {
      const insertData = {
        title: offer.title!,
        brand_name: offer.brand_name!,
        scope: (offer.scope || 'global') as 'global' | 'gym',
        gym_id: offer.gym_id || null,
        description_short: offer.description_short || null,
        description_full: offer.description_full || null,
        offer_type: (offer.offer_type || 'code') as 'code' | 'affiliate' | 'both',
        discount_code: offer.discount_code || null,
        affiliate_url: offer.affiliate_url || null,
        category_id: offer.category_id || null,
        regions: offer.regions || [],
        starts_at: offer.starts_at || null,
        expires_at: offer.expires_at || null,
        terms_url: offer.terms_url || null,
        featured: offer.featured || false,
        status: (offer.status || 'active') as 'active' | 'archived' | 'disabled',
        media_logo_url: offer.media_logo_url || null,
        media_cover_url: offer.media_cover_url || null,
        created_by_user_id: user!.id
      };
      
      const { data, error } = await supabase
        .from('offers')
        .insert([insertData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      toast.success('Offer created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create offer: ' + error.message);
    }
  });
}

export function useUpdateOffer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Offer> & { id: string }) => {
      const { data, error } = await supabase
        .from('offers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      toast.success('Offer updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update offer: ' + error.message);
    }
  });
}

export function useDeleteOffer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      toast.success('Offer deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete offer: ' + error.message);
    }
  });
}

// Admin categories management
export function useAllCategories() {
  return useQuery({
    queryKey: ['all-offer-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offer_categories')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data as OfferCategory[];
    }
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: { name: string; sort_order?: number }) => {
      const { data, error } = await supabase
        .from('offer_categories')
        .insert(category)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-categories'] });
      queryClient.invalidateQueries({ queryKey: ['all-offer-categories'] });
      toast.success('Category created');
    }
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OfferCategory> & { id: string }) => {
      const { error } = await supabase
        .from('offer_categories')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-categories'] });
      queryClient.invalidateQueries({ queryKey: ['all-offer-categories'] });
      toast.success('Category updated');
    }
  });
}

// Supplier submissions
export interface SupplierSubmission {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  website: string | null;
  category_id: string | null;
  description: string;
  proposed_code: string | null;
  proposed_affiliate_url: string | null;
  regions: string[];
  expires_at: string | null;
  status: 'new' | 'contacted' | 'approved' | 'rejected';
  admin_notes: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  category?: OfferCategory;
}

export function useSupplierSubmissions(status?: string) {
  return useQuery({
    queryKey: ['supplier-submissions', status],
    queryFn: async () => {
      let query = supabase
        .from('supplier_submissions')
        .select(`
          *,
          category:offer_categories(*)
        `)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status as 'new' | 'contacted' | 'approved' | 'rejected');
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as SupplierSubmission[];
    }
  });
}

export function useCreateSubmission() {
  return useMutation({
    mutationFn: async (submission: Omit<SupplierSubmission, 'id' | 'status' | 'admin_notes' | 'reviewed_by_user_id' | 'reviewed_at' | 'created_at' | 'category'>) => {
      const { data, error } = await supabase
        .from('supplier_submissions')
        .insert(submission)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Thank you! Your submission has been received.');
    },
    onError: (error) => {
      toast.error('Failed to submit: ' + error.message);
    }
  });
}

export function useUpdateSubmission() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status: 'new' | 'contacted' | 'approved' | 'rejected'; admin_notes?: string }) => {
      const { error } = await supabase
        .from('supplier_submissions')
        .update({
          status: status as 'new' | 'contacted' | 'approved' | 'rejected',
          admin_notes,
          reviewed_by_user_id: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-submissions'] });
      toast.success('Submission updated');
    }
  });
}

// Offer events/analytics for admin
export function useOfferAnalytics(offerId?: string) {
  return useQuery({
    queryKey: ['offer-analytics', offerId],
    queryFn: async () => {
      let query = supabase
        .from('offer_events')
        .select('event_type, created_at');
      
      if (offerId) {
        query = query.eq('offer_id', offerId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Aggregate by event type
      const counts = data.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return {
        views: counts.view || 0,
        affiliateClicks: counts.affiliate_click || 0,
        codeCopies: counts.code_copy || 0,
        unlockClicks: counts.unlock_click || 0,
        reportedExpired: counts.report_expired || 0,
        total: data.length
      };
    }
  });
}

// Admin: get all offers including inactive
export function useAdminOffers(filters?: { status?: 'active' | 'archived' | 'disabled'; scope?: 'global' | 'gym' }) {
  return useQuery({
    queryKey: ['admin-offers', filters],
    queryFn: async () => {
      let query = supabase
        .from('offers')
        .select(`
          *,
          category:offer_categories(*),
          gym:gyms(id, name)
        `)
        .order('created_at', { ascending: false });
      
      if (filters?.status) {
        query = query.eq('status', filters.status as 'active' | 'archived' | 'disabled');
      }
      if (filters?.scope) {
        query = query.eq('scope', filters.scope as 'global' | 'gym');
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Offer[];
    }
  });
}
