import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HeartRateZonesSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const ZONE_COLORS = [
  { bg: "bg-blue-500/20", text: "text-blue-500", border: "border-blue-500" },
  { bg: "bg-green-500/20", text: "text-green-500", border: "border-green-500" },
  { bg: "bg-yellow-500/20", text: "text-yellow-500", border: "border-yellow-500" },
  { bg: "bg-orange-500/20", text: "text-orange-500", border: "border-orange-500" },
  { bg: "bg-red-500/20", text: "text-red-500", border: "border-red-500" },
];

const ZONE_LABELS = [
  { name: "Zone 1", description: "Recovery", percentMin: 50, percentMax: 60 },
  { name: "Zone 2", description: "Aerobic", percentMin: 60, percentMax: 70 },
  { name: "Zone 3", description: "Tempo", percentMin: 70, percentMax: 80 },
  { name: "Zone 4", description: "Threshold", percentMin: 80, percentMax: 90 },
  { name: "Zone 5", description: "Max Effort", percentMin: 90, percentMax: 100 },
];

export function HeartRateZonesSheet({ isOpen, onClose }: HeartRateZonesSheetProps) {
  const { profile, updateProfile } = useProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [isAutomatic, setIsAutomatic] = useState(true);
  const [restingHR, setRestingHR] = useState(60);
  const [maxHR, setMaxHR] = useState(190);
  const [manualZones, setManualZones] = useState<number[]>([0, 0, 0, 0, 0]);

  useEffect(() => {
    if (profile) {
      setIsAutomatic(profile.hr_zones_mode !== "manual");
      setRestingHR(profile.resting_hr || 60);
      setMaxHR(profile.max_hr || 220 - 30); // Default age 30 if not set
      
      if (profile.hr_zones_mode === "manual") {
        setManualZones([
          profile.hr_zone1_max || 0,
          profile.hr_zone2_max || 0,
          profile.hr_zone3_max || 0,
          profile.hr_zone4_max || 0,
          profile.hr_zone5_max || 0,
        ]);
      }
    }
  }, [profile]);

  // Calculate automatic zones based on max HR
  const calculatedZones = useMemo(() => {
    return ZONE_LABELS.map(zone => ({
      ...zone,
      min: Math.round(maxHR * (zone.percentMin / 100)),
      max: Math.round(maxHR * (zone.percentMax / 100)),
    }));
  }, [maxHR]);

  const displayZones = useMemo(() => {
    if (isAutomatic) {
      return calculatedZones.map(z => z.max);
    }
    return manualZones;
  }, [isAutomatic, calculatedZones, manualZones]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Record<string, unknown> = {
        resting_hr: restingHR,
        max_hr: maxHR,
        hr_zones_mode: isAutomatic ? "automatic" : "manual",
      };

      if (!isAutomatic) {
        updates.hr_zone1_max = manualZones[0];
        updates.hr_zone2_max = manualZones[1];
        updates.hr_zone3_max = manualZones[2];
        updates.hr_zone4_max = manualZones[3];
        updates.hr_zone5_max = manualZones[4];
      }

      await updateProfile(updates);
      toast.success("Heart rate zones saved");
      onClose();
    } catch (error) {
      toast.error("Failed to save zones");
    } finally {
      setIsSaving(false);
    }
  };

  const resetToAutomatic = () => {
    setIsAutomatic(true);
    setManualZones(calculatedZones.map(z => z.max));
  };

  const updateManualZone = (index: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setManualZones(prev => {
      const newZones = [...prev];
      newZones[index] = numValue;
      return newZones;
    });
  };

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
              <h2 className="text-lg font-semibold">Heart Rate Zones</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Base Values */}
              <section className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Resting HR (bpm)</Label>
                    <Input
                      type="number"
                      value={restingHR}
                      onChange={(e) => setRestingHR(parseInt(e.target.value) || 60)}
                      min={30}
                      max={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max HR (bpm)</Label>
                    <Input
                      type="number"
                      value={maxHR}
                      onChange={(e) => setMaxHR(parseInt(e.target.value) || 190)}
                      min={100}
                      max={220}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Standard formula: Max HR = 220 − age. Override if you know your actual max.
                </p>
              </section>

              {/* Auto/Manual Toggle */}
              <section className="flex items-center justify-between p-4 rounded-xl border">
                <div>
                  <div className="font-medium">Automatic Zones</div>
                  <div className="text-sm text-muted-foreground">
                    Calculate zones from max HR
                  </div>
                </div>
                <Switch
                  checked={isAutomatic}
                  onCheckedChange={(checked) => {
                    setIsAutomatic(checked);
                    if (checked) {
                      setManualZones(calculatedZones.map(z => z.max));
                    }
                  }}
                />
              </section>

              {/* Zone Display/Edit */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Zone Boundaries</Label>
                  {!isAutomatic && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetToAutomatic}
                      className="text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {ZONE_LABELS.map((zone, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border",
                        ZONE_COLORS[index].bg,
                        ZONE_COLORS[index].border
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className={cn("font-medium text-sm", ZONE_COLORS[index].text)}>
                          {zone.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {zone.description} ({zone.percentMin}-{zone.percentMax}%)
                        </div>
                      </div>
                      
                      {isAutomatic ? (
                        <div className="text-right">
                          <div className="font-mono text-sm">
                            {index === 0 
                              ? `< ${displayZones[index]}` 
                              : `${calculatedZones[index - 1]?.max || 0} - ${displayZones[index]}`
                            }
                          </div>
                          <div className="text-xs text-muted-foreground">bpm</div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Max:</span>
                          <Input
                            type="number"
                            value={manualZones[index] || ""}
                            onChange={(e) => updateManualZone(index, e.target.value)}
                            className="w-20 text-center"
                            min={60}
                            max={220}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="p-4 border-t bg-background">
              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving ? "Saving..." : "Save Zones"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
