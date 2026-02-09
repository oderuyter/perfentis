import { useState } from "react";
import { Target, Plus, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExerciseGoals, ExerciseGoal } from "@/hooks/useExerciseGoals";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from "recharts";

const BAR_COLORS = [
  "hsl(var(--accent-primary))",
  "hsl(var(--status-success))",
  "hsl(var(--status-warning))",
  "hsl(270 60% 58%)",
];

export const ExerciseGoalsSection = () => {
  const { goals, loading, addGoal, removeGoal } = useExerciseGoals();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (loading) return null;

  const chartData = goals.map((g) => ({
    name: g.exercise_name.length > 12 ? g.exercise_name.slice(0, 11) + "…" : g.exercise_name,
    current: g.current_best,
    target: g.target_weight,
    pct: g.target_weight > 0 ? Math.min((g.current_best / g.target_weight) * 100, 100) : 0,
  }));

  return (
    <div className="card-glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Exercise Goals</h3>
        </div>
        {goals.length < 4 && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Add Exercise Goal</DialogTitle>
              </DialogHeader>
              <AddGoalForm
                onAdd={(eid, w, r) => {
                  addGoal(eid, w, r);
                  setDialogOpen(false);
                }}
                existingIds={goals.map((g) => g.exercise_id)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {goals.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Set up to 4 exercise goals to track your progress
          </p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" /> Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Add Exercise Goal</DialogTitle>
              </DialogHeader>
              <AddGoalForm
                onAdd={(eid, w, r) => {
                  addGoal(eid, w, r);
                  setDialogOpen(false);
                }}
                existingIds={[]}
              />
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <>
          {/* Bar chart */}
          <div className="h-44 mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 40, top: 4, bottom: 4 }}>
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Bar dataKey="pct" radius={[0, 6, 6, 0]} barSize={22} background={{ fill: "hsl(var(--muted))", radius: 6 }}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                  <LabelList
                    dataKey="pct"
                    position="right"
                    formatter={(v: number) => `${Math.round(v)}%`}
                    style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Goal details */}
          <div className="space-y-2">
            {goals.map((g, i) => (
              <div key={g.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} />
                  <span className="text-foreground font-medium">{g.exercise_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground tabular-nums">
                    {g.current_best}kg / {g.target_weight}kg
                  </span>
                  <button onClick={() => removeGoal(g.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// --- Add Goal Form ---
interface AddGoalFormProps {
  onAdd: (exerciseId: string, targetWeight: number, targetReps: number) => void;
  existingIds: string[];
}

const AddGoalForm = ({ onAdd, existingIds }: AddGoalFormProps) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [targetWeight, setTargetWeight] = useState("");
  const [searching, setSearching] = useState(false);

  const searchExercises = async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from("exercises")
      .select("id, name")
      .ilike("name", `%${q}%`)
      .not("id", "in", `(${existingIds.length > 0 ? existingIds.join(",") : "00000000-0000-0000-0000-000000000000"})`)
      .limit(8);
    setResults((data || []) as any[]);
    setSearching(false);
  };

  return (
    <div className="space-y-4">
      {!selected ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                searchExercises(e.target.value);
              }}
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {results.map((ex) => (
              <button
                key={ex.id}
                onClick={() => setSelected(ex)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors text-foreground"
              >
                {ex.name}
              </button>
            ))}
            {search.length >= 2 && results.length === 0 && !searching && (
              <p className="text-sm text-muted-foreground text-center py-4">No exercises found</p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="card-glass rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{selected.name}</span>
            <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Target Weight (kg)</label>
            <Input
              type="number"
              placeholder="e.g. 120"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              autoFocus
            />
          </div>
          <Button
            className="w-full"
            disabled={!targetWeight || Number(targetWeight) <= 0}
            onClick={() => onAdd(selected.id, Number(targetWeight), 1)}
          >
            Add Goal
          </Button>
        </>
      )}
    </div>
  );
};
