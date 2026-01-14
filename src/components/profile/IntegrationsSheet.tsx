import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone, Heart, Watch, Activity, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface IntegrationsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const INTEGRATIONS = [
  {
    id: "apple_health",
    name: "Apple Health",
    description: "Sync workouts, heart rate, and activity data",
    icon: Heart,
    available: false,
  },
  {
    id: "google_fit",
    name: "Google Fit",
    description: "Connect your Google Fit account",
    icon: Activity,
    available: false,
  },
  {
    id: "strava",
    name: "Strava",
    description: "Import runs, rides, and activities",
    icon: Activity,
    available: false,
  },
  {
    id: "garmin",
    name: "Garmin Connect",
    description: "Sync with Garmin devices",
    icon: Watch,
    available: false,
  },
  {
    id: "myzone",
    name: "Myzone",
    description: "Heart rate monitoring during workouts",
    icon: Radio,
    available: false,
  },
];

export function IntegrationsSheet({ isOpen, onClose }: IntegrationsSheetProps) {
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
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-hidden rounded-t-2xl bg-background"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Integrations</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <Smartphone className="h-5 w-5 text-primary shrink-0" />
                <div className="text-sm">
                  <span className="font-medium">Coming Soon!</span>
                  <span className="text-muted-foreground ml-1">
                    We're working on bringing you these integrations.
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                {INTEGRATIONS.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-center gap-3 p-4 rounded-xl border opacity-60"
                  >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <integration.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{integration.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          Coming Soon
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {integration.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground text-center pt-4">
                Want a specific integration? Let us know in the feedback section.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
