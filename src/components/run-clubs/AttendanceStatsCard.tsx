import { 
  Users, 
  Flame, 
  Trophy, 
  TrendingUp,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ClubAttendanceStats, MemberAttendanceStats } from "@/hooks/useRunClubAttendance";

interface AttendanceStatsCardProps {
  stats: ClubAttendanceStats | null;
  isLoading?: boolean;
}

export function AttendanceStatsCard({ stats, isLoading }: AttendanceStatsCardProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-12 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_instances}</p>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_check_ins}</p>
                <p className="text-sm text-muted-foreground">Total Check-ins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.average_attendance}</p>
                <p className="text-sm text-muted-foreground">Avg per Session</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold truncate max-w-[120px]">
                  {stats.most_popular_run?.title || "—"}
                </p>
                <p className="text-sm text-muted-foreground">Most Popular Run</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Attendees */}
      {stats.top_attendees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flame className="h-5 w-5 text-orange-500" />
              Top Attendees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.top_attendees.map((attendee, index) => (
                <TopAttendeeRow key={attendee.user_id} attendee={attendee} rank={index + 1} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface TopAttendeeRowProps {
  attendee: MemberAttendanceStats;
  rank: number;
}

function TopAttendeeRow({ attendee, rank }: TopAttendeeRowProps) {
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">🥇</Badge>;
      case 2:
        return <Badge className="bg-gray-400/20 text-gray-600 border-gray-400/30">🥈</Badge>;
      case 3:
        return <Badge className="bg-orange-600/20 text-orange-600 border-orange-600/30">🥉</Badge>;
      default:
        return <Badge variant="outline">#{rank}</Badge>;
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="w-10 flex justify-center">
        {getRankBadge(rank)}
      </div>
      <Avatar className="h-10 w-10">
        <AvatarImage src={attendee.avatar_url || undefined} />
        <AvatarFallback>
          {attendee.display_name?.charAt(0) || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {attendee.display_name || "Unknown"}
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{attendee.total_attended} sessions</span>
          {attendee.attendance_rate > 0 && (
            <>
              <span>•</span>
              <span>{attendee.attendance_rate}% rate</span>
            </>
          )}
        </div>
      </div>
      <div className="w-24">
        <Progress value={attendee.attendance_rate} className="h-2" />
      </div>
    </div>
  );
}
