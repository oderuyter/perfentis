import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

/** Return a Supabase client using the service-role key (full access). */
export function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}
