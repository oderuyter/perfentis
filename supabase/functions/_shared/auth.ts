import { getServiceClient } from "./supabase.ts";

export interface AuthUser {
  id: string;
  email?: string;
}

/**
 * Extract and validate a bearer token from the request, returning the
 * authenticated Supabase user. Throws on failure.
 */
export async function requireUser(req: Request): Promise<AuthUser> {
  const header = req.headers.get("Authorization");
  if (!header) throw new Error("No authorization header");

  const token = header.replace("Bearer ", "");
  const supabase = getServiceClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) throw new Error("Invalid authorization");
  return { id: user.id, email: user.email ?? undefined };
}
