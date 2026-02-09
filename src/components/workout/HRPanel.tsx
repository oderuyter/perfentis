import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Bluetooth, BluetoothOff, Star, Trash2, Wifi, WifiOff, Radio, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HRDevice } from "@/hooks/useHeartRateMonitor";

const ZONE_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-orange-500",
  "bg-red-500",
];

const ZONE_LABELS = ["Recovery", "Aerobic", "Tempo", "Threshold", "Max"];

interface HRPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentBPM: number;
  zone: number;
  status: string;
  activeDevice: HRDevice | null;
  devices: HRDevice[];
  timeInZones: Record<number, number>;
  isSupported: boolean;
  onConnect: (device?: HRDevice) => void;
  onDisconnect: () => void;
  onRemoveDevice: (id: string) => void;
  onSetPreferred: (id: string) => void;
  maxHR: number;
}

function formatZoneTime(seconds: number): string {
  if (!seconds || seconds < 1) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function HRPanel({
  isOpen,
  onClose,
  currentBPM,
  zone,
  status,
  activeDevice,
  devices,
  timeInZones,
  isSupported,
  onConnect,
  onDisconnect,
  onRemoveDevice,
  onSetPreferred,
  maxHR,
}: HRPanelProps) {
  const [showDeviceList, setShowDeviceList] = useState(false);
  const totalZoneTime = Object.values(timeInZones).reduce((a, b) => a + b, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[120]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[130] shadow-elevated max-h-[85vh] flex flex-col pb-safe"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                <h3 className="text-lg font-semibold">Heart Rate</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-5 pb-4">
              {/* Live BPM */}
              <div className="text-center">
                <div className={cn(
                  "inline-flex items-center justify-center w-28 h-28 rounded-full border-4",
                  status === "connected" ? ZONE_COLORS[zone - 1] + "/20 border-current" : "bg-muted border-muted-foreground/20"
                )}>
                  <div>
                    <p className={cn(
                      "text-4xl font-bold tabular-nums",
                      status === "connected" ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {status === "connected" && currentBPM > 0 ? currentBPM : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">bpm</p>
                  </div>
                </div>
                {status === "connected" && (
                  <p className={cn("text-sm font-medium mt-2", `text-${zone <= 2 ? "green" : zone <= 3 ? "yellow" : zone <= 4 ? "orange" : "red"}-500`)}>
                    Zone {zone} · {ZONE_LABELS[zone - 1]}
                  </p>
                )}
              </div>

              {/* Connection Status */}
              <div className="flex items-center justify-center gap-3">
                {status === "connected" && activeDevice ? (
                  <>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-500 text-sm">
                      <Wifi className="h-3.5 w-3.5" />
                      <span>{activeDevice.name}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={onDisconnect}>
                      Disconnect
                    </Button>
                  </>
                ) : status === "connecting" || status === "reconnecting" ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{status === "reconnecting" ? "Reconnecting…" : "Connecting…"}</span>
                  </div>
                ) : status === "unsupported" ? (
                  <div className="text-center">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-sm mx-auto w-fit">
                      <BluetoothOff className="h-3.5 w-3.5" />
                      <span>Bluetooth not supported</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
                      Bluetooth HR requires a supported browser (Chrome, Edge) or the mobile app. iOS Safari does not support Web Bluetooth.
                    </p>
                  </div>
                ) : (
                  <Button onClick={() => {
                    const preferred = devices.find(d => d.is_preferred);
                    if (preferred) onConnect(preferred);
                    else onConnect();
                  }} className="gap-2">
                    <Bluetooth className="h-4 w-4" />
                    Connect HR Monitor
                  </Button>
                )}
              </div>

              {/* Time in Zones */}
              {totalZoneTime > 0 && (
                <section>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Time in Zones
                  </p>
                  <div className="space-y-1.5">
                    {[1, 2, 3, 4, 5].map(z => {
                      const t = timeInZones[z] || 0;
                      const pct = totalZoneTime > 0 ? (t / totalZoneTime) * 100 : 0;
                      return (
                        <div key={z} className="flex items-center gap-2">
                          <span className="text-xs w-6 text-right text-muted-foreground">Z{z}</span>
                          <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", ZONE_COLORS[z - 1])}
                              style={{ width: `${Math.max(pct, 1)}%` }}
                            />
                          </div>
                          <span className="text-xs tabular-nums w-12 text-right">{formatZoneTime(t)}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Paired Devices */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Paired Devices
                  </p>
                  {isSupported && (
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onConnect()}>
                      + Scan
                    </Button>
                  )}
                </div>
                {devices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No paired devices yet</p>
                ) : (
                  <div className="space-y-2">
                    {devices.map(dev => (
                      <div key={dev.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Radio className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-sm truncate">{dev.name}</p>
                            {dev.is_preferred && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {dev.transport.toUpperCase()} · {dev.last_connected_at ? `Last: ${new Date(dev.last_connected_at).toLocaleDateString()}` : "Never connected"}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {!dev.is_preferred && (
                            <button onClick={() => onSetPreferred(dev.id)} className="p-1.5 rounded-lg hover:bg-muted" title="Set as preferred">
                              <Star className="h-4 w-4 text-muted-foreground" />
                            </button>
                          )}
                          <button onClick={() => onRemoveDevice(dev.id)} className="p-1.5 rounded-lg hover:bg-destructive/10" title="Remove">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ANT+ notice */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                <p className="text-xs text-muted-foreground">
                  <strong>ANT+</strong> devices are supported in the mobile app. In the browser, connect via Bluetooth Low Energy (BLE). Most Garmin and Polar straps support both BLE and ANT+.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
