import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = 
  | 'admin'
  | 'athlete'
  | 'gym_manager'
  | 'gym_staff'
  | 'gym_user'
  | 'coach'
  | 'coach_client'
  | 'event_organiser'
  | 'event_member';

export type RoleScope = 'global' | 'gym' | 'event';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  scope_type: RoleScope;
  scope_id: string | null;
  granted_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export interface Capability {
  id: string;
  name: string;
  description: string | null;
  scope_type: RoleScope;
}

export function useRoles() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    if (!user) {
      setRoles([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) throw error;
      setRoles((data || []) as UserRole[]);
    } catch (error) {
      console.error("Error fetching roles:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const hasRole = useCallback((role: AppRole, scopeId?: string): boolean => {
    return roles.some(r => {
      if (r.role !== role || !r.is_active) return false;
      if (r.expires_at && new Date(r.expires_at) < new Date()) return false;
      if (scopeId && r.scope_id !== scopeId) return false;
      return true;
    });
  }, [roles]);

  const hasAnyRole = useCallback((roleList: AppRole[], scopeId?: string): boolean => {
    return roleList.some(role => hasRole(role, scopeId));
  }, [hasRole]);

  const isAdmin = useCallback((): boolean => {
    return hasRole('admin');
  }, [hasRole]);

  const isGymManager = useCallback((gymId: string): boolean => {
    return hasRole('gym_manager', gymId) || isAdmin();
  }, [hasRole, isAdmin]);

  const isGymStaff = useCallback((gymId: string): boolean => {
    return hasRole('gym_staff', gymId) || isGymManager(gymId);
  }, [hasRole, isGymManager]);

  const getRolesForScope = useCallback((scopeType: RoleScope, scopeId?: string): UserRole[] => {
    return roles.filter(r => {
      if (r.scope_type !== scopeType) return false;
      if (scopeId && r.scope_id !== scopeId) return false;
      return r.is_active && (!r.expires_at || new Date(r.expires_at) > new Date());
    });
  }, [roles]);

  return {
    roles,
    isLoading,
    hasRole,
    hasAnyRole,
    isAdmin,
    isGymManager,
    isGymStaff,
    getRolesForScope,
    refetch: fetchRoles,
  };
}

export function useCapabilities() {
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCapabilities = async () => {
      try {
        const { data, error } = await supabase
          .from("capabilities")
          .select("*");

        if (error) throw error;
        setCapabilities((data || []) as Capability[]);
      } catch (error) {
        console.error("Error fetching capabilities:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCapabilities();
  }, []);

  return { capabilities, isLoading };
}
