import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreHorizontal,
  Eye,
  Ban,
  CheckCircle,
  Footprints,
  Users,
  Calendar,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface RunClub {
  id: string;
  name: string;
  status: "draft" | "published" | "suspended";
  primary_city: string | null;
  membership_type: "free" | "paid";
  club_style: string | null;
  owner_user_id: string;
  created_at: string;
  _count?: {
    members: number;
    runs: number;
  };
}

export default function AdminRunClubs() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ["admin-run-clubs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("run_clubs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as RunClub[];
    },
  });

  const { data: memberCounts = {} } = useQuery({
    queryKey: ["admin-run-club-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("run_club_members")
        .select("run_club_id")
        .eq("status", "active");

      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const member of data || []) {
        counts[member.run_club_id] = (counts[member.run_club_id] || 0) + 1;
      }
      return counts;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      clubId,
      status,
    }: {
      clubId: string;
      status: "published" | "suspended" | "draft";
    }) => {
      const { error } = await supabase
        .from("run_clubs")
        .update({ status })
        .eq("id", clubId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-run-clubs"] });
      toast.success("Club status updated");
    },
    onError: (error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });

  const filteredClubs = clubs.filter(
    (club) =>
      club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      club.primary_city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400">Published</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const getMembershipBadge = (type: string) => {
    return type === "paid" ? (
      <Badge variant="outline" className="text-primary">Paid</Badge>
    ) : (
      <Badge variant="outline">Free</Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Run Clubs</h1>
          <p className="text-muted-foreground">
            Manage and moderate run clubs on the platform
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Clubs</CardTitle>
            <Footprints className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clubs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clubs.filter((c) => c.status === "published").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(memberCounts).reduce((a, b) => a + b, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <Ban className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clubs.filter((c) => c.status === "suspended").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clubs by name or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredClubs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No clubs match your search" : "No run clubs yet"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Club</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClubs.map((club) => (
                  <TableRow key={club.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Footprints className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{club.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {club.club_style || "Mixed"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{club.primary_city || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getMembershipBadge(club.membership_type)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span>{memberCounts[club.id] || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(club.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem
                            onClick={() => navigate(`/run-club-portal/dashboard?club=${club.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Portal
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigate(`/run-clubs?club=${club.id}`)}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Public Profile
                          </DropdownMenuItem>
                          {club.status === "suspended" ? (
                            <DropdownMenuItem
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  clubId: club.id,
                                  status: "published",
                                })
                              }
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Reinstate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  clubId: club.id,
                                  status: "suspended",
                                })
                              }
                              className="text-destructive"
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Suspend
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
