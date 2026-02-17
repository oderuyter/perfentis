import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Play, 
  Dumbbell, 
  Layers,
  FileUp,
  MapPin,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkoutRecoveryPrompt } from "@/components/train/WorkoutRecoveryPrompt";
import { RunRecoveryPrompt } from "@/components/run/RunRecoveryPrompt";
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
    navigate("/workout/free/active");
  };

  return (
    <div className="min-h-screen gradient-page px-5">
      {/* Ambient glow */}
      <div className="fixed inset-0 gradient-glow pointer-events-none" />
      
      {/* Recovery Prompts */}
      <WorkoutRecoveryPrompt />
      <RunRecoveryPrompt />
      
      {/* Header */}
      <header className="relative pt-6 pb-4">
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
          className="text-muted-foreground mt-0.5 text-sm"
        >
          Build strength, track progress
        </motion.p>
      </header>

      <div className="relative space-y-5">
        {/* ===== SECTION 1: Your Plan (most common path) ===== */}
        {user && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <ActiveSplitCard />
          </motion.section>
        )}

        {/* Assigned Plans Section (coach assigned) */}
        <AssignedPlansSection />

        {/* ===== SECTION 2: Quick Start Actions ===== */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="space-y-3"
        >
          <h2 className="section-label px-0.5">Quick Start</h2>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleJustTrain}
              className="card-glass p-4 flex flex-col items-center gap-2.5 active:scale-[0.97] transition-transform"
            >
              <div className="h-11 w-11 rounded-xl bg-primary/12 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">Just Train</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Ad-hoc session</p>
              </div>
            </button>

            <button
              onClick={() => navigate("/run")}
              className="card-glass p-4 flex flex-col items-center gap-2.5 active:scale-[0.97] transition-transform"
            >
              <div className="h-11 w-11 rounded-xl bg-primary/12 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">Run / Walk</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">GPS tracked</p>
              </div>
            </button>

            <button
              onClick={() => navigate("/import?returnTo=/train")}
              className="card-glass p-4 flex flex-col items-center gap-2.5 active:scale-[0.97] transition-transform"
            >
              <div className="h-11 w-11 rounded-xl bg-primary/12 flex items-center justify-center">
                <FileUp className="h-5 w-5 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">Import</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">From file</p>
              </div>
            </button>
          </div>
        </motion.section>

        {/* ===== SECTION 3: Library ===== */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
        >
          <Tabs value={directoryTab} onValueChange={(v) => handleTabChange(v as "workouts" | "splits")}>
            <TabsList className="grid w-full grid-cols-2 mb-4 h-11">
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
        </motion.section>
      </div>
    </div>
  );
}
