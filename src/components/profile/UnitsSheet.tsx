import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Ruler, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UnitsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const UNIT_OPTIONS = [
  { 
    id: "metric", 
    label: "Metric", 
    description: "Kilograms, meters, kilometers",
    examples: "Weight: 75 kg • Distance: 5 km • Height: 180 cm"
  },
  { 
    id: "imperial", 
    label: "Imperial", 
    description: "Pounds, feet, miles",
    examples: "Weight: 165 lbs • Distance: 3.1 mi • Height: 5'11\""
  },
];

export function UnitsSheet({ isOpen, onClose }: UnitsSheetProps) {
  const { profile, updateProfile } = useProfile();
  const [selectedUnit, setSelectedUnit] = useState<string>("metric");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile?.units) {
      setSelectedUnit(profile.units);
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ units: selectedUnit });
      toast.success("Units preference updated");
      onClose();
    } catch (error) {
      toast.error("Failed to update units");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[130] max-h-[90vh] overflow-hidden rounded-t-2xl bg-background flex flex-col pb-bottom-nav"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Units</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose how measurements are displayed throughout the app. This only affects display — your data is stored in its original format.
              </p>
              
              <div className="space-y-3">
                {UNIT_OPTIONS.map((unit) => (
                  <button
                    key={unit.id}
                    onClick={() => setSelectedUnit(unit.id)}
                    className={cn(
                      "w-full flex items-start gap-3 p-4 rounded-xl border transition-all text-left",
                      selectedUnit === unit.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      selectedUnit === unit.id ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      {selectedUnit === unit.id ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Ruler className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{unit.label}</div>
                      <div className="text-sm text-muted-foreground">{unit.description}</div>
                      <div className="text-xs text-muted-foreground/70 mt-1">{unit.examples}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t bg-background">
              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving ? "Saving..." : "Save Preference"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
