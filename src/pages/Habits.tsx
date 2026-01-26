import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Check, 
  X, 
  BookOpen, 
  Timer,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Habit {
  id: string;
  title: string;
  type: string;
  frequency: string;
  is_active: boolean;
  completedToday?: boolean;
}

interface JournalEntry {
  id: string;
  text: string;
  created_at: string;
}

interface CoachTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
}

type ActiveView = "home" | "journal" | "meditation" | "add-habit";

const meditationDurations = [
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
  { label: "15 min", seconds: 900 },
  { label: "20 min", seconds: 1200 },
];

export default function Habits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [coachTasks, setCoachTasks] = useState<CoachTask[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>("home");
  
  // New habit form
  const [newHabitTitle, setNewHabitTitle] = useState("");
  const [newHabitFrequency, setNewHabitFrequency] = useState("daily");
  
  // Journal
  const [journalText, setJournalText] = useState("");
  
  // Meditation
  const [selectedDuration, setSelectedDuration] = useState(300);
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const today = new Date();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            saveMeditationSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [habitsRes, completionsRes, journalRes, tasksRes] = await Promise.all([
      supabase.from("habits").select("*").eq("user_id", user.id).eq("is_active", true),
      supabase
        .from("habit_completions")
        .select("habit_id, completed_at")
        .gte("completed_at", startOfToday.toISOString()),
      supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.from("coach_tasks").select("*").eq("user_id", user.id).eq("status", "pending"),
    ]);

    if (habitsRes.data) {
      const completedIds = new Set((completionsRes.data || []).map((c) => c.habit_id));
      setHabits(
        habitsRes.data.map((h) => ({
          ...h,
          completedToday: completedIds.has(h.id),
        }))
      );
    }

    setJournalEntries(journalRes.data || []);
    setCoachTasks(tasksRes.data || []);
    setLoading(false);
  };

  const handleToggleHabit = async (habit: Habit) => {
    if (!user) return;

    if (habit.completedToday) {
      // Un-complete: delete today's completion
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      
      await supabase
        .from("habit_completions")
        .delete()
        .eq("habit_id", habit.id)
        .gte("completed_at", startOfToday.toISOString());
    } else {
      // Complete
      await supabase.from("habit_completions").insert({
        habit_id: habit.id,
      });
    }

    fetchData();
  };

  const handleCreateHabit = async () => {
    if (!user || !newHabitTitle.trim()) return;

    const { error } = await supabase.from("habits").insert({
      user_id: user.id,
      title: newHabitTitle.trim(),
      type: "habit",
      frequency: newHabitFrequency,
    });

    if (error) {
      toast.error("Failed to create habit");
    } else {
      toast.success("Habit created");
      setNewHabitTitle("");
      setActiveView("home");
      fetchData();
    }
  };

  const handleDeleteHabit = async (id: string) => {
    await supabase.from("habits").update({ is_active: false }).eq("id", id);
    fetchData();
  };

  const handleSaveJournal = async () => {
    if (!user || !journalText.trim()) return;

    const { error } = await supabase.from("journal_entries").insert({
      user_id: user.id,
      text: journalText.trim(),
    });

    if (error) {
      toast.error("Failed to save entry");
    } else {
      toast.success("Journal entry saved");
      setJournalText("");
      fetchData();
    }
  };

  const saveMeditationSession = async () => {
    if (!user) return;

    await supabase.from("meditation_sessions").insert({
      user_id: user.id,
      duration_seconds: selectedDuration,
    });

    toast.success("Meditation session completed!");
  };

  const resetMeditation = () => {
    setIsRunning(false);
    setTimeRemaining(selectedDuration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const completedToday = habits.filter((h) => h.completedToday).length;
  const totalHabits = habits.length;

  if (loading) {
    return (
      <div className="min-h-screen px-4 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4">
      {/* Header */}
      <header className="pt-6 pb-4">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight"
        >
          Habits
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-muted-foreground text-sm mt-1"
        >
          {format(today, "EEEE, MMMM d")}
        </motion.p>
      </header>

      {activeView === "home" && (
        <>
          {/* Progress Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="gradient-card-accent rounded-xl p-5 shadow-card border border-border/50 mt-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Today's Progress
                </p>
                <p className="text-3xl font-semibold mt-1">
                  {completedToday}/{totalHabits}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {totalHabits > 0
                    ? `${Math.round((completedToday / totalHabits) * 100)}% complete`
                    : "No habits yet"}
                </p>
              </div>
              <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-accent-foreground" />
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <motion.button
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              onClick={() => setActiveView("journal")}
              className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-left"
            >
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium">Journal</p>
              <p className="text-xs text-muted-foreground">Write your thoughts</p>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => setActiveView("meditation")}
              className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-left"
            >
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <Timer className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium">Meditation</p>
              <p className="text-xs text-muted-foreground">Mindfulness timer</p>
            </motion.button>
          </div>

          {/* Today's Checklist */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Today's Checklist
              </p>
              <button
                onClick={() => setActiveView("add-habit")}
                className="p-1.5 rounded-full bg-accent hover:bg-accent/80 transition-colors"
              >
                <Plus className="h-4 w-4 text-accent-foreground" />
              </button>
            </div>

            <div className="space-y-2">
              {habits.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-card rounded-xl p-6 shadow-card border border-border/50 text-center"
                >
                  <p className="text-muted-foreground">No habits yet</p>
                  <button
                    onClick={() => setActiveView("add-habit")}
                    className="text-sm text-accent-foreground mt-2"
                  >
                    + Add your first habit
                  </button>
                </motion.div>
              ) : (
                habits.map((habit, idx) => (
                  <motion.div
                    key={habit.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                    className="flex items-center gap-3 bg-card rounded-xl p-4 shadow-card border border-border/50"
                  >
                    <button
                      onClick={() => handleToggleHabit(habit)}
                      className={cn(
                        "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors",
                        habit.completedToday
                          ? "bg-primary border-primary"
                          : "border-border hover:border-primary"
                      )}
                    >
                      {habit.completedToday && <Check className="h-4 w-4 text-primary-foreground" />}
                    </button>
                    <div className="flex-1">
                      <p
                        className={cn(
                          "font-medium",
                          habit.completedToday && "line-through text-muted-foreground"
                        )}
                      >
                        {habit.title}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{habit.frequency}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteHabit(habit.id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Coach Tasks */}
          {coachTasks.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Coach Tasks
              </p>
              <div className="space-y-2">
                {coachTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-card rounded-xl p-4 shadow-card border border-border/50"
                  >
                    <p className="font-medium">{task.title}</p>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                    )}
                    {task.due_date && (
                      <p className="text-xs text-accent-foreground mt-2">
                        Due: {format(new Date(task.due_date), "MMM d")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Journal View */}
      {activeView === "journal" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
          <button onClick={() => setActiveView("home")} className="text-sm text-muted-foreground mb-4">
            ← Back
          </button>

          <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 mb-4">
            <Textarea
              placeholder="Write your thoughts..."
              value={journalText}
              onChange={(e) => setJournalText(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <Button onClick={handleSaveJournal} className="w-full mt-3" disabled={!journalText.trim()}>
              Save Entry
            </Button>
          </div>

          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Recent Entries
          </p>

          <div className="space-y-3">
            {journalEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No entries yet</p>
            ) : (
              journalEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-card rounded-xl p-4 shadow-card border border-border/50"
                >
                  <p className="text-xs text-muted-foreground mb-2">
                    {format(new Date(entry.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{entry.text}</p>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* Meditation View */}
      {activeView === "meditation" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
          <button onClick={() => setActiveView("home")} className="text-sm text-muted-foreground mb-4">
            ← Back
          </button>

          <div className="gradient-card-accent rounded-xl p-6 shadow-card border border-border/50 text-center">
            <p className="text-6xl font-light mb-4">{formatTime(timeRemaining)}</p>

            <div className="flex items-center justify-center gap-3 mb-6">
              {!isRunning ? (
                <button
                  onClick={() => setIsRunning(true)}
                  className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground"
                >
                  <Play className="h-6 w-6 ml-1" />
                </button>
              ) : (
                <button
                  onClick={() => setIsRunning(false)}
                  className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground"
                >
                  <Pause className="h-6 w-6" />
                </button>
              )}
              <button
                onClick={resetMeditation}
                className="h-12 w-12 rounded-full bg-muted flex items-center justify-center"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 flex-wrap">
              {meditationDurations.map((d) => (
                <button
                  key={d.seconds}
                  onClick={() => {
                    setSelectedDuration(d.seconds);
                    setTimeRemaining(d.seconds);
                    setIsRunning(false);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                    selectedDuration === d.seconds
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Add Habit View */}
      {activeView === "add-habit" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
          <button onClick={() => setActiveView("home")} className="text-sm text-muted-foreground mb-4">
            ← Back
          </button>

          <div className="bg-card rounded-xl p-4 shadow-card border border-border/50">
            <h2 className="font-semibold mb-4">Create New Habit</h2>
            <Input
              placeholder="Habit name"
              value={newHabitTitle}
              onChange={(e) => setNewHabitTitle(e.target.value)}
              className="mb-3"
            />

            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Frequency
            </p>
            <div className="flex gap-2 mb-4">
              {["daily", "weekly"].map((freq) => (
                <button
                  key={freq}
                  onClick={() => setNewHabitFrequency(freq)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize",
                    newHabitFrequency === freq
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {freq}
                </button>
              ))}
            </div>

            <Button onClick={handleCreateHabit} className="w-full" disabled={!newHabitTitle.trim()}>
              Create Habit
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
