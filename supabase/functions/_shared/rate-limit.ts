import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

/**
 * Shared rate-limiting helper for edge functions.
 * Uses the edge_function_rate_limits table (service_role only).
 *
 * Returns { allowed: boolean, retryAfterSeconds?: number }
 */
export async function checkRateLimit(options: {
  functionName: string;
  actorKey: string; // e.g. user ID or IP
  maxPerMinute: number;
  maxPerDay: number;
}): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const { functionName, actorKey, maxPerMinute, maxPerDay } = options;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60_000).toISOString();
  const oneDayAgo = new Date(now.getTime() - 86_400_000).toISOString();

  // Count requests in last minute
  const { count: minuteCount } = await supabase
    .from("edge_function_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("function_name", functionName)
    .eq("actor_key", actorKey)
    .gte("window_start", oneMinuteAgo);

  if ((minuteCount ?? 0) >= maxPerMinute) {
    return { allowed: false, retryAfterSeconds: 60 };
  }

  // Count requests in last day
  const { count: dayCount } = await supabase
    .from("edge_function_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("function_name", functionName)
    .eq("actor_key", actorKey)
    .gte("window_start", oneDayAgo);

  if ((dayCount ?? 0) >= maxPerDay) {
    return { allowed: false, retryAfterSeconds: 3600 };
  }

  // Record this request
  await supabase.from("edge_function_rate_limits").insert({
    function_name: functionName,
    actor_key: actorKey,
    window_start: now.toISOString(),
  });

  return { allowed: true };
}
