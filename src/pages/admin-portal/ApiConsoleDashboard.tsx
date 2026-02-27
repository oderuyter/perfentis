import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApiRegistry, useUnreviewedDiscoveries, useApiCallLogs } from "@/hooks/useApiConsole";
import {
  Globe, AlertTriangle, CheckCircle, Clock, Inbox, ArrowRight,
  Activity, ShieldAlert, TrendingUp,
} from "lucide-react";

export default function ApiConsoleDashboard() {
  const navigate = useNavigate();
  const { data: apis = [] } = useApiRegistry();
  const { data: discoveries = [] } = useUnreviewedDiscoveries();
  const { data: logs = [] } = useApiCallLogs(undefined, 500);

  const stats = useMemo(() => {
    const active = apis.filter(a => a.status === "active").length;
    const planned = apis.filter(a => a.status === "planned").length;
    const deprecated = apis.filter(a => a.status === "deprecated").length;
    const misconfigured = apis.filter(a => {
      const vars = a.required_env_vars || [];
      if (vars.length === 0) return false;
      const presence = a.env_var_presence || {};
      return vars.some((v: string) => {
        const prod = (presence as any)?.prod;
        return !prod || !prod[v];
      });
    }).length;

    const now = Date.now();
    const last24h = logs.filter(l => new Date(l.timestamp).getTime() > now - 86400000);
    const errors24h = last24h.filter(l => l.status_code && l.status_code >= 400);
    
    // Group errors by API
    const errorsByApi: Record<string, number> = {};
    errors24h.forEach(l => {
      const key = l.api_registry_id || "unknown";
      errorsByApi[key] = (errorsByApi[key] || 0) + 1;
    });
    const topErrorApis = Object.entries(errorsByApi)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({
        api: apis.find(a => a.id === id),
        count,
      }));

    return { active, planned, deprecated, misconfigured, discoveries: discoveries.length, topErrorApis, totalCalls24h: last24h.length, totalErrors24h: errors24h.length };
  }, [apis, discoveries, logs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Console</h1>
          <p className="text-muted-foreground">Platform API governance & monitoring</p>
        </div>
        <Button onClick={() => navigate("/admin-portal/api-console/registry")}>
          View Registry <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{apis.length}</p>
                <p className="text-xs text-muted-foreground">Total APIs</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Badge variant="secondary" className="text-xs">{stats.active} Active</Badge>
              <Badge variant="outline" className="text-xs">{stats.planned} Planned</Badge>
              {stats.deprecated > 0 && <Badge variant="destructive" className="text-xs">{stats.deprecated} Deprecated</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.misconfigured}</p>
                <p className="text-xs text-muted-foreground">Missing Env Vars</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalErrors24h}</p>
                <p className="text-xs text-muted-foreground">Errors (24h)</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{stats.totalCalls24h} total calls</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/admin-portal/api-console/discoveries")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Inbox className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.discoveries}</p>
                <p className="text-xs text-muted-foreground">Unreviewed Discoveries</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Leaders & Recent APIs */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Highest Error Rate (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topErrorApis.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" /> No errors in the last 24 hours
              </p>
            ) : (
              <div className="space-y-3">
                {stats.topErrorApis.map(({ api, count }) => (
                  <div key={api?.id || "unknown"} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{api?.name || "Unknown API"}</p>
                      <p className="text-xs text-muted-foreground">{api?.provider}</p>
                    </div>
                    <Badge variant="destructive">{count} errors</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Recently Added APIs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {apis.length === 0 ? (
              <p className="text-sm text-muted-foreground">No APIs registered yet. Run a scan or add manually.</p>
            ) : (
              <div className="space-y-3">
                {apis.slice(0, 5).map(api => (
                  <div
                    key={api.id}
                    className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded-lg -mx-2 transition-colors"
                    onClick={() => navigate(`/admin-portal/api-console/registry/${api.id}`)}
                  >
                    <div>
                      <p className="font-medium text-sm">{api.name}</p>
                      <p className="text-xs text-muted-foreground">{api.provider} · {api.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={api.status === "active" ? "default" : "secondary"}>{api.status}</Badge>
                      {api.health_status === "ok" && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {api.health_status === "warning" && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                      {api.health_status === "down" && <AlertTriangle className="h-4 w-4 text-destructive" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
