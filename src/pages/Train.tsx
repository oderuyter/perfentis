import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Play, 
  Dumbbell, 
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkoutRecoveryPrompt } from "@/components/train/WorkoutRecoveryPrompt";
import { AssignedPlansSection } from "@/components/train/AssignedPlansSection";
import { ActiveSplitCard } from "@/components/train/ActiveSplitCard";
import { WorkoutDirectory } from "@/components/train/WorkoutDirectory";
import { SplitDirectory } from "@/components/train/SplitDirectory";
import { useAuth } from "@/hooks/useAuth";

export default function Train() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  
  // Read tab from URL params
  const urlTab = searchParams.get('tab');
  const [directoryTab, setDirectoryTab] = useState<"workouts" | "splits">(
    urlTab === 'splits' ? 'splits' : 'workouts'
  );

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'splits' && directoryTab !== 'splits') {
      setDirectoryTab('splits');
    } else if (tab === 'workouts' && directoryTab !== 'workouts') {
      setDirectoryTab('workouts');
    }
  }, [searchParams]);

  const handleTabChange = (tab: "workouts" | "splits") => {
    setDirectoryTab(tab);
    setSearchParams({ tab });
  };

  const handleJustTrain = () => {
    // Navigate to free workout (live builder mode)
    navigate("/workout/free/active");
  };

  return (
    <div className="min-h-screen gradient-page px-5">
      {/* Ambient glow */}
      <div className="fixed inset-0 gradient-glow pointer-events-none" />
      
      {/* Workout Recovery Prompt */}
      <WorkoutRecoveryPrompt />
      
      {/* Header */}
      <header className="relative pt-6 pb-6">
        <motion.h1 
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight"
        >
          Train
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="text-muted-foreground mt-1"
        >
          Build strength, track progress
        </motion.p>
      </header>

      {/* Primary CTA: Just Train */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="mb-6"
      >
        <Button 
          onClick={handleJustTrain}
          className="w-full h-14 text-base font-semibold gap-3 rounded-2xl"
          size="lg"
        >
          <Play className="h-5 w-5" />
          Just Train
        </Button>
        <p className="text-xs text-muted-foreground/70 text-center mt-2.5">
          Start a session and add exercises as you go
        </p>
      </motion.div>

      {/* Active Split Card (if user has one) */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mb-6"
        >
          <ActiveSplitCard />
        </motion.div>
      )}

      {/* Assigned Plans Section (coach assigned) */}
      <AssignedPlansSection />

      {/* Directory Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="mt-6"
      >
        <Tabs value={directoryTab} onValueChange={(v) => handleTabChange(v as "workouts" | "splits")}>
          <TabsList className="grid w-full grid-cols-2 mb-5 h-11">
            <TabsTrigger value="workouts" className="gap-2 text-sm">
              <Dumbbell className="h-4 w-4" />
              Workouts
            </TabsTrigger>
            <TabsTrigger value="splits" className="gap-2 text-sm">
              <Layers className="h-4 w-4" />
              Splits
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workouts" className="mt-0">
            <WorkoutDirectory />
          </TabsContent>

          <TabsContent value="splits" className="mt-0">
            <SplitDirectory />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
