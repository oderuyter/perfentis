import { useEffect, useState, useCallback } from "react";
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
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data as UserProfile | null);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to save preferences");
    }
  };

  return { profile, isLoading, updateProfile, refetch: fetchProfile };
}
