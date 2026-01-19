import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Filter, 
  MapPin, 
  Star,
  MessageCircle,
  ChevronRight,
  X,
  Send,
  Globe,
  User,
  Plus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { createConversation } from "@/hooks/useMessages";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RegisterCoachDialog } from "@/components/registration/RegisterCoachDialog";

interface Coach {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  specialties: string[];
  is_online: boolean;
  avatar_url: string | null;
  hourly_rate: number | null;
  location: string | null;
}

interface CoachRequest {
  id: string;
  coach_id: string;
  status: string;
  coach?: Coach;
}

const specialtyFilters = ["Strength", "Endurance", "Rehab", "Nutrition", "Flexibility"];

// Mock coaches for demo
const mockCoaches: Coach[] = [
  {
    id: "1",
    user_id: "u1",
    display_name: "Sarah Johnson",
    bio: "Certified strength & conditioning coach with 10+ years experience. Specializing in powerlifting and athletic performance.",
    specialties: ["Strength", "Powerlifting"],
    is_online: true,
    avatar_url: null,
    hourly_rate: 75,
    location: "Los Angeles, CA",
  },
  {
    id: "2",
    user_id: "u2",
    display_name: "Mike Chen",
    bio: "Former Olympic athlete turned coach. I help athletes reach their peak performance through science-based training.",
    specialties: ["Endurance", "Athletics"],
    is_online: true,
    avatar_url: null,
    hourly_rate: 100,
    location: null,
  },
  {
    id: "3",
    user_id: "u3",
    display_name: "Emma Williams",
    bio: "Physical therapist and movement specialist. Focus on injury prevention and rehabilitation through functional training.",
    specialties: ["Rehab", "Flexibility"],
    is_online: false,
    avatar_url: null,
    hourly_rate: 85,
    location: "New York, NY",
  },
];

export default function FindCoach() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState<Coach[]>(mockCoaches);
  const [myRequests, setMyRequests] = useState<CoachRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [activeView, setActiveView] = useState<"directory" | "my-coach">("directory");
  const [showRegisterCoachDialog, setShowRegisterCoachDialog] = useState(false);
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch real coaches
    const { data: coachesData } = await supabase.from("coaches").select("*");
    
    // Fetch user's coach requests
    const { data: requestsData } = await supabase
      .from("coach_requests")
      .select("*, coach:coaches(*)")
      .eq("user_id", user.id);

    if (coachesData && coachesData.length > 0) {
      setCoaches(coachesData);
    }
    
    setMyRequests(requestsData || []);
    setLoading(false);
  };

  const handleRequestCoach = async () => {
    if (!user || !selectedCoach) return;

    try {
      // Also create the coach_request for tracking
      const { error: requestError } = await supabase.from("coach_requests").insert({
        user_id: user.id,
        coach_id: selectedCoach.id,
        message: requestMessage,
        status: "pending",
      });

      if (requestError) {
        console.error("Coach request error:", requestError);
      }

      // Create conversation using the messaging system
      // Coach is automatically added as participant by database trigger
      const conversationId = await createConversation({
        contextType: 'coach',
        contextId: selectedCoach.id,
        subject: `Coaching request from ${user.email}`,
        initialMessage: requestMessage || `Hi ${selectedCoach.display_name}, I'm interested in your coaching services.`,
      });

      toast.success("Request sent! Redirecting to inbox...");
      setShowRequestForm(false);
      setSelectedCoach(null);
      setRequestMessage("");
      navigate(`/inbox?conversation=${conversationId}`);
    } catch (error: any) {
      console.error("Error sending request:", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      });
      toast.error(`Failed to send request: ${error?.message || 'Unknown error'}`);
    }
  };

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };

  const filteredCoaches = coaches.filter((coach) => {
    const matchesSearch =
      coach.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coach.bio?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilters =
      activeFilters.length === 0 ||
      activeFilters.some((f) =>
        coach.specialties.some((s) => s.toLowerCase().includes(f.toLowerCase()))
      );

    return matchesSearch && matchesFilters;
  });

  const acceptedRequest = myRequests.find((r) => r.status === "accepted");

  if (loading) {
    return (
      <div className="min-h-screen pt-safe px-4 pb-4 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
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
          Find a Coach
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-muted-foreground text-sm mt-1"
        >
          Connect with expert coaches
        </motion.p>
      </header>

      {/* View Toggle */}
      {acceptedRequest && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mt-4"
        >
          <button
            onClick={() => setActiveView("directory")}
            className={cn(
              "flex-1 py-2 rounded-full text-sm font-medium transition-colors",
              activeView === "directory"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            Find Coach
          </button>
          <button
            onClick={() => setActiveView("my-coach")}
            className={cn(
              "flex-1 py-2 rounded-full text-sm font-medium transition-colors",
              activeView === "my-coach"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            My Coach
          </button>
        </motion.div>
      )}

      {/* Directory View */}
      {activeView === "directory" && (
        <>
          {/* Register Button */}
          <Button 
            onClick={() => setShowRegisterCoachDialog(true)}
            className="w-full gap-2 mt-4"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            Register as a Coach
          </Button>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search coaches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-4 flex flex-wrap gap-2"
          >
            {specialtyFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => toggleFilter(filter)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  activeFilters.includes(filter)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                {filter}
              </button>
            ))}
          </motion.div>

          {/* Coach Cards */}
          <div className="mt-6 space-y-3">
            {filteredCoaches.map((coach, idx) => (
              <motion.button
                key={coach.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.05 }}
                onClick={() => setSelectedCoach(coach)}
                className="w-full bg-card rounded-xl p-4 shadow-card border border-border/50 text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {coach.avatar_url ? (
                      <img
                        src={coach.avatar_url}
                        alt={coach.display_name}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{coach.display_name}</h3>
                      {coach.is_online && (
                        <span className="flex items-center gap-1 text-xs text-accent-foreground">
                          <Globe className="h-3 w-3" /> Online
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {coach.specialties.slice(0, 3).map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 bg-muted rounded-full text-xs"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                    {coach.location && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {coach.location}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
              </motion.button>
            ))}

            {filteredCoaches.length === 0 && (
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 text-center">
                <p className="text-muted-foreground">No coaches found</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* My Coach View */}
      {activeView === "my-coach" && acceptedRequest && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6"
        >
          {/* Coach Info */}
          <div className="gradient-card-accent rounded-xl p-5 shadow-card border border-border/50 mb-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {acceptedRequest.coach?.display_name || "Your Coach"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {acceptedRequest.coach?.specialties?.join(", ")}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-left">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium">Message</p>
              <p className="text-xs text-muted-foreground">Chat with coach</p>
            </button>
            <button className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-left">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <Star className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium">Check-in</p>
              <p className="text-xs text-muted-foreground">Weekly update</p>
            </button>
          </div>

          {/* Placeholder sections */}
          <div className="mt-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Your Plan
            </p>
            <div className="bg-card rounded-xl p-4 shadow-card border border-border/50">
              <p className="text-muted-foreground text-sm text-center py-4">
                Training plans will appear here
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Coach Detail Sheet */}
      <AnimatePresence>
        {selectedCoach && !showRequestForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[69]"
              onClick={() => setSelectedCoach(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[70] shadow-elevated max-h-[85vh] overflow-hidden flex flex-col"
            >
              <div className="p-4 pb-0 relative flex-shrink-0">
                <button
                  onClick={() => setSelectedCoach(null)}
                  className="absolute right-4 top-4 p-2 rounded-full bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-6 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{selectedCoach.display_name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedCoach.is_online && (
                        <span className="flex items-center gap-1 text-xs text-accent-foreground">
                          <Globe className="h-3 w-3" /> Available Online
                        </span>
                      )}
                      {selectedCoach.location && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {selectedCoach.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedCoach.specialties.map((s) => (
                    <span key={s} className="px-3 py-1 bg-muted rounded-full text-sm">
                      {s}
                    </span>
                  ))}
                </div>

                {selectedCoach.bio && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-2">About</h3>
                    <p className="text-sm text-muted-foreground">{selectedCoach.bio}</p>
                  </div>
                )}

                {selectedCoach.hourly_rate && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-2">Pricing</h3>
                    <p className="text-2xl font-semibold">${selectedCoach.hourly_rate}/hr</p>
                  </div>
                )}

                <Button onClick={() => setShowRequestForm(true)} className="w-full">
                  Request Coaching
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Request Form Sheet */}
      <AnimatePresence>
        {showRequestForm && selectedCoach && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[69]"
              onClick={() => setShowRequestForm(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[70] shadow-elevated max-h-[85vh] overflow-hidden flex flex-col"
            >
              <div className="p-4 pb-0 relative flex-shrink-0">
                <button
                  onClick={() => setShowRequestForm(false)}
                  className="absolute right-4 top-4 p-2 rounded-full bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
                <h2 className="text-lg font-semibold">Request Coaching</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Send a message to {selectedCoach.display_name}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-6 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
                <Textarea
                  placeholder="Tell the coach about your goals and what you're looking for..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  rows={5}
                  className="resize-none mb-4"
                />

                <Button onClick={handleRequestCoach} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Send Request
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
