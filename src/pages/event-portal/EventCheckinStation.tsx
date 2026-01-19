import { useState, useEffect, useCallback } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useEventCheckin, Registration } from "@/hooks/useEventCheckin";
import { useOfflineCheckinQueue } from "@/hooks/useOfflineCheckinQueue";
import { 
  CheckCircle2, 
  XCircle, 
  Wifi, 
  WifiOff, 
  ChevronLeft,
  RefreshCw,
  CloudOff,
  Upload
} from "lucide-react";
import { toast } from "sonner";
import { Scanner } from "@yudiel/react-qr-scanner";
import { cn } from "@/lib/utils";

interface EventContext {
  selectedEventId: string | null;
  selectedEvent: { title: string } | null;
}

export default function EventCheckinStation() {
  const navigate = useNavigate();
  const { selectedEventId, selectedEvent } = useOutletContext<EventContext>();
  const { registrations, validateToken, checkIn, refetch } = useEventCheckin(selectedEventId);
  const { 
    isOnline, 
    pendingCount, 
    isSyncing, 
    cachedEvent,
    queueCheckin, 
    syncQueue,
    validateTokenOffline 
  } = useOfflineCheckinQueue(selectedEventId);
  
  const [lastScanned, setLastScanned] = useState<Registration | null>(null);
  const [scanStatus, setScanStatus] = useState<"idle" | "success" | "error" | "already">("idle");
  const [tokenInput, setTokenInput] = useState("");

  const checkedInCount = isOnline 
    ? registrations.filter(r => r.isCheckedIn).length 
    : cachedEvent?.registrations.filter(r => r.isCheckedIn).length || 0;

  const processToken = useCallback(async (token: string) => {
    // Try online first
    if (isOnline) {
      const reg = await validateToken(token);
      if (!reg) {
        setScanStatus("error");
        setLastScanned(null);
        toast.error("Invalid QR code");
        return;
      }

      setLastScanned(reg);

      if (reg.isCheckedIn) {
        setScanStatus("already");
        toast.info(`${reg.userName} already checked in`);
      } else {
        const result = await checkIn(reg.id, "qr", "station");
        if (result.success) {
          setScanStatus("success");
          toast.success(`${reg.userName} checked in!`);
        } else {
          setScanStatus("error");
          toast.error(result.message);
        }
      }
    } else {
      // Offline mode
      const cached = validateTokenOffline(token);
      if (!cached) {
        setScanStatus("error");
        setLastScanned(null);
        toast.error("Invalid QR code (offline)");
        return;
      }

      setLastScanned({
        id: cached.id,
        userId: cached.userId,
        userName: cached.userName,
        userEmail: cached.userEmail,
        divisionId: null,
        divisionName: cached.divisionName,
        teamId: null,
        teamName: cached.teamName,
        status: "confirmed",
        isCheckedIn: cached.isCheckedIn,
        checkedInAt: cached.checkedInAt,
        activeForEvent: cached.isCheckedIn,
        passToken: cached.passToken,
      });

      if (cached.isCheckedIn) {
        setScanStatus("already");
        toast.info(`${cached.userName} already checked in`);
      } else {
        const result = await queueCheckin(cached.id, "qr", "station");
        if (result.success) {
          setScanStatus("success");
          toast.success(`${cached.userName} queued for check-in (offline)`);
        } else {
          setScanStatus("error");
          toast.error(result.message);
        }
      }
    }

    // Reset after 3 seconds
    setTimeout(() => {
      setScanStatus("idle");
      setLastScanned(null);
    }, 3000);
  }, [isOnline, validateToken, checkIn, validateTokenOffline, queueCheckin]);

  const handleScan = useCallback((detectedCodes: any[]) => {
    if (detectedCodes.length > 0 && scanStatus === "idle") {
      processToken(detectedCodes[0].rawValue);
    }
  }, [processToken, scanStatus]);

  const handleTokenSubmit = () => {
    if (tokenInput.trim()) {
      processToken(tokenInput.trim());
      setTokenInput("");
    }
  };

  const handleManualSync = async () => {
    const { synced, failed } = await syncQueue();
    if (synced > 0) toast.success(`Synced ${synced} check-ins`);
    if (failed > 0) toast.error(`${failed} check-ins failed to sync`);
    if (synced === 0 && failed === 0) toast.info("Nothing to sync");
    refetch();
  };

  if (!selectedEventId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Please select an event first</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold">Check-In Station</h1>
            <p className="text-sm text-muted-foreground">{selectedEvent?.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Offline indicator */}
          <Badge variant={isOnline ? "default" : "secondary"} className="gap-1">
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? "Online" : "Offline"}
          </Badge>

          {/* Pending sync count */}
          {pendingCount > 0 && (
            <Badge variant="outline" className="gap-1">
              <CloudOff className="h-3 w-3" />
              {pendingCount} pending
            </Badge>
          )}

          <div className="text-center">
            <p className="text-xl font-bold">{checkedInCount}</p>
            <p className="text-xs text-muted-foreground">Checked In</p>
          </div>

          {isOnline && pendingCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManualSync}
              disabled={isSyncing}
            >
              <Upload className="h-4 w-4 mr-1" />
              Sync
            </Button>
          )}

          <Button variant="outline" size="icon" onClick={refetch} disabled={!isOnline}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Scanner Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className={cn(
          "w-full max-w-lg aspect-square rounded-2xl overflow-hidden border-4 transition-colors",
          scanStatus === "idle" && "border-border",
          scanStatus === "success" && "border-green-500",
          scanStatus === "error" && "border-destructive",
          scanStatus === "already" && "border-amber-500"
        )}>
          <Scanner
            onScan={handleScan}
            onError={(error) => console.error(error)}
            constraints={{ facingMode: "environment" }}
            styles={{ container: { width: "100%", height: "100%" } }}
          />
        </div>

        {/* Result Overlay */}
        {scanStatus !== "idle" && lastScanned && (
          <div className={cn(
            "mt-6 p-6 rounded-xl w-full max-w-lg text-center",
            scanStatus === "success" && "bg-green-500/10 border border-green-500",
            scanStatus === "error" && "bg-destructive/10 border border-destructive",
            scanStatus === "already" && "bg-amber-500/10 border border-amber-500"
          )}>
            <div className="flex justify-center mb-3">
              {scanStatus === "success" && <CheckCircle2 className="h-12 w-12 text-green-500" />}
              {scanStatus === "error" && <XCircle className="h-12 w-12 text-destructive" />}
              {scanStatus === "already" && <CheckCircle2 className="h-12 w-12 text-amber-500" />}
            </div>
            <p className="text-xl font-bold">{lastScanned.userName}</p>
            <p className="text-muted-foreground">
              {lastScanned.divisionName || "Individual"} 
              {lastScanned.teamName && ` • ${lastScanned.teamName}`}
            </p>
            <p className="mt-2 font-medium">
              {scanStatus === "success" && (isOnline ? "Checked In Successfully!" : "Queued (Offline)")}
              {scanStatus === "error" && "Check-In Failed"}
              {scanStatus === "already" && "Already Checked In"}
            </p>
          </div>
        )}

        {/* Manual Token Entry */}
        <div className="mt-6 w-full max-w-lg">
          <div className="flex gap-2">
            <Input
              placeholder="Or paste/type token here..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTokenSubmit()}
              className="text-center"
            />
            <Button onClick={handleTokenSubmit} disabled={!tokenInput.trim()}>
              Submit
            </Button>
          </div>
        </div>

        {/* Offline notice */}
        {!isOnline && (
          <p className="mt-4 text-sm text-muted-foreground text-center">
            Working offline. Check-ins will sync when connection is restored.
          </p>
        )}
      </div>
    </div>
  );
}
