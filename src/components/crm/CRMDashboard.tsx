import { 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle,
  MessageSquare,
  Calendar,
  Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCRMStats, CRMContextType } from "@/hooks/useCRM";

interface CRMDashboardProps {
  contextType: CRMContextType;
  contextId: string;
}

export function CRMDashboard({ contextType, contextId }: CRMDashboardProps) {
  const { stats, isLoading } = useCRMStats(contextType, contextId);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Leads"
          value={stats.totalLeads}
          icon={Users}
          description="All time"
        />
        <StatCard
          title="Open Leads"
          value={stats.openLeads}
          icon={MessageSquare}
          description="Active pipeline"
          className="text-blue-600"
        />
        <StatCard
          title="Won"
          value={stats.wonLeads}
          icon={CheckCircle2}
          description="Converted"
          className="text-green-600"
        />
        <StatCard
          title="Lost"
          value={stats.lostLeads}
          icon={XCircle}
          description="Not converted"
          className="text-red-600"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="This Month"
          value={stats.leadsThisMonth}
          icon={Calendar}
          description="New leads"
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats.conversionRate}%`}
          icon={Target}
          description="Won / Closed"
          className={stats.conversionRate >= 50 ? "text-green-600" : "text-amber-600"}
        />
        <StatCard
          title="Avg. Time to Convert"
          value={stats.avgTimeToConvert > 0 ? `${stats.avgTimeToConvert} days` : "N/A"}
          icon={Clock}
          description="Lead to customer"
        />
        <StatCard
          title="Pipeline Value"
          value={stats.openLeads}
          icon={TrendingUp}
          description="Open opportunities"
        />
      </div>

      {/* Quick Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Leads are automatically created when users message you through the platform.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Drag and drop leads between stages on the Pipeline view to track progress.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Create tasks and follow-ups to stay on top of your leads.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Use the messaging feature in the lead detail to reply directly to enquiries.</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
  className?: string;
}

function StatCard({ title, value, icon: Icon, description, className }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${className || ''}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className={`p-3 rounded-full bg-muted ${className || ''}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
