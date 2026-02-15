import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Footprints, Moon, Weight, Activity, Heart, Brain } from "lucide-react";

interface HealthTile {
  key: string;
  label: string;
  icon: React.ElementType;
  value: string;
  unit: string;
  color: string;
}

export function HealthDataTiles() {
  const { user } = useAuth();
  const [tiles, setTiles] = useState<HealthTile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchHealthData() {
      setLoading(true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();
      const tomorrowStr = new Date(today.getTime() + 86400000).toISOString();

      // Fetch today's health records from external_data_records
      const { data: records } = await (supabase
        .from("external_data_records") as any)
        .select("data_type, value_json, start_time")
        .eq("user_id", user.id)
        .eq("is_primary", true)
        .gte("start_time", todayStr)
        .lt("start_time", tomorrowStr);

      const result: HealthTile[] = [];

      if (records && records.length > 0) {
        // Aggregate steps
        const stepRecords = records.filter((r: any) => r.data_type === "steps");
        if (stepRecords.length > 0) {
          const totalSteps = stepRecords.reduce((sum: number, r: any) => sum + (r.value_json?.count || 0), 0);
          result.push({
            key: "steps",
            label: "Steps",
            icon: Footprints,
            value: totalSteps.toLocaleString(),
            unit: "steps",
            color: "text-primary",
          });
        }

        // Aggregate calories
        const calRecords = records.filter((r: any) => r.data_type === "calories");
        if (calRecords.length > 0) {
          const totalCals = calRecords.reduce((sum: number, r: any) => sum + (r.value_json?.calories || 0), 0);
          result.push({
            key: "calories",
            label: "Calories",
            icon: Activity,
            value: Math.round(totalCals).toLocaleString(),
            unit: "kcal",
            color: "text-primary",
          });
        }

        // Latest weight
        const weightRecords = records.filter((r: any) => r.data_type === "weight");
        if (weightRecords.length > 0) {
          const latest = weightRecords.sort((a: any, b: any) => b.start_time.localeCompare(a.start_time))[0];
          result.push({
            key: "weight",
            label: "Weight",
            icon: Weight,
            value: (latest.value_json?.kg || 0).toFixed(1),
            unit: "kg",
            color: "text-primary",
          });
        }

        // Sleep (last night)
        const sleepRecords = records.filter((r: any) => r.data_type === "sleep");
        if (sleepRecords.length > 0) {
          const totalMinutes = sleepRecords.reduce((sum: number, r: any) => sum + (r.value_json?.durationMinutes || 0), 0);
          const hours = Math.floor(totalMinutes / 60);
          const mins = totalMinutes % 60;
          result.push({
            key: "sleep",
            label: "Sleep",
            icon: Moon,
            value: `${hours}h ${mins}m`,
            unit: "",
            color: "text-primary",
          });
        }

        // Resting HR
        const hrRecords = records.filter((r: any) => r.data_type === "hr_sample");
        if (hrRecords.length > 0) {
          const avgHr = Math.round(hrRecords.reduce((sum: number, r: any) => sum + (r.value_json?.bpm || 0), 0) / hrRecords.length);
          result.push({
            key: "hr",
            label: "Avg HR",
            icon: Heart,
            value: avgHr.toString(),
            unit: "bpm",
            color: "text-primary",
          });
        }

        // HRV / Stress
        const hrvRecords = records.filter((r: any) => r.data_type === "hrv_stress");
        if (hrvRecords.length > 0) {
          const avgHrv = Math.round(hrvRecords.reduce((sum: number, r: any) => sum + (r.value_json?.hrv_ms || 0), 0) / hrvRecords.length);
          result.push({
            key: "hrv",
            label: "HRV",
            icon: Brain,
            value: avgHrv.toString(),
            unit: "ms",
            color: "text-primary",
          });
        }
      }

      setTiles(result);
      setLoading(false);
    }

    fetchHealthData();
  }, [user]);

  if (loading || tiles.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Health Data</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {tiles.map((tile) => (
          <div key={tile.key} className="card-glass p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <tile.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{tile.label}</p>
              <p className="font-semibold text-sm">
                {tile.value} <span className="text-xs font-normal text-muted-foreground">{tile.unit}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
