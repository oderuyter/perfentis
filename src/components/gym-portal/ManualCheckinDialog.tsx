import { useState, useEffect } from "react";
import { Camera, Search, Loader2, CheckCircle, X, QrCode, Hash } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("search");

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setMembershipId("");
      setSearchResults([]);
      setSelectedMember(null);
      setCheckinSuccess(false);
      setActiveTab("search");
    }
  }, [open]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      // Search memberships
      const { data: memberships, error } = await supabase
        .from("memberships")
        .select("id, membership_number, status, user_id")
        .eq("gym_id", gymId)
        .eq("status", "active")
        .limit(50);

      if (error) throw error;

      // Get user IDs
      const userIds = (memberships || []).map(m => m.user_id);
      
      // Fetch profiles separately
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      // Combine and filter
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

  const handleMembershipIdLookup = async () => {
    if (!membershipId.trim()) return;
    setIsSearching(true);
    setSelectedMember(null);
    
    try {
      const { data, error } = await supabase
        .from("memberships")
        .select("id, membership_number, status, user_id")
        .eq("gym_id", gymId)
        .eq("membership_number", membershipId.trim())
        .single();

      if (error || !data) {
        toast.error("Member not found");
        return;
      }

      if (data.status !== "active") {
        toast.error("Membership is not active");
        return;
      }

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("id", data.user_id)
        .single();

      setSelectedMember({
        id: data.id,
        membership_number: data.membership_number,
        status: data.status,
        profiles: profile || null
      } as MemberResult);
    } catch (error) {
      console.error("Error looking up member:", error);
      toast.error("Failed to find member");
    } finally {
      setIsSearching(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manual Check-in</DialogTitle>
          <DialogDescription>
            Search for a member or enter their membership ID to check them in.
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
              onClick={() => {
                setCheckinSuccess(false);
                setSelectedMember(null);
                setSearchQuery("");
                setMembershipId("");
                setSearchResults([]);
              }}
              className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
            >
              Check in Another
            </button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="search">
                <Search className="h-4 w-4 mr-2" />
                Search
              </TabsTrigger>
              <TabsTrigger value="id">
                <Hash className="h-4 w-4 mr-2" />
                Member ID
              </TabsTrigger>
              <TabsTrigger value="qr" disabled>
                <QrCode className="h-4 w-4 mr-2" />
                Scan QR
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
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

            <TabsContent value="qr" className="py-8 text-center">
              <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">QR scanning coming soon</p>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}