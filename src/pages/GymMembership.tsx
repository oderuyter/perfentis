import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  QrCode, 
  CreditCard, 
  Building2, 
  Calendar,
  X,
  Users,
  ScanLine,
  Plus,
  Settings,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  MapPin,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { GymDetailSheet } from "@/components/gym/GymDetailSheet";
import { MembershipDetailSheet } from "@/components/gym/MembershipDetailSheet";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { 
  useUserMemberships, 
  useOwnedGyms, 
  useGymMembers,
  useMembershipCheckins 
} from "@/hooks/useGymManagement";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type GymDirectory = {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  logo_url: string | null;
  status: string;
};

export default function GymMembership() {
  const { user } = useAuth();
  const { roles, isGymManager, isGymStaff, isAdmin } = useRoles();
  const { memberships, isLoading: membershipsLoading, cancelMembership, refetch: refetchMemberships } = useUserMemberships();
  const { gyms: ownedGyms, isLoading: gymsLoading, createGym } = useOwnedGyms();
  
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const { members, isLoading: membersLoading, updateMemberStatus } = useGymMembers(selectedGymId);
  
  const [showQR, setShowQR] = useState<{ token: string; number: string | null } | null>(null);
  const [showCreateGym, setShowCreateGym] = useState(false);
  const [newGymName, setNewGymName] = useState("");
  const [newGymAddress, setNewGymAddress] = useState("");
  const [creating, setCreating] = useState(false);
  
  // Gym directory state
  const [gymDirectory, setGymDirectory] = useState<GymDirectory[]>([]);
  const [gymSearchQuery, setGymSearchQuery] = useState("");
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [selectedDirectoryGymId, setSelectedDirectoryGymId] = useState<string | null>(null);
  
  // Membership management state
  const [selectedMembership, setSelectedMembership] = useState<typeof memberships[0] | null>(null);
  const [pastMembershipsOpen, setPastMembershipsOpen] = useState(false);

  const activeMembership = memberships.find((m) => m.status === "active");
  const activeMemberships = memberships.filter((m) => m.status === "active");
  const inactiveMemberships = memberships.filter((m) => m.status !== "active");
  const { checkins } = useMembershipCheckins(activeMembership?.id || null);
  
  // Fetch gym directory
  useEffect(() => {
    const fetchGymDirectory = async () => {
      setLoadingDirectory(true);
      const { data, error } = await supabase
        .from("gyms")
        .select("id, name, address, description, logo_url, status")
        .eq("status", "active")
        .order("name");
      
      if (!error && data) {
        setGymDirectory(data);
      }
      setLoadingDirectory(false);
    };
    
    fetchGymDirectory();
  }, []);
  
  // Filter gym directory by search
  const filteredGyms = gymDirectory.filter(gym => 
    gym.name.toLowerCase().includes(gymSearchQuery.toLowerCase()) ||
    (gym.address?.toLowerCase().includes(gymSearchQuery.toLowerCase()))
  );

  // Set first owned gym as selected
  useEffect(() => {
    if (ownedGyms.length > 0 && !selectedGymId) {
      setSelectedGymId(ownedGyms[0].id);
    }
  }, [ownedGyms, selectedGymId]);

  // Determine if user has management access
  const hasManagementAccess = ownedGyms.length > 0 || 
    roles.some(r => r.role === 'gym_manager' || r.role === 'gym_staff' || r.role === 'admin');

  // Generate QR code as SVG
  const generateQRCode = (token: string) => {
    const size = 200;
    const cells = 21;
    const cellSize = size / cells;
    
    const pattern: boolean[][] = [];
    for (let i = 0; i < cells; i++) {
      pattern[i] = [];
      for (let j = 0; j < cells; j++) {
        const hash = (token.charCodeAt((i * cells + j) % token.length) + i * j) % 3;
        pattern[i][j] = hash === 0 || hash === 1;
      }
    }

    const addFinderPattern = (startX: number, startY: number) => {
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
            pattern[startY + i][startX + j] = true;
          } else {
            pattern[startY + i][startX + j] = false;
          }
        }
      }
    };

    addFinderPattern(0, 0);
    addFinderPattern(cells - 7, 0);
    addFinderPattern(0, cells - 7);

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} fill="white" />
        {pattern.map((row, i) =>
          row.map((cell, j) =>
            cell ? (
              <rect
                key={`${i}-${j}`}
                x={j * cellSize}
                y={i * cellSize}
                width={cellSize}
                height={cellSize}
                fill="black"
              />
            ) : null
          )
        )}
      </svg>
    );
  };

  const handleCreateGym = async () => {
    if (!newGymName.trim()) {
      toast.error("Please enter a gym name");
      return;
    }
    setCreating(true);
    await createGym({ 
      name: newGymName.trim(), 
      address: newGymAddress.trim() || undefined 
    });
    setNewGymName("");
    setNewGymAddress("");
    setShowCreateGym(false);
    setCreating(false);
  };

  if (membershipsLoading || gymsLoading) {
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
        <TabsList className={cn("grid w-full", hasManagementAccess ? "grid-cols-3" : "grid-cols-2")}>
          <TabsTrigger value="membership">My Membership</TabsTrigger>
          <TabsTrigger value="directory">Find a Gym</TabsTrigger>
          {hasManagementAccess && (
            <TabsTrigger value="manage">Manage</TabsTrigger>
          )}
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
                          token: membership.membership_token, 
                          number: membership.membership_number 
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
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={gymSearchQuery}
              onChange={(e) => setGymSearchQuery(e.target.value)}
              placeholder="Search gyms by name or location..."
              className="pl-10"
            />
          </div>
          
          {loadingDirectory ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredGyms.length > 0 ? (
            <div className="space-y-3">
              {filteredGyms.map((gym) => (
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
                    </div>
                    <button className="flex-shrink-0 p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="font-semibold mb-2">
                {gymSearchQuery ? "No Gyms Found" : "No Gyms Available"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {gymSearchQuery 
                  ? "Try adjusting your search terms"
                  : "Check back later for available gyms in your area"
                }
              </p>
            </div>
          )}
        </TabsContent>

        {/* Gym Management Tab */}
        {hasManagementAccess && (
        <TabsContent value="manage" className="mt-4 space-y-4">
          {/* Create Gym Button */}
          {!showCreateGym && (
            <button
              onClick={() => setShowCreateGym(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create New Gym
            </button>
          )}

          {/* Create Gym Form */}
          <AnimatePresence>
            {showCreateGym && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-card rounded-xl p-4 border border-border/50 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Create New Gym</h3>
                  <button onClick={() => setShowCreateGym(false)}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="gymName">Gym Name *</Label>
                    <Input
                      id="gymName"
                      value={newGymName}
                      onChange={(e) => setNewGymName(e.target.value)}
                      placeholder="e.g., Iron Paradise Gym"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gymAddress">Address</Label>
                    <Input
                      id="gymAddress"
                      value={newGymAddress}
                      onChange={(e) => setNewGymAddress(e.target.value)}
                      placeholder="e.g., 123 Main St, City"
                    />
                  </div>
                  <button
                    onClick={handleCreateGym}
                    disabled={creating}
                    className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
                  >
                    {creating ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Create Gym"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Gym Selector */}
          {ownedGyms.length > 0 && (
            <div className="space-y-4">
              {ownedGyms.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {ownedGyms.map((gym) => (
                    <button
                      key={gym.id}
                      onClick={() => setSelectedGymId(gym.id)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                        selectedGymId === gym.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      {gym.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Gym Management */}
              {selectedGymId && (
                <div className="space-y-4">
                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <button className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-left">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                        <ScanLine className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="font-medium">Scan QR</p>
                      <p className="text-xs text-muted-foreground">Check in member</p>
                    </button>
                    <button className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-left">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                        <Settings className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="font-medium">Settings</p>
                      <p className="text-xs text-muted-foreground">Gym profile</p>
                    </button>
                  </div>

                  {/* Members List */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Members ({members.length})
                      </p>
                      <button className="text-xs text-primary font-medium">
                        Add Member
                      </button>
                    </div>
                    
                    {membersLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : members.length > 0 ? (
                      <div className="space-y-2">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between bg-card rounded-xl p-4 shadow-card border border-border/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                <Users className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-mono text-sm font-medium">
                                  {member.membership_number || "—"}
                                </p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {member.tier || "Standard"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-xs font-medium",
                                  member.status === "active"
                                    ? "bg-primary/20 text-accent-foreground"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {member.status}
                              </span>
                              {member.status === "active" ? (
                                <button
                                  onClick={() => updateMemberStatus(member.id, "suspended")}
                                  className="p-1 text-muted-foreground hover:text-foreground"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => updateMemberStatus(member.id, "active")}
                                  className="p-1 text-muted-foreground hover:text-foreground"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-card rounded-xl p-6 border border-border/50 text-center">
                        <p className="text-sm text-muted-foreground">No members yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {ownedGyms.length === 0 && !showCreateGym && (
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="font-semibold mb-2">No Gyms Yet</h2>
              <p className="text-sm text-muted-foreground">
                Create a gym to start managing memberships
              </p>
            </div>
          )}
        </TabsContent>
        )}
      </Tabs>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQR && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-[69]"
              onClick={() => setShowQR(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-4 m-auto w-[90%] max-w-sm h-fit bg-card rounded-2xl z-[70] shadow-elevated p-6"
            >
              <button
                onClick={() => setShowQR(null)}
                className="absolute right-4 top-4 p-2 rounded-full bg-muted"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 className="text-lg font-semibold text-center mb-2">Check-in QR Code</h2>
              {showQR.number && (
                <p className="text-center font-mono text-sm text-muted-foreground mb-4">
                  {showQR.number}
                </p>
              )}
              
              <div className="flex justify-center mb-4 bg-white p-4 rounded-xl">
                {generateQRCode(showQR.token)}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Show this to staff to check in
              </p>
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
      <MembershipDetailSheet
        membership={selectedMembership}
        open={!!selectedMembership}
        onOpenChange={(open) => !open && setSelectedMembership(null)}
        onMembershipUpdated={refetchMemberships}
      />
    </div>
  );
}
