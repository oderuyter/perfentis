import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone, Heart, Activity, ChevronRight, Check, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useHealthIntegrations, HealthProvider, MetricKey, EnabledMetrics } from "@/hooks/useHealthIntegrations";
import { cn } from "@/lib/utils";

interface IntegrationsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROVIDERS: { id: HealthProvider; name: string; platform: string; icon: React.ElementType; platformCheck: () => boolean }[] = [
  {
    id: "healthkit",
    name: "Apple Health",
    platform: "iOS",
    icon: Heart,
    platformCheck: () => !!(window as any).Capacitor && /iPad|iPhone|iPod/.test(navigator.userAgent),
  },
  {
    id: "healthconnect",
    name: "Health Connect",
    platform: "Android",
    icon: Activity,
    platformCheck: () => !!(window as any).Capacitor && /Android/.test(navigator.userAgent),
  },
];

const METRIC_LABELS: Record<MetricKey, { label: string; hasWrite: boolean }> = {
  steps: { label: "Steps", hasWrite: false },
  calories: { label: "Calories", hasWrite: true },
  workouts: { label: "Workouts", hasWrite: true },
  heart_rate: { label: "Heart Rate", hasWrite: false },
  sleep: { label: "Sleep", hasWrite: false },
  hrv_stress: { label: "HRV / Stress", hasWrite: false },
  weight: { label: "Body Weight", hasWrite: false },
  nutrition: { label: "Nutrition", hasWrite: true },
};

type ViewState = "hub" | "detail" | "priority";

export function IntegrationsSheet({ isOpen, onClose }: IntegrationsSheetProps) {
  const {
    connections, getConnection, getPreferences, getPriority,
    connectProvider, disconnectProvider, updateMetricToggle, updatePriority,
    initDefaultPriorities, priorities, loading, ALL_METRICS,
  } = useHealthIntegrations();

  const [view, setView] = useState<ViewState>("hub");
  const [selectedProvider, setSelectedProvider] = useState<HealthProvider | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setView("hub");
      setSelectedProvider(null);
      initDefaultPriorities();
    }
  }, [isOpen]);

  const handleConnect = async (provider: HealthProvider) => {
    setConnecting(true);
    await connectProvider(provider);
    setConnecting(false);
  };

  const handleOpenDetail = (provider: HealthProvider) => {
    setSelectedProvider(provider);
    setView("detail");
  };

  const isNative = !!(window as any).Capacitor;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-hidden rounded-t-2xl bg-background flex flex-col pb-bottom-nav"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                {view !== "hub" && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView("hub")}>
                    <ChevronRight className="h-4 w-4 rotate-180" />
                  </Button>
                )}
                <h2 className="text-lg font-semibold">
                  {view === "hub" && "Health Integrations"}
                  {view === "detail" && (selectedProvider === "healthkit" ? "Apple Health" : "Health Connect")}
                  {view === "priority" && "Data Source Priority"}
                </h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : view === "hub" ? (
                <HubView
                  isNative={isNative}
                  connections={connections}
                  getConnection={getConnection}
                  onConnect={handleConnect}
                  onOpenDetail={handleOpenDetail}
                  onOpenPriority={() => setView("priority")}
                  connecting={connecting}
                />
              ) : view === "detail" && selectedProvider ? (
                <DetailView
                  provider={selectedProvider}
                  prefs={getPreferences(selectedProvider)}
                  connection={getConnection(selectedProvider)}
                  onUpdateMetrics={updateMetricToggle}
                  onDisconnect={disconnectProvider}
                />
              ) : view === "priority" ? (
                <PriorityView
                  priorities={priorities}
                  getPriority={getPriority}
                  onUpdatePriority={updatePriority}
                  allMetrics={ALL_METRICS}
                />
              ) : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hub View
function HubView({
  isNative, connections, getConnection, onConnect, onOpenDetail, onOpenPriority, connecting,
}: {
  isNative: boolean;
  connections: any[];
  getConnection: (p: HealthProvider) => any;
  onConnect: (p: HealthProvider) => void;
  onOpenDetail: (p: HealthProvider) => void;
  onOpenPriority: () => void;
  connecting: boolean;
}) {
  return (
    <>
      {!isNative && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <Smartphone className="h-5 w-5 text-primary shrink-0" />
          <div className="text-sm">
            <span className="font-medium">Web Mode</span>
            <span className="text-muted-foreground ml-1">
              Health integrations require the mobile app. Install the app for full access.
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {PROVIDERS.map((provider) => {
          const conn = getConnection(provider.id);
          const isConnected = conn?.status === "connected" && conn?.enabled;
          const available = isNative && provider.platformCheck();

          return (
            <div
              key={provider.id}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border transition-colors",
                !available && !isConnected && "opacity-50"
              )}
            >
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                isConnected ? "bg-primary/15" : "bg-muted"
              )}>
                <provider.icon className={cn("h-5 w-5", isConnected ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{provider.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {provider.platform}
                  </Badge>
                  {isConnected && (
                    <Badge className="text-xs bg-primary/15 text-primary border-primary/30">
                      <Check className="h-3 w-3 mr-0.5" /> Connected
                    </Badge>
                  )}
                  {conn?.status === "error" && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-0.5" /> Error
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isConnected && conn?.last_sync_at
                    ? `Last synced: ${new Date(conn.last_sync_at).toLocaleString()}`
                    : available ? "Tap to connect" : "Requires mobile app"
                  }
                </div>
              </div>
              <div>
                {isConnected ? (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenDetail(provider.id)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : available ? (
                  <Button size="sm" onClick={() => onConnect(provider.id)} disabled={connecting}>
                    {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Priority Button */}
      <button
        onClick={onOpenPriority}
        className="w-full flex items-center justify-between p-4 rounded-xl border hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/12 flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <span className="font-medium block">Data Source Priority</span>
            <span className="text-sm text-muted-foreground">Choose which source wins per metric</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </>
  );
}

// Detail View (per-integration toggles)
function DetailView({
  provider, prefs, connection, onUpdateMetrics, onDisconnect,
}: {
  provider: HealthProvider;
  prefs: any;
  connection: any;
  onUpdateMetrics: (p: HealthProvider, m: EnabledMetrics) => Promise<void>;
  onDisconnect: (p: HealthProvider) => Promise<void>;
}) {
  const metrics: EnabledMetrics = prefs?.enabled_metrics || {
    steps: { read: true },
    calories: { read: true, write: false },
    workouts: { read: true, write: true },
    heart_rate: { read: true },
    sleep: { read: true },
    hrv_stress: { read: true },
    weight: { read: true },
    nutrition: { read: false, write: false },
  };

  const toggleRead = async (key: MetricKey) => {
    const updated = { ...metrics };
    const current = updated[key] as any;
    current.read = !current.read;
    if (!current.read && current.write) current.write = false;
    await onUpdateMetrics(provider, updated);
  };

  const toggleWrite = async (key: MetricKey) => {
    const updated = { ...metrics };
    const current = updated[key] as any;
    if (!current.read) return;
    current.write = !current.write;
    await onUpdateMetrics(provider, updated);
  };

  return (
    <>
      {/* Connection Status */}
      {connection?.sync_error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div className="text-sm text-destructive">
            <span className="font-medium">Sync Error:</span> {connection.sync_error}
          </div>
        </div>
      )}

      {/* Metric Toggles */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Data Access Toggles
        </p>
        {(Object.entries(METRIC_LABELS) as [MetricKey, typeof METRIC_LABELS[MetricKey]][]).map(([key, meta]) => {
          const metricState = (metrics[key] as any) || { read: false };
          return (
            <div key={key} className="flex items-center justify-between p-3 rounded-xl border">
              <div>
                <span className="font-medium text-sm">{meta.label}</span>
                {meta.hasWrite && metricState.read && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">Write-back</span>
                    <Switch
                      checked={!!metricState.write}
                      onCheckedChange={() => toggleWrite(key)}
                      className="scale-75"
                    />
                  </div>
                )}
              </div>
              <Switch
                checked={!!metricState.read}
                onCheckedChange={() => toggleRead(key)}
              />
            </div>
          );
        })}
      </div>

      {/* Disconnect */}
      <Button
        variant="outline"
        className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
        onClick={() => onDisconnect(provider)}
      >
        Disconnect
      </Button>
    </>
  );
}

// Priority View
function PriorityView({
  priorities, getPriority, onUpdatePriority, allMetrics,
}: {
  priorities: any[];
  getPriority: (m: MetricKey) => any;
  onUpdatePriority: (m: MetricKey, providers: string[]) => Promise<void>;
  allMetrics: MetricKey[];
}) {
  const PROVIDER_LABELS: Record<string, string> = {
    healthkit: "Apple Health",
    healthconnect: "Health Connect",
    manual: "Manual Entry",
  };

  const moveUp = async (metric: MetricKey, idx: number) => {
    const prio = getPriority(metric);
    if (!prio || idx === 0) return;
    const arr = [...prio.ordered_providers];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    await onUpdatePriority(metric, arr);
  };

  const moveDown = async (metric: MetricKey, idx: number) => {
    const prio = getPriority(metric);
    if (!prio || idx >= prio.ordered_providers.length - 1) return;
    const arr = [...prio.ordered_providers];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    await onUpdatePriority(metric, arr);
  };

  return (
    <>
      <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20 mb-2">
        <RefreshCw className="h-5 w-5 text-primary shrink-0" />
        <div className="text-sm text-muted-foreground">
          Set which integration takes priority when multiple sources provide the same data. The top source is preferred.
        </div>
      </div>

      <div className="space-y-4">
        {allMetrics.map((metric) => {
          const prio = getPriority(metric);
          const providers = prio?.ordered_providers || ["healthkit", "healthconnect", "manual"];
          return (
            <div key={metric} className="rounded-xl border p-3">
              <p className="font-medium text-sm mb-2">{METRIC_LABELS[metric].label}</p>
              <div className="space-y-1">
                {providers.map((p: string, i: number) => (
                  <div key={p} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/50 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}.</span>
                      <span>{PROVIDER_LABELS[p] || p}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveUp(metric, i)}
                        disabled={i === 0}
                        className="h-6 w-6 rounded flex items-center justify-center hover:bg-background disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveDown(metric, i)}
                        disabled={i === providers.length - 1}
                        className="h-6 w-6 rounded flex items-center justify-center hover:bg-background disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
