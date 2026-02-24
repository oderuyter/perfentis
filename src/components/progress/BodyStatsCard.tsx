import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Scale, Plus, TrendingDown, TrendingUp, Minus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format, subMonths } from "date-fns";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface BodyweightLog {
  id: string;
  weight_kg: number;
  logged_at: string;
  source: string;
}

function useBodyweightLogs() {
  const { user } = useAuth();
  return useQuery<BodyweightLog[]>({
    queryKey: ["bodyweight-logs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("bodyweight_logs" as any)
        .select("id, weight_kg, logged_at, source")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: true })
        .limit(365);
      if (error) throw error;
      return (data as any) || [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

export function BodyStatsCard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const { data: logs = [], isLoading } = useBodyweightLogs();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const addWeight = useMutation({
    mutationFn: async (weight: number) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("bodyweight_logs" as any).insert({
        user_id: user.id,
        weight_kg: weight,
        logged_at: new Date().toISOString(),
        source: "manual",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodyweight-logs"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setNewWeight("");
      setIsAdding(false);
      toast.success("Weight logged");
    },
    onError: () => toast.error("Failed to log weight"),
  });

  const handleAddWeight = () => {
    const val = parseFloat(newWeight);
    if (!val || val < 20 || val > 300) {
      toast.error("Enter a valid weight (20–300 kg)");
      return;
    }
    addWeight.mutate(val);
  };

  const currentWeight = profile?.bodyweight_kg;
  const heightCm = profile?.height_cm;
  const sex = profile?.sex;

  // Trend: compare last two logs
  const trend = useMemo(() => {
    if (logs.length < 2) return null;
    const diff = logs[logs.length - 1].weight_kg - logs[logs.length - 2].weight_kg;
    return diff;
  }, [logs]);

  // Chart data (last 3 months)
  const chartData = useMemo(() => {
    const cutoff = subMonths(new Date(), 3);
    return logs
      .filter((l) => new Date(l.logged_at) >= cutoff)
      .map((l) => ({
        date: format(new Date(l.logged_at), "MMM d"),
        weight: Number(l.weight_kg),
      }));
  }, [logs]);

  const hasIntegrationWeight = logs.some((l) => l.source !== "manual");

  if (isLoading) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Body Stats
      </p>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerTrigger asChild>
          <button className="card-glass p-4 w-full text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Scale className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg tabular-nums">
                      {currentWeight ? `${currentWeight} kg` : "—"}
                    </span>
                    {trend !== null && (
                      <span className="flex items-center gap-0.5 text-xs">
                        {trend > 0 ? (
                          <TrendingUp className="h-3 w-3 text-orange-500" />
                        ) : trend < 0 ? (
                          <TrendingDown className="h-3 w-3 text-green-500" />
                        ) : (
                          <Minus className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="text-muted-foreground">
                          {Math.abs(trend).toFixed(1)} kg
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {heightCm && <span>{heightCm} cm</span>}
                    {sex && <span className="capitalize">{sex}</span>}
                    {!currentWeight && (
                      <span className="text-primary">Tap to add weight</span>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Mini sparkline */}
            {chartData.length >= 2 && (
              <div className="mt-3 h-16 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="hsl(var(--primary))"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </button>
        </DrawerTrigger>

        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Bodyweight</DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-8 space-y-5 overflow-y-auto">
            {/* Quick add */}
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="decimal"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder={currentWeight ? `${currentWeight}` : "80.0"}
                className="flex-1"
              />
              <Button
                onClick={handleAddWeight}
                disabled={addWeight.isPending}
                size="sm"
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Log
              </Button>
            </div>

            {hasIntegrationWeight && (
              <p className="text-xs text-muted-foreground">
                Some entries synced from integrations
              </p>
            )}

            {/* Full chart */}
            {chartData.length >= 2 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      domain={["dataMin - 1", "dataMax + 1"]}
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "hsl(var(--primary))" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="card-glass p-6 text-center">
                <Scale className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Log at least 2 entries to see your weight trend
                </p>
              </div>
            )}

            {/* History list */}
            {logs.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  History
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {[...logs].reverse().slice(0, 30).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 text-sm"
                    >
                      <span className="font-medium tabular-nums">
                        {Number(log.weight_kg).toFixed(1)} kg
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.logged_at), "MMM d, yyyy")}
                        {log.source !== "manual" && (
                          <span className="ml-1 text-primary">• synced</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
