import { format } from "date-fns";
import {
  Flame,
  Trophy,
  Calendar,
  CheckCircle2,
  MapPin,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { MemberAttendanceStats, AttendanceRecord } from "@/hooks/useRunClubAttendance";

interface MemberAttendanceHistoryProps {
  stats: MemberAttendanceStats | null;
  history: AttendanceRecord[];
  isLoading?: boolean;
}

export function MemberAttendanceHistory({ 
  stats, 
  history, 
  isLoading 
}: MemberAttendanceHistoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-24 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No attendance data yet</h3>
          <p className="text-sm text-muted-foreground">
            Attendance will appear here once you've been checked in to runs
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.total_attended}</p>
                <p className="text-xs text-muted-foreground">Total Runs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.current_streak}</p>
                <p className="text-xs text-muted-foreground">Current Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.longest_streak}</p>
                <p className="text-xs text-muted-foreground">Best Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.attendance_rate}%</p>
                <p className="text-xs text-muted-foreground">Attendance Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Streak Progress */}
      {stats.current_streak > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="font-medium">Streak Progress</span>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Flame className="h-3 w-3" />
                {stats.current_streak} weeks
              </Badge>
            </div>
            <Progress 
              value={Math.min((stats.current_streak / 12) * 100, 100)} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {stats.current_streak >= 12 
                ? "Amazing! You've hit a 12-week streak! 🎉"
                : `${12 - stats.current_streak} more weeks to hit a 12-week streak!`
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Attendance History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Recent Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No attendance records yet
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {history.map((record) => (
                  <AttendanceHistoryRow key={record.id} record={record} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface AttendanceHistoryRowProps {
  record: AttendanceRecord;
}

function AttendanceHistoryRow({ record }: AttendanceHistoryRowProps) {
  const date = record.instance?.scheduled_date 
    ? new Date(record.instance.scheduled_date)
    : new Date(record.recorded_at);

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {record.run?.title || "Run Session"}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(date, "MMM d, yyyy")}
          </span>
          {record.run?.start_time && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {record.run.start_time.slice(0, 5)}
            </span>
          )}
          {record.run?.meeting_point && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {record.run.meeting_point}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact version for member profile display
interface MemberAttendanceCardProps {
  stats: MemberAttendanceStats;
}

export function MemberAttendanceCard({ stats }: MemberAttendanceCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={stats.avatar_url || undefined} />
            <AvatarFallback>
              {stats.display_name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {stats.display_name || "Unknown"}
            </p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{stats.total_attended} runs</span>
              {stats.current_streak > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Flame className="h-3 w-3" />
                  {stats.current_streak}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{stats.attendance_rate}%</p>
            <p className="text-xs text-muted-foreground">rate</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
