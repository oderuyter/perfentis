import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bluetooth, BluetoothOff, Star, Trash2, Radio, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHeartRateMonitor, type HRDevice } from "@/hooks/useHeartRateMonitor";

interface HRDevicesSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HRDevicesSheet({ isOpen, onClose }: HRDevicesSheetProps) {
  const {
    devices,
    isLoadingDevices,
    status,
    isSupported,
    connectBLE,
    disconnect,
    removeDevice,
    setPreferred,
    activeDevice,
  } = useHeartRateMonitor();

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
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Heart Rate Monitors</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Browser support message */}
              {!isSupported && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2 mb-2">
                    <BluetoothOff className="h-5 w-5 text-destructive" />
                    <p className="font-medium text-destructive">Bluetooth Not Supported</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Web Bluetooth is required to pair HR monitors. Use Chrome or Edge on desktop, or use the mobile app. iOS Safari does not support Web Bluetooth.
                  </p>
                </div>
              )}

              {/* Pair new device */}
              {isSupported && (
                <section>
                  <h3 className="text-sm font-medium mb-3">Pair a New Device</h3>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="outline"
                      className="justify-start gap-3 h-14"
                      onClick={() => connectBLE()}
                      disabled={status === "connecting"}
                    >
                      <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Bluetooth className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">Pair via Bluetooth (BLE)</p>
                        <p className="text-xs text-muted-foreground">Garmin, Polar, Myzone, Wahoo…</p>
                      </div>
                      {status === "connecting" && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
                    </Button>
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border/50 opacity-60">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                        <Radio className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm text-muted-foreground">ANT+</p>
                        <p className="text-xs text-muted-foreground">Available in mobile app</p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Paired devices list */}
              <section>
                <h3 className="text-sm font-medium mb-3">
                  Paired Devices {devices.length > 0 && `(${devices.length})`}
                </h3>
                {isLoadingDevices ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : devices.length === 0 ? (
                  <div className="text-center py-8">
                    <Radio className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No paired devices</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pair a Bluetooth HR monitor to track your heart rate during workouts
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {devices.map(dev => (
                      <div
                        key={dev.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border",
                          activeDevice?.id === dev.id
                            ? "border-green-500/50 bg-green-500/5"
                            : "border-border/50 bg-muted/20"
                        )}
                      >
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center",
                          activeDevice?.id === dev.id ? "bg-green-500/15" : "bg-primary/10"
                        )}>
                          <Bluetooth className={cn(
                            "h-5 w-5",
                            activeDevice?.id === dev.id ? "text-green-500" : "text-primary"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium truncate">{dev.name}</p>
                            {dev.is_preferred && (
                              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {dev.transport.toUpperCase()}
                            {dev.manufacturer && ` · ${dev.manufacturer}`}
                            {activeDevice?.id === dev.id && " · Connected"}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {!dev.is_preferred && (
                            <button
                              onClick={() => setPreferred(dev.id)}
                              className="p-2 rounded-lg hover:bg-muted transition-colors"
                              title="Set as preferred"
                            >
                              <Star className="h-4 w-4 text-muted-foreground" />
                            </button>
                          )}
                          <button
                            onClick={() => removeDevice(dev.id)}
                            className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                            title="Remove device"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Info */}
              <section className="p-4 rounded-xl bg-muted/30 border border-border/30">
                <h4 className="text-sm font-medium mb-2">Supported Devices</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Garmin</strong> HR straps (HRM-Pro, HRM-Dual) via BLE</li>
                  <li>• <strong>Polar</strong> (H10, H9, OH1, Verity) via BLE</li>
                  <li>• <strong>Myzone</strong> (MZ-Switch, MZ-3) via BLE</li>
                  <li>• <strong>Wahoo</strong> TICKR via BLE</li>
                  <li>• Any device supporting the Bluetooth Heart Rate Service</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3">
                  You can pair multiple devices but only one can be active at a time. Set a preferred device for one-tap connection during workouts.
                </p>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
