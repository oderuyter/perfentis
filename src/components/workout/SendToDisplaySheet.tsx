import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, Send, Shield, Eye, BarChart3, Unplug, Camera, Keyboard } from "lucide-react";
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
  onConnected: (displayId: string, sessionId: string, shareLevel: string) => void;
  onDisconnect?: () => void;
  isConnected?: boolean;
}

export function SendToDisplaySheet({ open, onClose, workoutState, onConnected, onDisconnect, isConnected }: SendToDisplaySheetProps) {
  const [joinCode, setJoinCode] = useState("");
  const [shareLevel, setShareLevel] = useState<"structure_only" | "completion_only" | "full_stats">("structure_only");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"choose" | "scan" | "code">("choose");
  const [scannerStream, setScannerStream] = useState<MediaStream | null>(null);
  const videoRef = useCallback((node: HTMLVideoElement | null) => {
    if (node && scannerStream) {
      node.srcObject = scannerStream;
      node.play().catch(() => {});
    }
  }, [scannerStream]);

  // Check for stored join code from QR web redirect
  useEffect(() => {
    if (open) {
      const storedCode = sessionStorage.getItem("display_join_code");
      if (storedCode) {
        setJoinCode(storedCode);
        setMode("code");
        sessionStorage.removeItem("display_join_code");
        sessionStorage.removeItem("display_join_name");
        sessionStorage.removeItem("display_join_owner");
      }
    }
  }, [open]);

  // Clean up camera on close
  useEffect(() => {
    if (!open && scannerStream) {
      scannerStream.getTracks().forEach(t => t.stop());
      setScannerStream(null);
      setMode("choose");
    }
  }, [open, scannerStream]);

  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      setScannerStream(stream);
      setMode("scan");

      // Use BarcodeDetector if available, otherwise fall back to manual code entry
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();

        const scanInterval = setInterval(async () => {
          try {
            const barcodes = await detector.detect(video);
            if (barcodes.length > 0) {
              const url = barcodes[0].rawValue;
              clearInterval(scanInterval);
              stream.getTracks().forEach(t => t.stop());
              setScannerStream(null);

              // Extract code from URL
              const match = url.match(/[?&]code=([A-Z0-9]{6})/i);
              if (match) {
                setJoinCode(match[1].toUpperCase());
                setMode("code");
              } else {
                toast.error("Invalid QR code");
                setMode("choose");
              }
            }
          } catch { /* scanning frame failed, continue */ }
        }, 300);

        // Stop after 30 seconds
        setTimeout(() => {
          clearInterval(scanInterval);
          if (stream.active) {
            stream.getTracks().forEach(t => t.stop());
            setScannerStream(null);
            if (mode === "scan") {
              toast("Scanner timed out — enter code manually");
              setMode("code");
            }
          }
        }, 30000);
      } else {
        // No BarcodeDetector — show camera briefly then switch to manual
        toast("QR scanning not supported on this device — enter code manually");
        setTimeout(() => {
          stream.getTracks().forEach(t => t.stop());
          setScannerStream(null);
          setMode("code");
        }, 1500);
      }
    } catch {
      toast.error("Camera access denied");
      setMode("code");
    }
  };

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

      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        // Disconnect from any other display sessions first
        await supabase
          .from("display_participants")
          .update({ status: "disconnected" })
          .eq("user_id", user.id)
          .eq("status", "connected")
          .neq("display_session_id", sessionId);

        await supabase.from("display_participants").upsert({
          display_session_id: sessionId,
          user_id: user.id,
          role_in_session: "broadcaster",
          share_level: shareLevel,
          status: "connected",
        }, { onConflict: "display_session_id,user_id" });

        // Ensure session is active
        await supabase
          .from("display_sessions")
          .update({ status: "active" })
          .eq("id", sessionId)
          .eq("status", "idle");
      }

      toast.success(`Connected to ${data.display?.name || "display"}!`);
      onConnected(displayId, sessionId, shareLevel);
      onClose();
    } catch (err) {
      toast.error("Failed to connect");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (onDisconnect) onDisconnect();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) { setMode("choose"); onClose(); } }}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            {isConnected ? "Display Connected" : "Send to Display"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-4">
          {isConnected ? (
            /* Connected state — show disconnect */
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-sm font-medium">Broadcasting to display</p>
              </div>
              <Button variant="destructive" onClick={handleDisconnect} className="w-full h-12 gap-2">
                <Unplug className="h-4 w-4" />
                Disconnect
              </Button>
            </div>
          ) : mode === "choose" ? (
            /* Connection method selection */
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">How would you like to connect?</p>
              <button
                onClick={startScanner}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Camera className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Scan QR Code</p>
                  <p className="text-xs text-muted-foreground">Point camera at display screen</p>
                </div>
              </button>
              <button
                onClick={() => setMode("code")}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Keyboard className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">Enter Join Code</p>
                  <p className="text-xs text-muted-foreground">Type the 6-digit code shown on display</p>
                </div>
              </button>
            </div>
          ) : mode === "scan" ? (
            /* Camera scanner */
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-square max-h-64 mx-auto">
                {scannerStream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-white/50 text-sm">Starting camera…</p>
                  </div>
                )}
                {/* Scan overlay */}
                <div className="absolute inset-0 border-2 border-white/30 rounded-xl pointer-events-none">
                  <div className="absolute top-1/4 left-1/4 right-1/4 bottom-1/4 border-2 border-white/60 rounded-lg" />
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground">Point at the QR code on the display</p>
              <Button variant="outline" onClick={() => { 
                scannerStream?.getTracks().forEach(t => t.stop()); 
                setScannerStream(null); 
                setMode("code"); 
              }} className="w-full">
                Enter code manually instead
              </Button>
            </div>
          ) : (
            /* Code entry + share level */
            <>
              <div>
                <Label>Join Code</Label>
                <Input
                  placeholder="Enter 6-digit code"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="font-mono text-lg tracking-widest text-center"
                  autoFocus
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

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setMode("choose")} className="h-12">
                  Back
                </Button>
                <Button onClick={handleConnect} className="flex-1 h-12 gap-2" disabled={loading || joinCode.length < 6}>
                  <Send className="h-4 w-4" />
                  {loading ? "Connecting…" : "Connect"}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
