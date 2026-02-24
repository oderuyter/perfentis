import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Monitor, Send, Shield, Eye, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendToDisplaySheetProps {
  open: boolean;
  onClose: () => void;
  workoutState: any;
  onConnected: (displayId: string, sessionId: string) => void;
}

export function SendToDisplaySheet({ open, onClose, workoutState, onConnected }: SendToDisplaySheetProps) {
  const [joinCode, setJoinCode] = useState("");
  const [shareLevel, setShareLevel] = useState<"structure_only" | "completion_only" | "full_stats">("structure_only");
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!joinCode.trim()) {
      toast.error("Enter a join code");
      return;
    }

    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/display-lookup?join_code=${joinCode.trim().toUpperCase()}`, {
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (!res.ok || !data.session) {
        toast.error(data.error || "Session not found");
        setLoading(false);
        return;
      }

      const sessionId = data.session.id;
      const displayId = data.session.display_id;

      // Add as participant
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        await supabase.from("display_participants").upsert({
          display_session_id: sessionId,
          user_id: user.id,
          role_in_session: "broadcaster",
          share_level: shareLevel,
          status: "connected",
        }, { onConflict: "display_session_id,user_id" });

        // Link workout session if session has no workout yet
        if (!data.session.current_workout_session_id && workoutState) {
          await supabase
            .from("display_sessions")
            .update({ status: "active", current_workout_session_id: null })
            .eq("id", sessionId);
        }
      }

      toast.success("Connected to display!");
      onConnected(displayId, sessionId);
      onClose();
    } catch (err) {
      toast.error("Failed to connect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Send to Display
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-4">
          <div>
            <Label>Join Code</Label>
            <Input
              placeholder="Enter 6-character code"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="font-mono text-lg tracking-widest text-center"
            />
          </div>

          <div>
            <Label className="mb-3 block">Privacy Level</Label>
            <RadioGroup value={shareLevel} onValueChange={v => setShareLevel(v as any)}>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="structure_only" id="structure" />
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <label htmlFor="structure" className="text-sm font-medium cursor-pointer">Structure Only</label>
                  <p className="text-xs text-muted-foreground">Exercise names & timers only</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="completion_only" id="completion" />
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <label htmlFor="completion" className="text-sm font-medium cursor-pointer">Completion Only</label>
                  <p className="text-xs text-muted-foreground">Shows done/not done for each set</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="full_stats" id="full" />
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <label htmlFor="full" className="text-sm font-medium cursor-pointer">Full Stats</label>
                  <p className="text-xs text-muted-foreground">Weight & reps visible on display</p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <Button onClick={handleConnect} className="w-full h-12 gap-2" disabled={loading}>
            <Send className="h-4 w-4" />
            {loading ? "Connecting…" : "Connect to Display"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
