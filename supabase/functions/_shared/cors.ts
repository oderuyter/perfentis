/**
 * Shared CORS helper for all Edge Functions.
 *
 * Reads ALLOWED_ORIGINS from env (comma-separated).
 * Falls back to "*" only when the variable is unset (dev convenience).
 */

const ALWAYS_ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

function getAllowedOrigins(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS");
  if (!raw) return [];
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
}

/**
 * Returns CORS headers for a given request.
 * If ALLOWED_ORIGINS is configured, only echoes the request Origin when it
 * matches the allowlist; otherwise returns "null" as the origin.
 * When ALLOWED_ORIGINS is **not** set, falls back to "*" for dev convenience.
 */
export function corsHeaders(req: Request, extraHeaders?: string): Record<string, string> {
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = req.headers.get("Origin") || "";

  let origin: string;
  if (allowedOrigins.length === 0) {
    // No allowlist configured – fall back to wildcard (development)
    origin = "*";
  } else if (allowedOrigins.includes(requestOrigin)) {
    origin = requestOrigin;
  } else {
    origin = "null";
  }

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": extraHeaders
      ? `${ALWAYS_ALLOWED_HEADERS}, ${extraHeaders}`
      : ALWAYS_ALLOWED_HEADERS,
    Vary: "Origin",
  };

  return headers;
}

/** Convenience: return a 204 preflight response with CORS headers. */
export function handleCorsPreFlight(req: Request, extraHeaders?: string): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req, extraHeaders),
  });
}
