import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Target, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TrainingGoalsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const TRAINING_GOALS = [
  { id: "build_muscle", label: "Build Muscle", description: "Increase muscle mass and strength" },
  { id: "lose_weight", label: "Lose Weight", description: "Burn fat and reduce body weight" },
  { id: "get_stronger", label: "Get Stronger", description: "Increase maximum strength" },
  { id: "improve_endurance", label: "Improve Endurance", description: "Build cardiovascular fitness" },
  { id: "general_fitness", label: "General Fitness", description: "Overall health and wellness" },
  { id: "athletic_performance", label: "Athletic Performance", description: "Sport-specific training" },
  { id: "flexibility", label: "Flexibility & Mobility", description: "Improve range of motion" },
  { id: "maintain", label: "Maintain Current Level", description: "Stay consistent with current fitness" },
];

export function TrainingGoalsSheet({ isOpen, onClose }: TrainingGoalsSheetProps) {
  const { profile, updateProfile } = useProfile();
  const [selectedGoal, setSelectedGoal] = useState<string>("general_fitness");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile?.training_goal) {
      setSelectedGoal(profile.training_goal);
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ training_goal: selectedGoal });
      toast.success("Training goal updated");
      onClose();
    } catch (error) {
      toast.error("Failed to update goal");
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
              <h2 className="text-lg font-semibold">Training Goal</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-sm text-muted-foreground mb-4">
                Select your primary training goal. This helps personalize your experience.
              </p>
              
              <div className="space-y-2">
                {TRAINING_GOALS.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => setSelectedGoal(goal.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                      selectedGoal === goal.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                      selectedGoal === goal.id ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      {selectedGoal === goal.id ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Target className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{goal.label}</div>
                      <div className="text-sm text-muted-foreground">{goal.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t bg-background">
              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving ? "Saving..." : "Save Goal"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
