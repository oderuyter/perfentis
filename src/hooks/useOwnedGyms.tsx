import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface OwnedGym {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  logo_url: string | null;
  status: string;
  role: 'owner' | 'manager' | 'staff';
}

export function useOwnedGyms() {
  const { user } = useAuth();
  const [gyms, setGyms] = useState<OwnedGym[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGyms = useCallback(async () => {
    if (!user) {
      setGyms([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch gyms where user is owner
      const { data: ownedGyms, error: ownedError } = await supabase
        .from("gyms")
        .select("id, name, description, address, logo_url, status")
        .eq("owner_id", user.id)
        .eq("status", "active");

      if (ownedError) throw ownedError;

      // Fetch gyms where user has gym_manager role
      const { data: managerRoles, error: managerError } = await supabase
        .from("user_roles")
        .select("scope_id")
        .eq("user_id", user.id)
        .eq("role", "gym_manager")
        .eq("scope_type", "gym")
        .eq("is_active", true);

      if (managerError) throw managerError;

      // Fetch gyms where user has gym_staff role
      const { data: staffRoles, error: staffError } = await supabase
        .from("user_roles")
        .select("scope_id")
        .eq("user_id", user.id)
        .eq("role", "gym_staff")
        .eq("scope_type", "gym")
        .eq("is_active", true);

      if (staffError) throw staffError;

      const managerGymIds = (managerRoles || []).map(r => r.scope_id).filter(Boolean) as string[];
      const staffGymIds = (staffRoles || []).map(r => r.scope_id).filter(Boolean) as string[];

      // Fetch manager gyms if any
      let managerGyms: any[] = [];
      if (managerGymIds.length > 0) {
        const { data, error } = await supabase
          .from("gyms")
          .select("id, name, description, address, logo_url, status")
          .in("id", managerGymIds)
          .eq("status", "active");
        if (!error) managerGyms = data || [];
      }

      // Fetch staff gyms if any
      let staffGyms: any[] = [];
      if (staffGymIds.length > 0) {
        const { data, error } = await supabase
          .from("gyms")
          .select("id, name, description, address, logo_url, status")
          .in("id", staffGymIds)
          .eq("status", "active");
        if (!error) staffGyms = data || [];
      }

      // Combine and dedupe, prioritizing owner > manager > staff
      const gymMap = new Map<string, OwnedGym>();

      (ownedGyms || []).forEach(g => {
        gymMap.set(g.id, { ...g, role: 'owner' });
      });

      managerGyms.forEach(g => {
        if (!gymMap.has(g.id)) {
          gymMap.set(g.id, { ...g, role: 'manager' });
        }
      });

      staffGyms.forEach(g => {
        if (!gymMap.has(g.id)) {
          gymMap.set(g.id, { ...g, role: 'staff' });
        }
      });

      setGyms(Array.from(gymMap.values()));
    } catch (error) {
      console.error("Error fetching owned gyms:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGyms();
  }, [fetchGyms]);

  const hasGymAccess = gyms.length > 0;

  return {
    gyms,
    isLoading,
    hasGymAccess,
    refetch: fetchGyms,
  };
}
