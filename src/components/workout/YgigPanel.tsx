// YGIG (You Go, I Go) Panel for Active Workout
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, UserPlus, Search, Check, X, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { YgigSettings } from "@/types/workout-blocks";

interface YgigPanelProps {
  settings: YgigSettings;
  currentUserId: string;
  currentUserName?: string;
  blockInstanceId?: string;
  participants: Array<{ userId: string; displayName: string }>;
  activeParticipantUserId: string;
  turnIndex: number;
  onAddPartner: (partner: { userId: string; displayName: string }) => void;
  onCompleteTurn: () => void;
  className?: string;
}

export function YgigPanel({
  settings,
  currentUserId,
  currentUserName,
  blockInstanceId,
  participants,
  activeParticipantUserId,
  turnIndex,
  onAddPartner,
  onCompleteTurn,
  className,
}: YgigPanelProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; display_name: string | null }>>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);

  const isMyTurn = activeParticipantUserId === currentUserId;

  const searchPartners = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .ilike("display_name", `%${query}%`)
        .neq("id", currentUserId)
        .limit(10);

      if (error) throw error;
      const existingIds = new Set(participants.map(p => p.userId));
      setSearchResults((data || []).filter(u => !existingIds.has(u.id)));
    } catch (err) {
      console.error("Error searching partners:", err);
    } finally {
      setSearching(false);
    }
  }, [currentUserId, participants]);

  const handleInvite = async (user: { id: string; display_name: string }) => {
    setInviting(user.id);
    try {
      // Create YGIG invitation
      if (blockInstanceId) {
        await supabase.from("ygig_invitations").insert({
          block_instance_id: blockInstanceId,
          inviter_user_id: currentUserId,
          invitee_user_id: user.id,
          status: "pending",
        });

        // Note: notification will be handled by the notification system separately
      }

      onAddPartner({ userId: user.id, displayName: user.display_name || 'User' });
      setShowSearch(false);
      setSearchQuery("");
      toast.success(`Invited ${user.display_name}`);
    } catch (err) {
      console.error("Error inviting partner:", err);
      toast.error("Failed to send invite");
    } finally {
      setInviting(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-xl border border-blue-500/30 bg-blue-500/5 p-4", className)}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <Users className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">You Go, I Go</p>
          <p className="text-xs text-muted-foreground">
            Turn {turnIndex + 1} • {settings.turn_mode === 'set_based' ? 'Set-based' : 'Timed'}
          </p>
        </div>
      </div>

      {/* Turn indicator */}
      <div className={cn(
        "text-center py-4 rounded-lg mb-3 transition-colors",
        isMyTurn ? "bg-green-500/10 border border-green-500/30" : "bg-muted/50 border border-border/50"
      )}>
        <p className={cn(
          "text-lg font-bold",
          isMyTurn ? "text-green-600" : "text-muted-foreground"
        )}>
          {isMyTurn ? "🏋️ Your Turn!" : "⏳ Partner's Turn"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {participants.find(p => p.userId === activeParticipantUserId)?.displayName || 'Unknown'}
        </p>
      </div>

      {/* Participants */}
      <div className="space-y-2 mb-3">
        {participants.map((p, i) => (
          <div
            key={p.userId}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg transition-colors",
              p.userId === activeParticipantUserId ? "bg-primary/10 border border-primary/20" : "bg-background/80"
            )}
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">{p.displayName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium flex-1 truncate">{p.displayName}</span>
            {p.userId === activeParticipantUserId && (
              <Badge variant="default" className="text-xs">Active</Badge>
            )}
            {p.userId === currentUserId && (
              <Badge variant="outline" className="text-xs">You</Badge>
            )}
          </div>
        ))}
      </div>

      {/* Add partner */}
      {participants.length < settings.max_participants && (
        <>
          {showSearch ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  className="h-8 text-sm"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchPartners(e.target.value);
                  }}
                  autoFocus
                />
                <Button variant="ghost" size="sm" onClick={() => { setShowSearch(false); setSearchQuery(""); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {searching ? (
                  <p className="text-xs text-muted-foreground text-center py-2">Searching...</p>
                ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No users found</p>
                ) : (
                  searchResults.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleInvite(user)}
                      disabled={inviting === user.id}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 text-left"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">{user.display_name?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.display_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.display_name || 'User'}</p>
                      </div>
                      {inviting === user.id ? (
                        <span className="text-xs text-muted-foreground">Inviting...</span>
                      ) : (
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => setShowSearch(true)}>
              <UserPlus className="h-3 w-3" />Add Partner
            </Button>
          )}
        </>
      )}

      {/* Complete turn button */}
      {isMyTurn && (
        <Button
          className="w-full mt-3 gap-2"
          onClick={onCompleteTurn}
        >
          <ArrowRightLeft className="h-4 w-4" />
          Complete Turn
        </Button>
      )}
    </motion.div>
  );
}
