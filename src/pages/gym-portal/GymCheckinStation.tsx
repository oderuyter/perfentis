import { useState, useEffect, useCallback, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Scanner } from "@yudiel/react-qr-scanner";
import { format, subMinutes, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Camera, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft,
  Loader2
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GymContext {
  selectedGymId: string | null;
  selectedGym: { id: string; name: string } | null;
}

interface CheckedInMember {
  id: string;
  membership_number: string;
  display_name: string;
  avatar_url: string | null;
  checked_in_at: Date;
  last_checkin: Date | null;
}

interface ActiveMember {
  id: string;
  membership_number: string;
  display_name: string;
  avatar_url: string | null;
  checked_in_at: Date;
}

// Audio context for sounds
const playSuccessSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Pleasant success sound - two ascending tones
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
  } catch (e) {
    console.log("Audio not supported");
  }
};

const playErrorSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Subtle error tone - single low beep
    oscillator.frequency.setValueAtTime(220, audioContext.currentTime); // A3
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.log("Audio not supported");
  }
};

export default function GymCheckinStation() {
  const { selectedGymId, selectedGym } = useOutletContext<GymContext>();
  const navigate = useNavigate();
  
  const [cameraPermission, setCameraPermission] = useState<"pending" | "granted" | "denied">("pending");
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkedInMember, setCheckedInMember] = useState<CheckedInMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clearTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Stats
  const [todayCount, setTodayCount] = useState(0);
  const [last60MinCount, setLast60MinCount] = useState(0);
  const [last30MinCount, setLast30MinCount] = useState(0);
  
  // Who's in the gym
  const [activeMembers, setActiveMembers] = useState<ActiveMember[]>([]);

  const fetchStats = useCallback(async () => {
    if (!selectedGymId) return;
    
    const now = new Date();
    const todayStart = startOfDay(now);
    const sixtyMinsAgo = subMinutes(now, 60);
    const thirtyMinsAgo = subMinutes(now, 30);

    try {
      // Get membership IDs for this gym
      const { data: memberships } = await supabase
        .from("memberships")
        .select("id")
        .eq("gym_id", selectedGymId);
      
      if (!memberships || memberships.length === 0) {
        setTodayCount(0);
        setLast60MinCount(0);
        setLast30MinCount(0);
        setActiveMembers([]);
        return;
      }

      const membershipIds = memberships.map(m => m.id);

      // Today's check-ins
      const { count: todayTotal } = await supabase
        .from("membership_checkins")
        .select("id", { count: "exact", head: true })
        .in("membership_id", membershipIds)
        .gte("checked_in_at", todayStart.toISOString());

      // Last 60 minutes
      const { count: sixtyMinTotal } = await supabase
        .from("membership_checkins")
        .select("id", { count: "exact", head: true })
        .in("membership_id", membershipIds)
        .gte("checked_in_at", sixtyMinsAgo.toISOString());

      // Last 30 minutes
      const { count: thirtyMinTotal } = await supabase
        .from("membership_checkins")
        .select("id", { count: "exact", head: true })
        .in("membership_id", membershipIds)
        .gte("checked_in_at", thirtyMinsAgo.toISOString());

      setTodayCount(todayTotal || 0);
      setLast60MinCount(sixtyMinTotal || 0);
      setLast30MinCount(thirtyMinTotal || 0);
      
      // Fetch active members (checked in within last 30 minutes)
      const { data: recentCheckins } = await supabase
        .from("membership_checkins")
        .select(`
          id,
          checked_in_at,
          membership:memberships!inner(
            id,
            membership_number,
            user_id,
            gym_id
          )
        `)
        .in("membership_id", membershipIds)
        .gte("checked_in_at", thirtyMinsAgo.toISOString())
        .order("checked_in_at", { ascending: false });

      if (recentCheckins && recentCheckins.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set(recentCheckins.map(c => (c.membership as any).user_id))];
        
        // Fetch profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        // Build active members list (only most recent check-in per member)
        const seenMembers = new Set<string>();
        const activeMembersList: ActiveMember[] = [];
        
        for (const checkin of recentCheckins) {
          const membership = checkin.membership as any;
          if (!seenMembers.has(membership.id)) {
            seenMembers.add(membership.id);
            const profile = profileMap.get(membership.user_id);
            activeMembersList.push({
              id: membership.id,
              membership_number: membership.membership_number,
              display_name: profile?.display_name || "Member",
              avatar_url: profile?.avatar_url || null,
              checked_in_at: new Date(checkin.checked_in_at)
            });
          }
        }
        
        setActiveMembers(activeMembersList);
      } else {
        setActiveMembers([]);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [selectedGymId]);

  useEffect(() => {
    checkCameraPermission();
    fetchStats();
    
    // Refresh stats every 30 seconds
    const statsInterval = setInterval(fetchStats, 30000);
    return () => clearInterval(statsInterval);
  }, [fetchStats]);

  useEffect(() => {
    // Clear checked-in member after 20 seconds of inactivity
    if (checkedInMember) {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
      clearTimerRef.current = setTimeout(() => {
        setCheckedInMember(null);
        setError(null);
      }, 20000);
    }
    
    return () => {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
    };
  }, [checkedInMember]);

  const checkCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission("granted");
    } catch {
      setCameraPermission("denied");
    }
  };

  const handleQrScan = async (result: any) => {
    if (!result || !result[0]?.rawValue || isProcessing) return;
    
    const scannedValue = result[0].rawValue;
    setIsProcessing(true);
    setError(null);
    
    // Clear any existing timer
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
    
    try {
      // Look up membership
      const { data: membership, error: membershipError } = await supabase
        .from("memberships")
        .select("id, membership_number, status, user_id, gym_id")
        .eq("membership_number", scannedValue.trim())
        .single();

      if (membershipError || !membership) {
        setError("Membership not found");
        setCheckedInMember(null);
        toast.error("Membership not found");
        playErrorSound();
        return;
      }

      if (membership.gym_id !== selectedGymId) {
        setError("This membership is for a different gym");
        setCheckedInMember(null);
        toast.error("This membership is for a different gym");
        playErrorSound();
        return;
      }

      if (membership.status !== "active") {
        setError(`Membership is ${membership.status}`);
        setCheckedInMember(null);
        toast.error(`Membership is ${membership.status}`);
        playErrorSound();
        return;
      }

      // Get profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", membership.user_id)
        .single();

      // Get last check-in time
      const { data: lastCheckin } = await supabase
        .from("membership_checkins")
        .select("checked_in_at")
        .eq("membership_id", membership.id)
        .order("checked_in_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Record check-in
      const { error: checkinError } = await supabase
        .from("membership_checkins")
        .insert({
          membership_id: membership.id,
          checked_in_at: new Date().toISOString()
        });

      if (checkinError) throw checkinError;

      // Set checked-in member
      setCheckedInMember({
        id: membership.id,
        membership_number: membership.membership_number,
        display_name: profile?.display_name || "Member",
        avatar_url: profile?.avatar_url || null,
        checked_in_at: new Date(),
        last_checkin: lastCheckin?.checked_in_at ? new Date(lastCheckin.checked_in_at) : null
      });

      toast.success(`${profile?.display_name || "Member"} checked in!`);
      playSuccessSound();
      
      // Refresh stats
      fetchStats();
      
    } catch (error) {
      console.error("Check-in error:", error);
      setError("Failed to process check-in");
      toast.error("Failed to process check-in");
      playErrorSound();
    } finally {
      setIsProcessing(false);
    }
  };

  if (!selectedGymId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Please select a gym first.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/gym-portal/dashboard")}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Check-in Station</h1>
            <p className="text-muted-foreground">{selectedGym?.name}</p>
          </div>
        </div>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todayCount}</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{last60MinCount}</p>
              <p className="text-xs text-muted-foreground">Last 60 min</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{last30MinCount}</p>
              <p className="text-xs text-muted-foreground">Last 30 min</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Camera and Result */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Camera Section */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Scan Member QR Code</h2>
          </div>
          
          {cameraPermission === "pending" && (
            <div className="aspect-square flex items-center justify-center bg-muted rounded-lg">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Requesting camera access...</p>
              </div>
            </div>
          )}

          {cameraPermission === "denied" && (
            <div className="aspect-square flex items-center justify-center bg-muted rounded-lg">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                <p className="font-medium mb-2">Camera Access Denied</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Please allow camera access in your browser settings.
                </p>
                <button
                  onClick={checkCameraPermission}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {cameraPermission === "granted" && (
            <div className="relative aspect-square rounded-lg overflow-hidden bg-black">
              <Scanner
                onScan={handleQrScan}
                onError={(error) => console.error("QR scan error:", error)}
                formats={["qr_code"]}
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </div>
          )}
          
          <p className="text-center text-sm text-muted-foreground mt-4">
            Point the camera at a member's QR code to check them in
          </p>
        </div>

        {/* Result Section */}
        <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-center min-h-[400px]">
          {checkedInMember ? (
            <div className="text-center w-full">
              <div className="relative mx-auto mb-6">
                <Avatar className="h-32 w-32 mx-auto border-4 border-green-500">
                  <AvatarImage src={checkedInMember.avatar_url || undefined} />
                  <AvatarFallback className="text-4xl font-bold bg-muted">
                    {checkedInMember.display_name[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold mb-2">{checkedInMember.display_name}</h2>
              <p className="text-lg text-muted-foreground mb-1">
                ID: #{checkedInMember.membership_number}
              </p>
              <p className="text-lg text-green-600 font-medium mb-4">
                Checked in at {format(checkedInMember.checked_in_at, "h:mm a")}
              </p>
              
              {checkedInMember.last_checkin && (
                <p className="text-sm text-muted-foreground">
                  Last visit: {format(checkedInMember.last_checkin, "MMM d, h:mm a")}
                </p>
              )}
            </div>
          ) : error ? (
            <div className="text-center">
              <div className="h-20 w-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-10 w-10 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold text-destructive mb-2">Check-in Failed</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="h-20 w-20 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-muted-foreground">Ready to Scan</h3>
              <p className="text-muted-foreground">Scan a member's QR code to check them in</p>
            </div>
          )}
        </div>
      </div>

      {/* Who's in the Gym */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Who's in the Gym</h2>
          </div>
          <span className="text-sm text-muted-foreground">
            Last 30 minutes • {activeMembers.length} {activeMembers.length === 1 ? "member" : "members"}
          </span>
        </div>
        
        {activeMembers.length > 0 ? (
          <ScrollArea className="h-[200px]">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {activeMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col items-center p-3 bg-muted/50 rounded-lg"
                >
                  <Avatar className="h-12 w-12 mb-2">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-lg font-bold">
                      {member.display_name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium text-center truncate w-full">
                    {member.display_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(member.checked_in_at, "h:mm a")}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="h-[200px] flex items-center justify-center">
            <div className="text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">No members checked in recently</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
