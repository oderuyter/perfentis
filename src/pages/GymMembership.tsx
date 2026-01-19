import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  QrCode, 
  CreditCard, 
  Building2, 
  X,
  Clock,
  Loader2,
  Search,
  MapPin,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Filter,
  Check,
  Plus
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { GymDetailSheet } from "@/components/gym/GymDetailSheet";
import { MembershipDetailSheet } from "@/components/gym/MembershipDetailSheet";
import { RegisterGymDialog } from "@/components/registration/RegisterGymDialog";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  useUserMemberships, 
  useMembershipCheckins 
} from "@/hooks/useGymManagement";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type GymDirectory = {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  logo_url: string | null;
  status: string;
  facilities?: Record<string, boolean> | null;
};

const FACILITY_LABELS: Record<string, string> = {
  weight_machines: "Weight Machines",
  free_weights: "Free Weights",
  cardio_area: "Cardio Area",
  swimming_pool: "Swimming Pool",
  sauna: "Sauna",
  steam_room: "Steam Room",
  yoga_studio: "Yoga Studio",
  spin_studio: "Spin Studio",
  group_exercise_studio: "Group Classes",
  personal_training: "Personal Training",
  parking: "Parking",
  showers: "Showers",
  lockers: "Lockers",
  towel_service: "Towel Service",
  wifi: "WiFi",
  cafe: "Café"
};

export default function GymMembership() {
  const { user } = useAuth();
  const { memberships, isLoading: membershipsLoading, refetch: refetchMemberships } = useUserMemberships();
  
  const [showQR, setShowQR] = useState<{ memberId: string } | null>(null);
  
  // Gym directory state
  const [gymDirectory, setGymDirectory] = useState<GymDirectory[]>([]);
  const [gymSearchQuery, setGymSearchQuery] = useState("");
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [selectedDirectoryGymId, setSelectedDirectoryGymId] = useState<string | null>(null);
  const [selectedFacilityFilters, setSelectedFacilityFilters] = useState<string[]>([]);
  
  // Membership management state
  const [selectedMembership, setSelectedMembership] = useState<typeof memberships[0] | null>(null);
  const [pastMembershipsOpen, setPastMembershipsOpen] = useState(false);
  const [showRegisterGymDialog, setShowRegisterGymDialog] = useState(false);

  const activeMembership = memberships.find((m) => m.status === "active");
  const activeMemberships = memberships.filter((m) => m.status === "active");
  const inactiveMemberships = memberships.filter((m) => m.status !== "active");
  const { checkins } = useMembershipCheckins(activeMembership?.id || null);
  
  // Fetch gym directory with facilities
  useEffect(() => {
    const fetchGymDirectory = async () => {
      setLoadingDirectory(true);
      
      // Fetch gyms
      const { data: gymsData, error: gymsError } = await supabase
        .from("gyms")
        .select("id, name, address, description, logo_url, status")
        .eq("status", "active")
        .order("name");
      
      if (gymsError || !gymsData) {
        setLoadingDirectory(false);
        return;
      }

      // Fetch facilities for all gyms
      const gymIds = gymsData.map(g => g.id);
      const { data: facilitiesData } = await supabase
        .from("gym_facilities")
        .select("*")
        .in("gym_id", gymIds);

      // Map facilities to gyms
      const facilitiesMap = new Map<string, Record<string, boolean>>();
      (facilitiesData || []).forEach(f => {
        const facilities: Record<string, boolean> = {};
        Object.keys(FACILITY_LABELS).forEach(key => {
          if (f[key]) facilities[key] = true;
        });
        facilitiesMap.set(f.gym_id, facilities);
      });

      const gymsWithFacilities = gymsData.map(gym => ({
        ...gym,
        facilities: facilitiesMap.get(gym.id) || null
      }));

      setGymDirectory(gymsWithFacilities);
      setLoadingDirectory(false);
    };
    
    fetchGymDirectory();
  }, []);
  
  // Filter gym directory by search and facilities
  const filteredGyms = gymDirectory.filter(gym => {
    const matchesSearch = gym.name.toLowerCase().includes(gymSearchQuery.toLowerCase()) ||
      (gym.address?.toLowerCase().includes(gymSearchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;
    
    // Filter by facilities
    if (selectedFacilityFilters.length > 0) {
      if (!gym.facilities) return false;
      return selectedFacilityFilters.every(filter => gym.facilities?.[filter]);
    }
    
    return true;
  });

  const toggleFacilityFilter = (facility: string) => {
    setSelectedFacilityFilters(prev => 
      prev.includes(facility) 
        ? prev.filter(f => f !== facility)
        : [...prev, facility]
    );
  };

  // QR Code is now rendered using qrcode.react library directly in JSX
  const getActiveFacilities = (facilities: Record<string, boolean> | null | undefined) => {
    if (!facilities) return [];
    return Object.entries(facilities)
      .filter(([_, value]) => value)
      .map(([key]) => key);
  };

  if (membershipsLoading) {
    return (
      <div className="min-h-screen pt-safe px-4 pb-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-safe px-4 pb-24">
      {/* Header */}
      <header className="pt-6 pb-4">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight"
        >
          Gym Membership
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-muted-foreground text-sm mt-1"
        >
          Manage your gym access and memberships
        </motion.p>
      </header>

      {/* Tabs for User/Admin view */}
      <Tabs defaultValue="membership" className="mt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="membership">My Membership</TabsTrigger>
          <TabsTrigger value="directory">Find a Gym</TabsTrigger>
        </TabsList>

        {/* User Membership Tab */}
        <TabsContent value="membership" className="mt-4 space-y-4">
          {/* Active Memberships */}
          {activeMemberships.length > 0 ? (
            <div className="space-y-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Active Memberships
              </p>
              {activeMemberships.map((membership) => (
                <motion.div
                  key={membership.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div 
                    onClick={() => setSelectedMembership(membership)}
                    className="gradient-card-accent rounded-xl p-5 shadow-card border border-border/50 cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-accent-foreground mb-2">
                          ACTIVE
                        </span>
                        <h2 className="text-xl font-semibold">
                          {membership.gym?.name || "Unknown Gym"}
                        </h2>
                        {membership.gym?.address && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {membership.gym.address}
                          </p>
                        )}
                      </div>
                      <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-accent-foreground" />
                      </div>
                    </div>

                    {/* Membership Details */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Member #</p>
                        <p className="font-mono text-sm font-medium">
                          {membership.membership_number || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Tier</p>
                        <p className="font-medium capitalize">{membership.tier || "Standard"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Start Date</p>
                        <p className="font-medium">
                          {membership.start_date
                            ? format(new Date(membership.start_date), "MMM d, yyyy")
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Next Payment</p>
                        <p className="font-medium">
                          {membership.next_payment_date
                            ? format(new Date(membership.next_payment_date), "MMM d, yyyy")
                            : "One-time"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowQR({ 
                          memberId: membership.membership_number || membership.id
                        });
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-medium"
                    >
                      <QrCode className="h-5 w-5" />
                      Show QR Code
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl p-6 shadow-card border border-border/50 text-center"
            >
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="font-semibold mb-2">No Active Memberships</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Join a gym to get started with your fitness journey
              </p>
            </motion.div>
          )}

          {/* Recent Check-ins (for first active membership) */}
          {activeMembership && checkins.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Recent Check-ins
              </p>
              <div className="space-y-2">
                {checkins.slice(0, 5).map((checkin) => (
                  <div
                    key={checkin.id}
                    className="flex items-center gap-3 bg-card rounded-lg p-3 border border-border/50"
                  >
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(checkin.checked_in_at), "EEE, MMM d 'at' h:mm a")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past & Inactive Memberships - Collapsible */}
          {inactiveMemberships.length > 0 && (
            <Collapsible open={pastMembershipsOpen} onOpenChange={setPastMembershipsOpen} className="mt-6">
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Past Memberships ({inactiveMemberships.length})
                </p>
                {pastMembershipsOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {inactiveMemberships.map((membership) => {
                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case "cancelled": return "bg-red-500/20 text-red-700 dark:text-red-400";
                      case "pending": return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
                      case "inquiry": return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
                      case "suspended": return "bg-orange-500/20 text-orange-700 dark:text-orange-400";
                      default: return "bg-muted text-muted-foreground";
                    }
                  };
                  
                  return (
                    <div
                      key={membership.id}
                      onClick={() => setSelectedMembership(membership)}
                      className="bg-card rounded-xl p-4 shadow-card border border-border/50 cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{membership.gym?.name || "Unknown Gym"}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium uppercase ${getStatusColor(membership.status)}`}>
                              {membership.status}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {membership.tier || "Standard"}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          )}
        </TabsContent>

        {/* Gym Directory Tab */}
        <TabsContent value="directory" className="mt-4 space-y-4">
          {/* Register Button */}
          <Button 
            onClick={() => setShowRegisterGymDialog(true)}
            className="w-full gap-2"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            Register a Gym
          </Button>

          {/* Search and Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={gymSearchQuery}
                onChange={(e) => setGymSearchQuery(e.target.value)}
                placeholder="Search gyms by name or location..."
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-muted transition-colors ${selectedFacilityFilters.length > 0 ? 'border-primary bg-primary/10' : 'border-border'}`}>
                  <Filter className="h-4 w-4" />
                  {selectedFacilityFilters.length > 0 && (
                    <span className="text-xs font-medium">{selectedFacilityFilters.length}</span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
                {Object.entries(FACILITY_LABELS).map(([key, label]) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={selectedFacilityFilters.includes(key)}
                    onCheckedChange={() => toggleFacilityFilter(key)}
                  >
                    {label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Active Filters */}
          {selectedFacilityFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedFacilityFilters.map(filter => (
                <button
                  key={filter}
                  onClick={() => toggleFacilityFilter(filter)}
                  className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full hover:bg-primary/20"
                >
                  {FACILITY_LABELS[filter]}
                  <X className="h-3 w-3" />
                </button>
              ))}
              <button
                onClick={() => setSelectedFacilityFilters([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
            </div>
          )}
          
          {loadingDirectory ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredGyms.length > 0 ? (
            <div className="space-y-3">
              {filteredGyms.map((gym) => {
                const activeFacilities = getActiveFacilities(gym.facilities);
                return (
                  <motion.div
                    key={gym.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedDirectoryGymId(gym.id)}
                    className="bg-card rounded-xl p-4 shadow-card border border-border/50 cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        {gym.logo_url ? (
                          <img src={gym.logo_url} alt={gym.name} className="h-full w-full object-cover rounded-lg" />
                        ) : (
                          <Building2 className="h-7 w-7 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{gym.name}</h3>
                        {gym.address && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{gym.address}</span>
                          </p>
                        )}
                        {gym.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{gym.description}</p>
                        )}
                        
                        {/* Facilities Preview */}
                        {activeFacilities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {activeFacilities.slice(0, 4).map(facility => (
                              <span 
                                key={facility} 
                                className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[10px] rounded flex items-center gap-0.5"
                              >
                                <Check className="h-2.5 w-2.5" />
                                {FACILITY_LABELS[facility]}
                              </span>
                            ))}
                            {activeFacilities.length > 4 && (
                              <span className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[10px] rounded">
                                +{activeFacilities.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <button className="flex-shrink-0 p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="font-semibold mb-2">
                {gymSearchQuery || selectedFacilityFilters.length > 0 ? "No Gyms Found" : "No Gyms Available"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {gymSearchQuery || selectedFacilityFilters.length > 0
                  ? "Try adjusting your search or filters"
                  : "Check back later for available gyms in your area"
                }
              </p>
            </div>
          )}
        </TabsContent>

      </Tabs>

      {/* QR Code Modal - slides down from top */}
      <AnimatePresence>
        {showQR && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-[100]"
              onClick={() => setShowQR(null)}
            />
            <motion.div
              initial={{ y: "-100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-0 top-0 bg-card rounded-b-3xl p-6 pt-safe z-[100] shadow-2xl"
            >
              <div className="max-w-sm mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Your QR Code</h3>
                    <p className="text-sm text-muted-foreground">
                      Scan this at check-in
                    </p>
                  </div>
                  <button
                    onClick={() => setShowQR(null)}
                    className="p-2 hover:bg-muted rounded-full"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="bg-white p-6 rounded-2xl shadow-lg mb-4">
                    {/* Use membership_number (Member ID) for scanning */}
                    <QRCodeSVG 
                      value={showQR.memberId} 
                      size={200}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  
                  <p className="font-mono text-xl font-bold">{showQR.memberId}</p>
                </div>
                
                {/* Pull indicator */}
                <div className="flex justify-center mt-4">
                  <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Gym Detail Sheet */}
      <GymDetailSheet
        gymId={selectedDirectoryGymId}
        open={!!selectedDirectoryGymId}
        onOpenChange={(open) => !open && setSelectedDirectoryGymId(null)}
      />

      {/* Membership Detail Sheet */}
      {selectedMembership && (
        <MembershipDetailSheet
          membership={selectedMembership}
          open={!!selectedMembership}
          onOpenChange={(open) => !open && setSelectedMembership(null)}
          onMembershipUpdated={() => {
            refetchMemberships();
          }}
        />
      )}

      {/* Register Gym Dialog */}
      <RegisterGymDialog
        open={showRegisterGymDialog}
        onOpenChange={setShowRegisterGymDialog}
      />
    </div>
  );
}
