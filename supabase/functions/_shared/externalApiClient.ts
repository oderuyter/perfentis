/**
 * Governance-aware external API client.
 * All outbound calls to external APIs should go through this wrapper
 * to ensure consistent logging, governance enforcement, and monitoring.
 */

import { getServiceClient } from "./supabase.ts";

interface ExternalApiConfig {
  method?: string;
  headers?: Record<string, string>;
  body?: string | FormData;
  timeout?: number;
}

interface ExternalApiResult {
  ok: boolean;
  status: number;
  data: unknown;
  latencyMs: number;
}

/**
 * Make a governed external API call.
 * 
 * @param apiName - Must match a name in the api_registry table
 * @param url - Full URL to call
 * @param config - Request configuration
 * @param options - Additional options
 */
export async function externalApiClient(
  apiName: string,
  url: string,
  config: ExternalApiConfig = {},
  options: { userId?: string; correlationId?: string; skipGovernance?: boolean } = {}
): Promise<ExternalApiResult> {
  const supabase = getServiceClient();
  const startTime = Date.now();

  let parsedHost = "";
  let parsedPath = "";
  try {
    const u = new URL(url);
    parsedHost = u.hostname;
    parsedPath = u.pathname;
  } catch {
    parsedHost = url.slice(0, 50);
  }

  // Look up API in registry
  const { data: apiEntry } = await supabase
    .from("api_registry")
    .select("id, status")
    .eq("name", apiName)
    .single();

  if (!apiEntry && !options.skipGovernance) {
    // Check governance settings
    const { data: settings } = await supabase
      .from("api_governance_settings")
      .select("block_unregistered_in_prod, auto_discover_enabled")
      .limit(1)
      .single();

    const shouldBlock = (settings as any)?.block_unregistered_in_prod === true;

    // Auto-create a discovery reference
    if ((settings as any)?.auto_discover_enabled !== false) {
      await supabase.from("api_registry_references").insert({
        discovered_name: apiName,
        reference_type: "code",
        reference_key: `runtime:${parsedHost}`,
        reference_snippet: `${config.method || "GET"} ${parsedHost}${parsedPath}`.slice(0, 120),
        confidence_score: 0.9,
        discovery_status: "unreviewed",
      });
    }

    if (shouldBlock) {
      // Log the blocked call
      await supabase.from("api_call_logs").insert({
        environment: "prod",
        request_method: config.method || "GET",
        request_host: parsedHost,
        request_path: parsedPath,
        status_code: 0,
        latency_ms: 0,
        error_type: "governance_blocked",
        correlation_id: options.correlationId,
        user_id: options.userId,
        raw_meta: { api_name: apiName, reason: "unregistered" },
      });

      return {
        ok: false,
        status: 0,
        data: { error: `API "${apiName}" is not registered. Register it before use.` },
        latencyMs: 0,
      };
    }

    // Log warning but allow
    console.warn(`[GOVERNANCE] API "${apiName}" is not registered in api_registry`);
  }

  // Make the actual call
  let response: Response;
  let errorType: string | null = null;
  let statusCode = 0;

  try {
    const controller = new AbortController();
    const timeoutMs = config.timeout || 30000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    response = await fetch(url, {
      method: config.method || "GET",
      headers: config.headers,
      body: config.body,
      signal: controller.signal,
    });

    clearTimeout(timer);
    statusCode = response.status;

    if (statusCode >= 500) errorType = "5xx";
    else if (statusCode >= 400) errorType = "4xx";
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    errorType = (err as Error).name === "AbortError" ? "timeout" : "network";

    // Log failure
    await supabase.from("api_call_logs").insert({
      api_registry_id: (apiEntry as any)?.id || null,
      environment: "prod",
      request_method: config.method || "GET",
      request_host: parsedHost,
      request_path: parsedPath,
      status_code: 0,
      latency_ms: latencyMs,
      error_type: errorType,
      correlation_id: options.correlationId,
      user_id: options.userId,
      raw_meta: { api_name: apiName, error: (err as Error).message },
    });

    // Update last_used_at
    if ((apiEntry as any)?.id) {
      await supabase.from("api_registry").update({ last_used_at: new Date().toISOString() }).eq("id", (apiEntry as any).id);
    }

    return {
      ok: false,
      status: 0,
      data: { error: (err as Error).message },
      latencyMs,
    };
  }

  const latencyMs = Date.now() - startTime;
  let data: unknown;
  try {
    const text = await response.text();
    try { data = JSON.parse(text); } catch { data = text; }
  } catch {
    data = null;
  }

  // Log the call
  await supabase.from("api_call_logs").insert({
    api_registry_id: (apiEntry as any)?.id || null,
    environment: "prod",
    request_method: config.method || "GET",
    request_host: parsedHost,
    request_path: parsedPath,
    status_code: statusCode,
    latency_ms: latencyMs,
    error_type: errorType,
    correlation_id: options.correlationId,
    user_id: options.userId,
    raw_meta: { api_name: apiName },
  });

  // Update last_used_at and health
  if ((apiEntry as any)?.id) {
    const healthStatus = errorType ? (statusCode >= 500 ? "down" : "warning") : "ok";
    await supabase.from("api_registry").update({
      last_used_at: new Date().toISOString(),
      health_status: healthStatus,
    }).eq("id", (apiEntry as any).id);
  }

  return {
    ok: response.ok,
    status: statusCode,
    data,
    latencyMs,
  };
}
