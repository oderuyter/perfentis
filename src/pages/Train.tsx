import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { 
  Play, 
  Dumbbell, 
  Heart, 
  Zap, 
  Clock, 
  ChevronRight,
  Library,
  Layers,
  Plus,
  Search,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { WorkoutRecoveryPrompt } from "@/components/train/WorkoutRecoveryPrompt";
import { AssignedPlansSection } from "@/components/train/AssignedPlansSection";
import { ActiveSplitCard } from "@/components/train/ActiveSplitCard";
import { WorkoutDirectory } from "@/components/train/WorkoutDirectory";
import { SplitDirectory } from "@/components/train/SplitDirectory";
import { useAuth } from "@/hooks/useAuth";

export default function Train() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [directoryTab, setDirectoryTab] = useState<"workouts" | "splits">("workouts");

  const handleJustTrain = () => {
    // Navigate to free workout (live builder mode)
    navigate("/workout/free/active");
  };

  return (
    <div className="min-h-screen gradient-page pt-safe px-4 pb-28">
      {/* Ambient glow */}
      <div className="fixed inset-0 gradient-glow pointer-events-none" />
      
      {/* Workout Recovery Prompt */}
      <WorkoutRecoveryPrompt />
      
      {/* Header */}
      <header className="relative pt-14 pb-4">
        <motion.h1 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold tracking-tight"
        >
          Train
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-muted-foreground mt-1"
        >
          Build strength, track progress
        </motion.p>
      </header>

      {/* Primary CTA: Just Train */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <Button 
          onClick={handleJustTrain}
          className="w-full h-16 text-lg font-semibold gap-3 bg-primary hover:bg-primary/90"
          size="lg"
        >
          <Play className="h-6 w-6" />
          Just Train
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Start a session and add exercises as you go
        </p>
      </motion.div>

      {/* Active Split Card (if user has one) */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <ActiveSplitCard />
        </motion.div>
      )}

      {/* Assigned Plans Section (coach assigned) */}
      <AssignedPlansSection />

      {/* Directory Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6"
      >
        <Tabs value={directoryTab} onValueChange={(v) => setDirectoryTab(v as "workouts" | "splits")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="workouts" className="gap-2">
              <Dumbbell className="h-4 w-4" />
              Workouts
            </TabsTrigger>
            <TabsTrigger value="splits" className="gap-2">
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
