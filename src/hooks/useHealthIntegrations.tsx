import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type HealthProvider = "healthkit" | "healthconnect";
export type ConnectionStatus = "connected" | "disconnected" | "error" | "limited";
export type MetricKey = "steps" | "calories" | "workouts" | "heart_rate" | "sleep" | "hrv_stress" | "weight" | "nutrition";

export interface MetricToggle {
  read: boolean;
  write?: boolean;
}

export interface EnabledMetrics {
  steps: { read: boolean };
  calories: { read: boolean; write: boolean };
  workouts: { read: boolean; write: boolean };
  heart_rate: { read: boolean };
  sleep: { read: boolean };
  hrv_stress: { read: boolean };
  weight: { read: boolean };
  nutrition: { read: boolean; write: boolean };
}

export interface IntegrationConnection {
  id: string;
  user_id: string;
  provider: HealthProvider;
  status: ConnectionStatus;
  enabled: boolean;
  scopes_granted: string[];
  last_sync_at: string | null;
  sync_error: string | null;
  sync_error_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationPreference {
  id: string;
  user_id: string;
  provider: HealthProvider;
  enabled_metrics: EnabledMetrics;
  created_at: string;
  updated_at: string;
}

export interface IntegrationPriority {
  id: string;
  user_id: string;
  metric_key: MetricKey;
  ordered_providers: string[];
  created_at: string;
  updated_at: string;
}

const DEFAULT_METRICS: EnabledMetrics = {
  steps: { read: true },
  calories: { read: true, write: false },
  workouts: { read: true, write: true },
  heart_rate: { read: true },
  sleep: { read: true },
  hrv_stress: { read: true },
  weight: { read: true },
  nutrition: { read: false, write: false },
};

const ALL_METRICS: MetricKey[] = ["steps", "calories", "workouts", "heart_rate", "sleep", "hrv_stress", "weight", "nutrition"];

export function useHealthIntegrations() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [preferences, setPreferences] = useState<IntegrationPreference[]>([]);
  const [priorities, setPriorities] = useState<IntegrationPriority[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [connRes, prefRes, prioRes] = await Promise.all([
      supabase.from("integration_connections").select("*").eq("user_id", user.id),
      supabase.from("integration_preferences").select("*").eq("user_id", user.id),
      supabase.from("integration_priority").select("*").eq("user_id", user.id),
    ]);

    if (connRes.data) setConnections(connRes.data as unknown as IntegrationConnection[]);
    if (prefRes.data) setPreferences(prefRes.data as unknown as IntegrationPreference[]);
    if (prioRes.data) setPriorities(prioRes.data as unknown as IntegrationPriority[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getConnection = (provider: HealthProvider) =>
    connections.find(c => c.provider === provider);

  const getPreferences = (provider: HealthProvider) =>
    preferences.find(p => p.provider === provider);

  const getPriority = (metric: MetricKey) =>
    priorities.find(p => p.metric_key === metric);

  const connectProvider = async (provider: HealthProvider) => {
    if (!user) return;

    // Detect platform capability
    const isNative = !!(window as any).Capacitor;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    if (provider === "healthkit" && (!isNative || !isIOS)) {
      toast.error("Apple Health requires the iOS mobile app");
      return;
    }
    if (provider === "healthconnect" && (!isNative || !isAndroid)) {
      toast.error("Health Connect requires the Android mobile app");
      return;
    }

    // Create connection + preferences records
    const { error: connErr } = await supabase
      .from("integration_connections")
      .upsert({
        user_id: user.id,
        provider,
        status: "connected" as const,
        enabled: true,
        scopes_granted: [],
        last_sync_at: new Date().toISOString(),
      }, { onConflict: "user_id,provider" });

    if (connErr) {
      toast.error("Failed to connect: " + connErr.message);
      return;
    }

    // Create default preferences
    const existingPref = preferences.find(p => p.provider === provider);
    if (!existingPref) {
      await (supabase
        .from("integration_preferences") as any)
        .insert({
          user_id: user.id,
          provider,
          enabled_metrics: DEFAULT_METRICS,
        });
    }

    toast.success(`${provider === "healthkit" ? "Apple Health" : "Health Connect"} connected`);
    await fetchAll();
  };

  const disconnectProvider = async (provider: HealthProvider) => {
    if (!user) return;
    await supabase
      .from("integration_connections")
      .update({ status: "disconnected", enabled: false })
      .eq("user_id", user.id)
      .eq("provider", provider);

    toast.success("Integration disconnected");
    await fetchAll();
  };

  const updateMetricToggle = async (provider: HealthProvider, metrics: EnabledMetrics) => {
    if (!user) return;
    const existing = preferences.find(p => p.provider === provider);
    if (existing) {
      await (supabase
        .from("integration_preferences") as any)
        .update({ enabled_metrics: metrics })
        .eq("id", existing.id);
    } else {
      await (supabase
        .from("integration_preferences") as any)
        .insert({
          user_id: user.id,
          provider,
          enabled_metrics: metrics,
        });
    }
    await fetchAll();
  };

  const updatePriority = async (metric: MetricKey, orderedProviders: string[]) => {
    if (!user) return;
    await (supabase
      .from("integration_priority") as any)
      .upsert({
        user_id: user.id,
        metric_key: metric,
        ordered_providers: orderedProviders,
      }, { onConflict: "user_id,metric_key" });

    await fetchAll();
  };

  // Initialize default priorities if none exist
  const initDefaultPriorities = async () => {
    if (!user || priorities.length > 0) return;
    const defaults = ALL_METRICS.map(metric => ({
      user_id: user.id,
      metric_key: metric,
      ordered_providers: ["healthkit", "healthconnect", "manual"],
    }));
    await (supabase.from("integration_priority") as any).upsert(
      defaults,
      { onConflict: "user_id,metric_key" }
    );
    await fetchAll();
  };

  return {
    connections,
    preferences,
    priorities,
    loading,
    getConnection,
    getPreferences,
    getPriority,
    connectProvider,
    disconnectProvider,
    updateMetricToggle,
    updatePriority,
    initDefaultPriorities,
    refetch: fetchAll,
    ALL_METRICS,
  };
}
