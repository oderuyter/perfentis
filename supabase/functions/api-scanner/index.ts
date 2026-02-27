import { corsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { getServiceClient } from "../_shared/supabase.ts";

const KNOWN_API_DOMAINS: Record<string, { name: string; provider: string; category: string }> = {
  "api.resend.com": { name: "Resend Email API", provider: "Resend", category: "email" },
  "api.stripe.com": { name: "Stripe Payments", provider: "Stripe", category: "payments" },
  "api.openai.com": { name: "OpenAI API", provider: "OpenAI", category: "ai" },
  "generativelanguage.googleapis.com": { name: "Google Gemini", provider: "Google", category: "ai" },
  "api.anthropic.com": { name: "Anthropic Claude", provider: "Anthropic", category: "ai" },
  "api.elevenlabs.io": { name: "ElevenLabs TTS", provider: "ElevenLabs", category: "ai" },
  "api.twilio.com": { name: "Twilio", provider: "Twilio", category: "messaging" },
  "hooks.slack.com": { name: "Slack Webhooks", provider: "Slack", category: "messaging" },
  "api.sendgrid.com": { name: "SendGrid Email", provider: "Twilio", category: "email" },
  "api.mailgun.net": { name: "Mailgun", provider: "Mailgun", category: "email" },
  "maps.googleapis.com": { name: "Google Maps", provider: "Google", category: "maps" },
  "api.mapbox.com": { name: "Mapbox", provider: "Mapbox", category: "maps" },
  "api.spotify.com": { name: "Spotify API", provider: "Spotify", category: "other" },
  "api.github.com": { name: "GitHub API", provider: "GitHub", category: "other" },
  "graph.facebook.com": { name: "Facebook Graph API", provider: "Meta", category: "other" },
  "api.fitbit.com": { name: "Fitbit API", provider: "Google", category: "fitness_devices" },
  "api.garmin.com": { name: "Garmin API", provider: "Garmin", category: "fitness_devices" },
  "api.whoop.com": { name: "WHOOP API", provider: "WHOOP", category: "fitness_devices" },
  "api.oura.com": { name: "Oura API", provider: "Oura", category: "health" },
};

const ENV_VAR_PATTERNS = [
  /\b([A-Z][A-Z0-9_]*(?:API_KEY|SECRET|TOKEN|CLIENT_ID|CLIENT_SECRET|PASSWORD|CREDENTIALS))\b/g,
  /\bDeno\.env\.get\(\s*["']([^"']+)["']\s*\)/g,
  /\bprocess\.env\.([A-Z][A-Z0-9_]+)/g,
  /\bimport\.meta\.env\.([A-Z_][A-Z0-9_]+)/g,
];

const FETCH_PATTERNS = [
  /fetch\(\s*[`"']([^`"'\s]+)[`"']/g,
  /fetch\(\s*`([^`]+)`/g,
  /axios\.(get|post|put|patch|delete)\(\s*[`"']([^`"'\s]+)[`"']/g,
  /new\s+URL\(\s*[`"']([^`"'\s]+)[`"']/g,
];

const SDK_PATTERNS = [
  /from\s+["'](@[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*|[a-z][a-z0-9-]*)["']/g,
  /import\s+.*?from\s+["'](https?:\/\/[^"']+)["']/g,
];

interface Discovery {
  discovered_name: string;
  reference_type: string;
  reference_key: string;
  reference_snippet: string;
  confidence_score: number;
}

function scrubSecrets(text: string): string {
  // Mask anything that looks like a key/token
  return text
    .replace(/(?:sk|pk|key|token|secret|password)[-_]?[a-zA-Z0-9]{16,}/gi, "***MASKED***")
    .replace(/[a-f0-9]{32,}/g, "***MASKED***")
    .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, "***JWT_MASKED***");
}

function extractSnippet(content: string, match: string, maxLen = 120): string {
  const idx = content.indexOf(match);
  if (idx < 0) return match.slice(0, maxLen);
  const start = Math.max(0, idx - 20);
  const end = Math.min(content.length, idx + match.length + 40);
  return scrubSecrets(content.slice(start, end).replace(/\n/g, " ").trim()).slice(0, maxLen);
}

function scanCode(content: string, fileName: string): Discovery[] {
  const discoveries: Discovery[] = [];
  const seen = new Set<string>();

  // 1. Detect fetch/axios calls to known domains
  for (const pattern of FETCH_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      const url = match[1] || match[2] || "";
      try {
        const parsed = new URL(url.replace(/\$\{[^}]+\}/g, "placeholder"));
        const host = parsed.hostname;
        const known = KNOWN_API_DOMAINS[host];
        if (known && !seen.has(known.name)) {
          seen.add(known.name);
          discoveries.push({
            discovered_name: known.name,
            reference_type: "endpoint",
            reference_key: fileName,
            reference_snippet: extractSnippet(content, match[0]),
            confidence_score: 0.95,
          });
        } else if (host && !host.includes("localhost") && !host.includes("supabase") && !seen.has(host)) {
          seen.add(host);
          discoveries.push({
            discovered_name: host,
            reference_type: "endpoint",
            reference_key: fileName,
            reference_snippet: extractSnippet(content, match[0]),
            confidence_score: 0.6,
          });
        }
      } catch {
        // Not a valid URL, skip
      }
    }
  }

  // 2. Detect env var usage
  for (const pattern of ENV_VAR_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      const varName = match[1] || match[2];
      if (varName && !seen.has(varName) && !varName.startsWith("SUPABASE_") && !varName.startsWith("VITE_SUPABASE")) {
        seen.add(varName);
        discoveries.push({
          discovered_name: varName,
          reference_type: "env",
          reference_key: fileName,
          reference_snippet: extractSnippet(content, match[0]),
          confidence_score: 0.7,
        });
      }
    }
  }

  // 3. SDK imports
  for (const pattern of SDK_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      const pkg = match[1] || match[2];
      if (pkg && !seen.has(pkg) && !pkg.includes("react") && !pkg.includes("radix") && !pkg.includes("supabase") && !pkg.includes("tailwind")) {
        seen.add(pkg);
        discoveries.push({
          discovered_name: pkg,
          reference_type: "sdk",
          reference_key: fileName,
          reference_snippet: extractSnippet(content, match[0]),
          confidence_score: 0.5,
        });
      }
    }
  }

  return discoveries;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsPreFlight(req);

  try {
    const user = await requireUser(req);
    const supabase = getServiceClient();

    // Check admin
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id, _role: "admin", _scope_type: "global",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const codeContent = body.code_content as string;
    if (!codeContent || codeContent.length < 10) {
      return new Response(JSON.stringify({ error: "code_content required" }), {
        status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Limit size (1MB)
    if (codeContent.length > 1_000_000) {
      return new Response(JSON.stringify({ error: "Content too large (max 1MB)" }), {
        status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Split by file markers if present
    const fileSections = codeContent.split(/\/\/ FILE: /);
    const allDiscoveries: Discovery[] = [];

    for (const section of fileSections) {
      const firstNewline = section.indexOf("\n");
      const fileName = firstNewline > 0 ? section.slice(0, firstNewline).trim() : "unknown";
      const code = firstNewline > 0 ? section.slice(firstNewline) : section;
      const discoveries = scanCode(code, fileName || "pasted-content");
      allDiscoveries.push(...discoveries);
    }

    // Deduplicate
    const uniqueMap = new Map<string, Discovery>();
    for (const d of allDiscoveries) {
      const key = `${d.discovered_name}::${d.reference_key}`;
      if (!uniqueMap.has(key) || d.confidence_score > uniqueMap.get(key)!.confidence_score) {
        uniqueMap.set(key, d);
      }
    }

    const unique = Array.from(uniqueMap.values());

    // Get existing registry entries for auto-linking
    const { data: existingApis } = await supabase.from("api_registry").select("id, name, base_urls");
    const apiMap = new Map<string, string>();
    for (const api of (existingApis || [])) {
      apiMap.set((api as any).name.toLowerCase(), (api as any).id);
      const urls = (api as any).base_urls || [];
      for (const url of urls) {
        try {
          const host = new URL(url).hostname;
          apiMap.set(host, (api as any).id);
        } catch {}
      }
    }

    const scanSessionId = crypto.randomUUID();
    const records = unique.map(d => {
      const nameLower = d.discovered_name.toLowerCase();
      const matchedApiId = apiMap.get(nameLower) || null;
      // Check known domains
      const knownDomain = KNOWN_API_DOMAINS[d.discovered_name];

      return {
        discovered_name: d.discovered_name,
        reference_type: d.reference_type,
        reference_key: d.reference_key,
        reference_snippet: d.reference_snippet,
        confidence_score: d.confidence_score,
        api_registry_id: matchedApiId,
        discovery_status: matchedApiId ? "linked" : "unreviewed",
        scan_session_id: scanSessionId,
      };
    });

    if (records.length > 0) {
      const { error } = await supabase.from("api_registry_references").insert(records);
      if (error) throw error;
    }

    // Update reference counts
    const linkedCounts: Record<string, number> = {};
    for (const r of records) {
      if (r.api_registry_id) {
        linkedCounts[r.api_registry_id] = (linkedCounts[r.api_registry_id] || 0) + 1;
      }
    }

    for (const [apiId, count] of Object.entries(linkedCounts)) {
      const { data: current } = await supabase
        .from("api_registry")
        .select("reference_count")
        .eq("id", apiId)
        .single();
      await supabase
        .from("api_registry")
        .update({
          reference_count: ((current as any)?.reference_count || 0) + count,
          last_scanned_at: new Date().toISOString(),
        })
        .eq("id", apiId);
    }

    // Auto-register known APIs that aren't in registry yet
    const unknownKnownApis = unique
      .filter(d => KNOWN_API_DOMAINS[d.discovered_name] && !apiMap.get(d.discovered_name.toLowerCase()))
      .map(d => KNOWN_API_DOMAINS[d.discovered_name]);

    const seenAutoCreate = new Set<string>();
    for (const api of unknownKnownApis) {
      if (seenAutoCreate.has(api.name)) continue;
      seenAutoCreate.add(api.name);
      await supabase.from("api_registry").upsert({
        name: api.name,
        provider: api.provider,
        category: api.category,
        status: "active",
        auth_type: "api_key",
        reference_count: 1,
        last_scanned_at: new Date().toISOString(),
      }, { onConflict: "name" });
    }

    return new Response(JSON.stringify({
      total_discoveries: unique.length,
      auto_linked: records.filter(r => r.discovery_status === "linked").length,
      unreviewed: records.filter(r => r.discovery_status === "unreviewed").length,
      auto_registered: seenAutoCreate.size,
      scan_session_id: scanSessionId,
    }), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("API Scanner error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
