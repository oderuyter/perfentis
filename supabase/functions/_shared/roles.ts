import { getServiceClient } from "./supabase.ts";

/**
 * Verify the user has the 'admin' role. Throws if not.
 */
export async function requireAdmin(userId: string): Promise<void> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .eq("is_active", true)
    .single();

  if (!data) throw new Error("Admin access required");
}

/**
 * Check if user has a specific role.
 */
export async function hasRole(userId: string, role: string): Promise<boolean> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", role)
    .eq("is_active", true)
    .single();

  return !!data;
}
