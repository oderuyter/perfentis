import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Search, 
  MapPin, 
  Users, 
  Calendar,
  Clock,
  Filter,
  Loader2,
  ChevronRight,
  Plus,
  Footprints
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRunClubFinder, useUserRunClubs, RunClub } from "@/hooks/useRunClubs";
import { useAuth } from "@/hooks/useAuth";
import { RunClubDetailSheet } from "@/components/run-clubs/RunClubDetailSheet";
import { RegisterRunClubDialog } from "@/components/registration/RegisterRunClubDialog";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function RunClubs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clubs, isLoading } = useRunClubFinder();
  const { memberships, applications, isLoading: userLoading } = useUserRunClubs();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [styleFilter, setStyleFilter] = useState<string>("all");
  const [membershipFilter, setMembershipFilter] = useState<string>("all");
  const [selectedClub, setSelectedClub] = useState<RunClub | null>(null);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("browse");

  // Filter clubs
  const filteredClubs = useMemo(() => {
    return clubs.filter(club => {
      // Search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const matchesName = club.name.toLowerCase().includes(search);
        const matchesCity = club.primary_city?.toLowerCase().includes(search);
        const matchesPostcode = club.primary_postcode?.toLowerCase().includes(search);
        if (!matchesName && !matchesCity && !matchesPostcode) return false;
      }

      // Style filter
      if (styleFilter !== "all" && club.club_style !== styleFilter) return false;

      // Membership filter
      if (membershipFilter !== "all" && club.membership_type !== membershipFilter) return false;

      return true;
    });
  }, [clubs, searchQuery, styleFilter, membershipFilter]);

  const ClubCard = ({ club }: { club: RunClub }) => {
    const userMembership = memberships.find(m => m.run_club.id === club.id);
    const userApplication = applications.find(a => a.run_club_id === club.id);

    return (
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setSelectedClub(club)}
        className="w-full bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 transition-all"
      >
        <div className="flex gap-4">
          {/* Club Logo */}
          <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
            {club.logo_url ? (
              <img src={club.logo_url} alt={club.name} className="h-full w-full object-cover" />
            ) : (
              <Footprints className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          {/* Club Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold truncate">{club.name}</h3>
              {userMembership && (
                <Badge variant="secondary" className="flex-shrink-0">Member</Badge>
              )}
              {userApplication?.status === "pending" && (
                <Badge variant="outline" className="flex-shrink-0">Pending</Badge>
              )}
            </div>

            {club.primary_city && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3.5 w-3.5" />
                <span>{club.primary_city}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-2">
              {club.club_style && (
                <Badge variant="outline" className="text-xs capitalize">
                  {club.club_style}
                </Badge>
              )}
              {club.membership_type === "free" ? (
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                  Free
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  £{club.membership_fee}/{club.membership_fee_cadence}
                </Badge>
              )}
              {club.days_of_week.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {club.days_of_week.map(d => DAYS[d]).join(", ")}
                </Badge>
              )}
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 self-center" />
        </div>
      </motion.button>
    );
  };

  const MyClubCard = ({ membership }: { membership: typeof memberships[0] }) => {
    const club = membership.run_club;

    return (
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setSelectedClub(club)}
        className="w-full bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 transition-all"
      >
        <div className="flex gap-4 items-center">
          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
            {club.logo_url ? (
              <img src={club.logo_url} alt={club.name} className="h-full w-full object-cover" />
            ) : (
              <Footprints className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{club.name}</h3>
            <p className="text-sm text-muted-foreground">
              Member since {new Date(membership.joined_at).toLocaleDateString()}
            </p>
          </div>

          <Badge variant="secondary">Member</Badge>
        </div>
      </motion.button>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Run Clubs</h1>
          <Button 
            size="sm" 
            onClick={() => setShowRegisterDialog(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Start a Club
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="browse" className="flex-1">Find Clubs</TabsTrigger>
            <TabsTrigger value="my-clubs" className="flex-1">My Clubs</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="mt-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, city, or postcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={styleFilter} onValueChange={setStyleFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Styles</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="competitive">Competitive</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={membershipFilter} onValueChange={setMembershipFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Membership" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results */}
            <div className="space-y-3">
              {filteredClubs.length === 0 ? (
                <div className="text-center py-12">
                  <Footprints className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No clubs found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery 
                      ? "Try adjusting your search or filters"
                      : "Be the first to start a run club in your area!"}
                  </p>
                </div>
              ) : (
                filteredClubs.map(club => (
                  <ClubCard key={club.id} club={club} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="my-clubs" className="mt-4 space-y-4">
            {userLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : memberships.length === 0 && applications.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No memberships yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Join a run club to connect with other runners
                </p>
                <Button onClick={() => setActiveTab("browse")}>
                  Find Clubs
                </Button>
              </div>
            ) : (
              <>
                {/* Pending Applications */}
                {applications.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Pending Applications</h3>
                    {applications.map(app => (
                      <div 
                        key={app.id}
                        className="bg-card border border-border rounded-xl p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{(app as any).run_club?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Applied {new Date(app.applied_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline">Pending</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Active Memberships */}
                {memberships.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Active Memberships</h3>
                    {memberships.map(membership => (
                      <MyClubCard key={membership.id} membership={membership} />
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Club Detail Sheet */}
      <RunClubDetailSheet
        club={selectedClub}
        isOpen={!!selectedClub}
        onClose={() => setSelectedClub(null)}
      />

      {/* Register Dialog */}
      <RegisterRunClubDialog
        isOpen={showRegisterDialog}
        onClose={() => setShowRegisterDialog(false)}
      />
    </div>
  );
}
