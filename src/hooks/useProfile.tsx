import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  resting_hr: number;
  max_hr: number;
  theme_mode: string;
  accent_color: string;
  created_at: string;
  updated_at: string;
  // Contact fields
  first_name: string | null;
  last_name: string | null;
  telephone: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  youtube_handle: string | null;
  twitter_handle: string | null;
  website_url: string | null;
  // Home address
  address_line1: string | null;
  address_line2: string | null;
  address_city: string | null;
  address_postcode: string | null;
  address_country: string | null;
  // Work address
  work_company: string | null;
  work_address_line1: string | null;
  work_address_line2: string | null;
  work_address_city: string | null;
  work_address_postcode: string | null;
  work_address_country: string | null;
  // Settings
  training_goal: string | null;
  units: string | null;
  hr_zones_mode: string | null;
  hr_zone1_max: number | null;
  hr_zone2_max: number | null;
  hr_zone3_max: number | null;
  hr_zone4_max: number | null;
  hr_zone5_max: number | null;
  date_of_birth: string | null;
  privacy_analytics: boolean | null;
  privacy_insights: boolean | null;
  // Social settings
  social_share_after_workout: boolean | null;
  // Strength score fields
  bodyweight_kg: number | null;
  sex: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile = null, isLoading } = useQuery<UserProfile | null>({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as UserProfile | null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);
      if (error) throw error;
      return updates;
    },
    onMutate: async (updates) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["profile", user?.id] });
      const previous = queryClient.getQueryData<UserProfile | null>(["profile", user?.id]);
      queryClient.setQueryData<UserProfile | null>(
        ["profile", user?.id],
        (old) => (old ? { ...old, ...updates } : old)
      );
      return { previous };
    },
    onError: (_err, _updates, context) => {
      // Rollback
      queryClient.setQueryData(["profile", user?.id], context?.previous);
      toast.error("Failed to save preferences");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => updateProfileMutation.mutateAsync(updates),
    [updateProfileMutation]
  );

  return {
    profile,
    isLoading,
    updateProfile,
    refetch: () => queryClient.invalidateQueries({ queryKey: ["profile", user?.id] }),
  };
}
