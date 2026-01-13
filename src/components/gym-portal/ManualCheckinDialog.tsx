import { useState, useEffect } from "react";
import { Camera, Search, Loader2, CheckCircle, Hash, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Scanner } from "@yudiel/react-qr-scanner";

interface ManualCheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gymId: string;
  onSuccess?: () => void;
}

interface MemberResult {
  id: string;
  membership_number: string;
  status: string;
  profiles: { display_name: string } | null;
}

export function ManualCheckinDialog({ 
  open, 
  onOpenChange, 
  gymId,
  onSuccess 
}: ManualCheckinDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [membershipId, setMembershipId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [searchResults, setSearchResults] = useState<MemberResult[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberResult | null>(null);
  const [checkinSuccess, setCheckinSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("qr");
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<"pending" | "granted" | "denied">("pending");

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setMembershipId("");
      setSearchResults([]);
      setSelectedMember(null);
      setCheckinSuccess(false);
      setActiveTab("qr");
      setScanError(null);
      setCameraPermission("pending");
    }
  }, [open]);

  useEffect(() => {
    if (open && activeTab === "qr") {
      checkCameraPermission();
    }
  }, [open, activeTab]);

  const checkCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission("granted");
    } catch (error) {
      setCameraPermission("denied");
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const { data: memberships, error } = await supabase
        .from("memberships")
        .select("id, membership_number, status, user_id")
        .eq("gym_id", gymId)
        .eq("status", "active")
        .limit(50);

      if (error) throw error;

      const userIds = (memberships || []).map(m => m.user_id);
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      const results = (memberships || [])
        .map(m => ({
          id: m.id,
          membership_number: m.membership_number,
          status: m.status,
          profiles: profiles?.find((p: any) => p.id === m.user_id) || null
        }))
        .filter(m => 
          m.membership_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.profiles?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 10);
      
      setSearchResults(results as MemberResult[]);
    } catch (error) {
      console.error("Error searching members:", error);
      toast.error("Failed to search members");
    } finally {
      setIsSearching(false);
    }
  };

  const lookupMembershipNumber = async (membershipNumber: string) => {
    setIsSearching(true);
    setSelectedMember(null);
    setScanError(null);
    
    try {
      // First check if the membership exists for THIS gym
      const { data, error } = await supabase
        .from("memberships")
        .select("id, membership_number, status, user_id, gym_id")
        .eq("membership_number", membershipNumber.trim())
        .single();

      if (error || !data) {
        setScanError("Membership not found");
        toast.error("Membership not found");
        return null;
      }

      // Validate membership is for this gym
      if (data.gym_id !== gymId) {
        setScanError("This membership is for a different gym");
        toast.error("This membership is for a different gym");
        return null;
      }

      // Validate membership is active
      if (data.status !== "active") {
        setScanError(`Membership is ${data.status}`);
        toast.error(`Membership is ${data.status}`);
        return null;
      }

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("id", data.user_id)
        .single();

      const member = {
        id: data.id,
        membership_number: data.membership_number,
        status: data.status,
        profiles: profile || null
      } as MemberResult;

      setSelectedMember(member);
      return member;
    } catch (error) {
      console.error("Error looking up member:", error);
      setScanError("Failed to find member");
      toast.error("Failed to find member");
      return null;
    } finally {
      setIsSearching(false);
    }
  };

  const handleMembershipIdLookup = async () => {
    if (!membershipId.trim()) return;
    await lookupMembershipNumber(membershipId.trim());
  };

  const handleQrScan = async (result: any) => {
    if (!result || !result[0]?.rawValue) return;
    
    const scannedValue = result[0].rawValue;
    console.log("QR Scanned:", scannedValue);
    
    // Attempt to look up and auto check-in
    const member = await lookupMembershipNumber(scannedValue);
    if (member) {
      await handleCheckin(member);
    }
  };

  const handleCheckin = async (member: MemberResult) => {
    setIsCheckingIn(true);
    try {
      const { error } = await supabase
        .from("membership_checkins")
        .insert({
          membership_id: member.id,
          checked_in_at: new Date().toISOString()
        });

      if (error) throw error;

      setCheckinSuccess(true);
      setSelectedMember(member);
      toast.success(`${member.profiles?.display_name || "Member"} checked in successfully`);
      onSuccess?.();
    } catch (error) {
      console.error("Error checking in:", error);
      toast.error("Failed to check in member");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const resetState = () => {
    setCheckinSuccess(false);
    setSelectedMember(null);
    setSearchQuery("");
    setMembershipId("");
    setSearchResults([]);
    setScanError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Member Check-in</DialogTitle>
          <DialogDescription>
            Scan a member's QR code or search manually to check them in.
          </DialogDescription>
        </DialogHeader>

        {checkinSuccess && selectedMember ? (
          <div className="py-8 text-center">
            <div className="h-16 w-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Check-in Successful!</h3>
            <p className="text-muted-foreground mb-1">
              {selectedMember.profiles?.display_name || "Member"}
            </p>
            <p className="text-sm text-muted-foreground">
              #{selectedMember.membership_number} • {format(new Date(), "h:mm a")}
            </p>
            <button
              onClick={resetState}
              className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
            >
              Check in Another
            </button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="qr">
                <Camera className="h-4 w-4 mr-2" />
                Scan QR
              </TabsTrigger>
              <TabsTrigger value="search">
                <Search className="h-4 w-4 mr-2" />
                Search
              </TabsTrigger>
              <TabsTrigger value="id">
                <Hash className="h-4 w-4 mr-2" />
                Member ID
              </TabsTrigger>
            </TabsList>

            <TabsContent value="qr" className="space-y-4">
              {cameraPermission === "pending" && (
                <div className="py-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Requesting camera access...</p>
                </div>
              )}
              
              {cameraPermission === "denied" && (
                <div className="py-8 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                  <p className="font-medium mb-2">Camera Access Denied</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Please allow camera access to scan QR codes.
                  </p>
                  <button
                    onClick={checkCameraPermission}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {cameraPermission === "granted" && (
                <div className="space-y-4">
                  <div className="relative aspect-square max-w-[280px] mx-auto rounded-lg overflow-hidden bg-black">
                    <Scanner
                      onScan={handleQrScan}
                      onError={(error) => {
                        console.error("QR scan error:", error);
                      }}
                      formats={["qr_code"]}
                    />
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Point the camera at a member's QR code
                  </p>
                  
                  {scanError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
                      <p className="text-sm text-destructive">{scanError}</p>
                    </div>
                  )}

                  {isSearching && (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Looking up member...</span>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="search" className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
                  {searchResults.map((member) => (
                    <div
                      key={member.id}
                      className="p-3 flex items-center justify-between hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{member.profiles?.display_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          #{member.membership_number}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCheckin(member)}
                        disabled={isCheckingIn}
                        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        {isCheckingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check In"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="id" className="space-y-4">
              <div className="space-y-2">
                <Label>Membership Number</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., MEM-XXXXXXXX"
                    value={membershipId}
                    onChange={(e) => setMembershipId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleMembershipIdLookup()}
                  />
                  <button
                    onClick={handleMembershipIdLookup}
                    disabled={isSearching || !membershipId.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
                  >
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Find"}
                  </button>
                </div>
              </div>

              {scanError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{scanError}</p>
                </div>
              )}

              {selectedMember && (
                <div className="p-4 border border-border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedMember.profiles?.display_name || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">
                        #{selectedMember.membership_number}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCheckin(selectedMember)}
                      disabled={isCheckingIn}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      {isCheckingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check In"}
                    </button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
