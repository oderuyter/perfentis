import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bluetooth, Smartphone, Users, Activity, Radio, Wifi } from "lucide-react";

interface DeviceStats {
  total_devices: number;
  unique_users: number;
  avg_per_user: number;
  active_30d: number;
}

interface DeviceBreakdown {
  manufacturer: string;
  transport: string;
  total: number;
  unique_users: number;
  last_connected: string | null;
}

const SERVICE_PLACEHOLDERS = [
  { name: "Apple Health", icon: Activity, status: "Coming soon" },
  { name: "Google Fit", icon: Activity, status: "Coming soon" },
  { name: "Strava", icon: Activity, status: "Coming soon" },
  { name: "Garmin Connect", icon: Radio, status: "Coming soon" },
];

export default function AdminConnectedDevices() {
  const [stats, setStats] = useState<DeviceStats>({ total_devices: 0, unique_users: 0, avg_per_user: 0, active_30d: 0 });
  const [breakdown, setBreakdown] = useState<DeviceBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);

      // Total devices count
      const { count: totalDevices } = await supabase
        .from("hr_devices")
        .select("id", { count: "exact", head: true });

      // Unique users
      const { data: usersData } = await supabase
        .from("hr_devices")
        .select("user_id");
      
      const uniqueUserIds = new Set((usersData || []).map((d: any) => d.user_id));
      const uniqueUsers = uniqueUserIds.size;

      // Active in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: active30d } = await supabase
        .from("hr_devices")
        .select("id", { count: "exact", head: true })
        .gte("last_connected_at", thirtyDaysAgo.toISOString());

      setStats({
        total_devices: totalDevices || 0,
        unique_users: uniqueUsers,
        avg_per_user: uniqueUsers > 0 ? Math.round(((totalDevices || 0) / uniqueUsers) * 10) / 10 : 0,
        active_30d: active30d || 0,
      });

      // Breakdown by manufacturer + transport
      const { data: allDevices } = await supabase
        .from("hr_devices")
        .select("manufacturer, transport, user_id, last_connected_at");

      if (allDevices) {
        const groups: Record<string, { users: Set<string>; total: number; lastConnected: string | null }> = {};
        for (const d of allDevices as any[]) {
          const key = `${d.manufacturer || "Unknown"}|${d.transport}`;
          if (!groups[key]) groups[key] = { users: new Set(), total: 0, lastConnected: null };
          groups[key].total++;
          groups[key].users.add(d.user_id);
          if (d.last_connected_at && (!groups[key].lastConnected || d.last_connected_at > groups[key].lastConnected)) {
            groups[key].lastConnected = d.last_connected_at;
          }
        }

        setBreakdown(
          Object.entries(groups).map(([key, val]) => {
            const [manufacturer, transport] = key.split("|");
            return {
              manufacturer,
              transport,
              total: val.total,
              unique_users: val.users.size,
              last_connected: val.lastConnected,
            };
          }).sort((a, b) => b.total - a.total)
        );
      }

      setIsLoading(false);
    }

    fetchData();
  }, []);

  const statTiles = [
    { label: "Total Devices", value: stats.total_devices, icon: Bluetooth },
    { label: "Unique Users", value: stats.unique_users, icon: Users },
    { label: "Avg per User", value: stats.avg_per_user, icon: Smartphone },
    { label: "Active (30d)", value: stats.active_30d, icon: Wifi },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Connected Devices & Services</h1>
        <p className="text-muted-foreground">Monitor device adoption and connectivity across the platform</p>
      </div>

      {/* Summary Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statTiles.map(tile => (
          <Card key={tile.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <tile.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "…" : tile.value}</p>
                  <p className="text-xs text-muted-foreground">{tile.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Devices Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Device Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : breakdown.length === 0 ? (
            <div className="text-center py-12">
              <Bluetooth className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No devices connected yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Transport</TableHead>
                  <TableHead className="text-right">Devices</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead className="text-right">Last Connected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdown.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.manufacturer}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs">
                        {row.transport === "ble" ? <Bluetooth className="h-3 w-3" /> : <Radio className="h-3 w-3" />}
                        {row.transport.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{row.total}</TableCell>
                    <TableCell className="text-right">{row.unique_users}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {row.last_connected ? new Date(row.last_connected).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Services Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Connected Services</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SERVICE_PLACEHOLDERS.map(svc => (
              <div key={svc.name} className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border/50 opacity-60">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <svc.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{svc.name}</p>
                  <p className="text-xs text-muted-foreground">{svc.status}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                  0 connected
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
