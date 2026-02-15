import { supabase } from "@/integrations/supabase/client";
import { getHealthBridge, HealthSample, HealthDataType } from "@/lib/healthBridge";
import { HealthProvider, EnabledMetrics, MetricKey } from "@/hooks/useHealthIntegrations";


/**
 * Generate a fingerprint hash for de-duplication when no source_id is available
 */
function generateFingerprint(
  dataType: string,
  startTime: string,
  endTime: string | undefined,
  value: Record<string, unknown>
): string {
  const key = `${dataType}|${startTime}|${endTime || ""}|${JSON.stringify(value)}`;
  // Simple hash — use first 16 chars of base64
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32-bit int
  }
  return Math.abs(hash).toString(36);
}

/**
 * Check if a record already exists (by source_id or fingerprint)
 */
async function isDuplicate(
  userId: string,
  provider: string,
  dataType: string,
  sample: HealthSample
): Promise<boolean> {
  // Check by source_id first
  if (sample.sourceId) {
    const { data } = await (supabase
      .from("external_data_records") as any)
      .select("id")
      .eq("user_id", userId)
      .eq("provider", provider)
      .eq("source_id", sample.sourceId)
      .limit(1);
    if (data && data.length > 0) return true;
  }

  // Check by fingerprint
  const fp = generateFingerprint(dataType, sample.startTime, sample.endTime, sample.value);
  const { data } = await (supabase
    .from("external_data_records") as any)
    .select("id")
    .eq("user_id", userId)
    .eq("fingerprint_hash", fp)
    .limit(1);
  return !!(data && data.length > 0);
}

/**
 * Ingest samples from a health provider into external_data_records
 */
async function ingestSamples(
  userId: string,
  provider: HealthProvider,
  dataType: HealthDataType,
  samples: HealthSample[],
  isPrimary: boolean
): Promise<number> {
  let ingested = 0;

  for (const sample of samples) {
    const dup = await isDuplicate(userId, provider, dataType, sample);
    if (dup) continue;

    const fp = generateFingerprint(dataType, sample.startTime, sample.endTime, sample.value);

    await (supabase.from("external_data_records") as any).insert({
      user_id: userId,
      provider,
      data_type: dataType,
      source_id: sample.sourceId || null,
      start_time: sample.startTime,
      end_time: sample.endTime || null,
      value_json: sample.value,
      fingerprint_hash: fp,
      is_primary: isPrimary,
    });

    ingested++;
  }

  return ingested;
}

/**
 * Map ingested workout records to workout_sessions
 */
async function mapWorkoutsToSessions(userId: string, provider: HealthProvider) {
  // Get un-linked workout records
  const { data: records } = await (supabase
    .from("external_data_records") as any)
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("data_type", "workout")
    .eq("is_primary", true)
    .is("linked_session_id", null)
    .order("start_time", { ascending: false })
    .limit(50);

  if (!records || records.length === 0) return;

  for (const record of records) {
    const val = record.value_json as any;
    const modality = mapActivityType(val.activityType || val.type || "other");

    // Check for existing session at same time
    const { data: existing } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("user_id", userId)
      .gte("started_at", new Date(new Date(record.start_time).getTime() - 60000).toISOString())
      .lte("started_at", new Date(new Date(record.start_time).getTime() + 60000).toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      // Link to existing
      await (supabase.from("external_data_records") as any)
        .update({ linked_session_id: existing[0].id })
        .eq("id", record.id);
      continue;
    }

    // Create new session
    const { data: session } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: userId,
        modality,
        session_type: "imported",
        started_at: record.start_time,
        ended_at: record.end_time || record.start_time,
        duration_seconds: val.durationSeconds || 0,
        moving_seconds: val.movingSeconds || val.durationSeconds || 0,
        distance_meters: val.distanceMeters || null,
        calories_burned: val.caloriesBurned || null,
        avg_heart_rate: val.avgHeartRate || null,
        max_heart_rate: val.maxHeartRate || null,
        status: "completed",
        privacy_level: "private",
        source: "integration",
      } as any)
      .select("id")
      .single();

    if (session) {
      await (supabase.from("external_data_records") as any)
        .update({ linked_session_id: session.id })
        .eq("id", record.id);
    }
  }
}

function mapActivityType(type: string): string {
  const lower = type.toLowerCase();
  if (lower.includes("run")) return "run";
  if (lower.includes("walk")) return "walk";
  if (lower.includes("cycling") || lower.includes("bike")) return "cardio";
  if (lower.includes("strength") || lower.includes("weight")) return "strength";
  if (lower.includes("swim")) return "cardio";
  if (lower.includes("yoga") || lower.includes("flexibility")) return "flexibility";
  return "other";
}

/**
 * Run a full sync for a single provider
 */
export async function syncProvider(
  userId: string,
  provider: HealthProvider,
  enabledMetrics: EnabledMetrics,
  priorities: { metric_key: string; ordered_providers: string[] }[]
): Promise<{ totalIngested: number; errors: string[] }> {
  const bridge = getHealthBridge(provider);
  const isAvailable = await bridge.isAvailable();
  if (!isAvailable) return { totalIngested: 0, errors: ["Bridge not available"] };

  const errors: string[] = [];
  let totalIngested = 0;
  const now = new Date().toISOString();
  
  // Sync window: last 7 days for incremental
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString();

  const readOps: { key: MetricKey; reader: () => Promise<any> }[] = [
    { key: "steps", reader: () => bridge.readSteps(sinceStr, now) },
    { key: "calories", reader: () => bridge.readCalories(sinceStr, now) },
    { key: "workouts", reader: () => bridge.readWorkouts(sinceStr, now) },
    { key: "heart_rate", reader: () => bridge.readHeartRate(sinceStr, now) },
    { key: "sleep", reader: () => bridge.readSleep(sinceStr, now) },
    { key: "hrv_stress", reader: () => bridge.readHRVStress(sinceStr, now) },
    { key: "weight", reader: () => bridge.readWeight(sinceStr, now) },
    { key: "nutrition", reader: () => bridge.readNutrition(sinceStr, now) },
  ];

  for (const op of readOps) {
    const metricPrefs = enabledMetrics[op.key] as any;
    if (!metricPrefs?.read) continue;

    try {
      const result = await op.reader();
      if (result.success && result.data) {
        // Determine if this provider is primary for this metric
        const prio = priorities.find(p => p.metric_key === op.key);
        const isPrimary = !prio || prio.ordered_providers[0] === provider;

        const count = await ingestSamples(userId, provider, op.key as HealthDataType, result.data, isPrimary);
        totalIngested += count;
      } else if (!result.success) {
        errors.push(`${op.key}: ${result.error}`);
      }
    } catch (e: any) {
      errors.push(`${op.key}: ${e.message}`);
    }
  }

  // Map workouts to sessions
  try {
    await mapWorkoutsToSessions(userId, provider);
  } catch (e: any) {
    errors.push(`workout_mapping: ${e.message}`);
  }

  // Update connection last_sync_at
  await (supabase.from("integration_connections") as any)
    .update({
      last_sync_at: now,
      sync_error: errors.length > 0 ? errors[0] : null,
      sync_error_code: errors.length > 0 ? "PARTIAL_SYNC" : null,
      status: errors.length > 0 ? "error" : "connected",
    })
    .eq("user_id", userId)
    .eq("provider", provider);

  return { totalIngested, errors };
}

/**
 * Write back a completed workout to enabled integrations
 */
export async function writeBackWorkout(
  userId: string,
  sessionId: string,
  workoutData: {
    name: string;
    activityType: string;
    startTime: string;
    endTime: string;
    durationSeconds: number;
    distanceMeters?: number;
    caloriesBurned?: number;
    avgHeartRate?: number;
    maxHeartRate?: number;
  }
) {
  // Get user's connected integrations with write enabled for workouts
  const { data: prefs } = await (supabase
    .from("integration_preferences") as any)
    .select("*")
    .eq("user_id", userId);

  const { data: conns } = await (supabase
    .from("integration_connections") as any)
    .select("*")
    .eq("user_id", userId)
    .eq("status", "connected")
    .eq("enabled", true);

  if (!prefs || !conns) return;

  for (const conn of conns) {
    const pref = prefs.find((p: any) => p.provider === conn.provider);
    if (!pref) continue;

    const metrics = pref.enabled_metrics as any;
    if (!metrics?.workouts?.write) continue;

    // Check if already written back
    const { data: existing } = await (supabase
      .from("external_data_records") as any)
      .select("id")
      .eq("user_id", userId)
      .eq("provider", conn.provider)
      .eq("linked_session_id", sessionId)
      .eq("data_type", "workout")
      .not("writeback_id", "is", null)
      .limit(1);

    if (existing && existing.length > 0) continue; // Already written back

    const bridge = getHealthBridge(conn.provider);
    const result = await bridge.writeWorkout(workoutData);

    if (result.success && result.data) {
      await (supabase.from("external_data_records") as any).insert({
        user_id: userId,
        provider: conn.provider,
        data_type: "workout",
        source_id: null,
        start_time: workoutData.startTime,
        end_time: workoutData.endTime,
        value_json: workoutData,
        writeback_id: result.data.sourceId,
        linked_session_id: sessionId,
        is_primary: false,
      });
    }
  }
}
