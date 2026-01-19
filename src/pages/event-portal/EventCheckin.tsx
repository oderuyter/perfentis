import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEventCheckin, Registration } from "@/hooks/useEventCheckin";
import { 
  Search, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  User, 
  Users, 
  Undo2,
  AlertCircle,
  Camera
} from "lucide-react";
import { toast } from "sonner";
import { Scanner } from "@yudiel/react-qr-scanner";

interface EventContext {
  selectedEventId: string | null;
  selectedEvent: { title: string } | null;
}

export default function EventCheckin() {
  const { selectedEventId, selectedEvent } = useOutletContext<EventContext>();
  const { 
    registrations, 
    isLoading, 
    checkingIn,
    validateToken,
    checkIn, 
    undoCheckIn,
    searchRegistrations 
  } = useEventCheckin(selectedEventId);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [undoTarget, setUndoTarget] = useState<Registration | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [scanResult, setScanResult] = useState<Registration | null>(null);

  const filteredRegistrations = searchQuery 
    ? searchRegistrations(searchQuery) 
    : registrations;

  const checkedInCount = registrations.filter(r => r.isCheckedIn).length;
  const pendingCount = registrations.length - checkedInCount;

  const handleTokenSubmit = async () => {
    if (!tokenInput.trim()) return;
    
    const reg = await validateToken(tokenInput.trim());
    if (reg) {
      setSelectedReg(reg);
      setTokenInput("");
    } else {
      toast.error("Invalid or expired token");
    }
  };

  const handleCheckIn = async (reg: Registration) => {
    const result = await checkIn(reg.id, "manual", "portal");
    if (result.success) {
      toast.success(`${reg.userName} checked in successfully`);
      setSelectedReg(null);
      setScanResult(null);
    } else {
      toast.error(result.message);
    }
  };

  const handleUndoCheckIn = async () => {
    if (!undoTarget) return;
    
    const result = await undoCheckIn(undoTarget.id);
    if (result.success) {
      toast.success("Check-in undone");
    } else {
      toast.error(result.message);
    }
    setUndoTarget(null);
  };

  const handleScan = async (detectedCodes: any[]) => {
    if (detectedCodes.length > 0) {
      const token = detectedCodes[0].rawValue;
      setScannerActive(false);
      
      const reg = await validateToken(token);
      if (reg) {
        setScanResult(reg);
        if (!reg.isCheckedIn) {
          const result = await checkIn(reg.id, "qr", "portal");
          if (result.success) {
            toast.success(`${reg.userName} checked in successfully`);
          } else {
            toast.error(result.message);
          }
        } else {
          toast.info(`${reg.userName} is already checked in`);
        }
      } else {
        toast.error("Invalid or expired QR code");
      }
    }
  };

  if (!selectedEventId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select an event first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Check-In</h1>
          <p className="text-muted-foreground">{selectedEvent?.title}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{checkedInCount}</p>
            <p className="text-xs text-muted-foreground">Checked In</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-muted-foreground">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="scan" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scan" className="gap-2">
            <Camera className="h-4 w-4" />
            Scan QR
          </TabsTrigger>
          <TabsTrigger value="token" className="gap-2">
            <QrCode className="h-4 w-4" />
            Enter Token
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-2">
            <Search className="h-4 w-4" />
            Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {scannerActive ? (
                <div className="space-y-4">
                  <div className="aspect-square max-w-md mx-auto rounded-lg overflow-hidden border-2 border-primary">
                    <Scanner
                      onScan={handleScan}
                      onError={(error) => console.error(error)}
                      constraints={{ facingMode: "environment" }}
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setScannerActive(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Camera className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-medium mb-2">Scan QR Code</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Point the camera at a competitor's QR pass
                  </p>
                  <Button onClick={() => setScannerActive(true)}>
                    Start Scanner
                  </Button>
                </div>
              )}

              {scanResult && (
                <div className="mt-4 p-4 rounded-lg bg-muted">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{scanResult.userName}</p>
                        <p className="text-sm text-muted-foreground">
                          {scanResult.divisionName || "No division"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={scanResult.isCheckedIn ? "default" : "secondary"}>
                      {scanResult.isCheckedIn ? "Checked In" : "Pending"}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="token" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Paste or enter token..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTokenSubmit()}
                />
                <Button onClick={handleTokenSubmit} disabled={!tokenInput.trim()}>
                  Validate
                </Button>
              </div>

              {selectedReg && (
                <div className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{selectedReg.userName}</p>
                        <p className="text-sm text-muted-foreground">{selectedReg.userEmail}</p>
                      </div>
                    </div>
                    <Badge variant={selectedReg.isCheckedIn ? "default" : "secondary"}>
                      {selectedReg.isCheckedIn ? "Checked In" : "Not Checked In"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {selectedReg.divisionName && (
                      <div>
                        <p className="text-xs text-muted-foreground">Division</p>
                        <p className="font-medium">{selectedReg.divisionName}</p>
                      </div>
                    )}
                    {selectedReg.teamName && (
                      <div>
                        <p className="text-xs text-muted-foreground">Team</p>
                        <p className="font-medium">{selectedReg.teamName}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {selectedReg.isCheckedIn ? (
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => setUndoTarget(selectedReg)}
                      >
                        <Undo2 className="h-4 w-4 mr-2" />
                        Undo Check-In
                      </Button>
                    ) : (
                      <Button
                        className="flex-1"
                        onClick={() => handleCheckIn(selectedReg)}
                        disabled={checkingIn}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Check In
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setSelectedReg(null)}>
                      Clear
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or team..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredRegistrations.map((reg) => (
                      <div
                        key={reg.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            reg.isCheckedIn ? "bg-primary/10" : "bg-muted"
                          }`}>
                            {reg.teamId ? (
                              <Users className={`h-5 w-5 ${reg.isCheckedIn ? "text-primary" : "text-muted-foreground"}`} />
                            ) : (
                              <User className={`h-5 w-5 ${reg.isCheckedIn ? "text-primary" : "text-muted-foreground"}`} />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{reg.userName}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {reg.divisionName && <span>{reg.divisionName}</span>}
                              {reg.teamName && <span>• {reg.teamName}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {reg.isCheckedIn ? (
                            <>
                              <Badge variant="default" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Checked In
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setUndoTarget(reg)}
                              >
                                <Undo2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Badge variant="secondary" className="gap-1">
                                <Clock className="h-3 w-3" />
                                Pending
                              </Badge>
                              <Button
                                size="sm"
                                onClick={() => handleCheckIn(reg)}
                                disabled={checkingIn}
                              >
                                Check In
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}

                    {filteredRegistrations.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        {searchQuery ? "No matching registrations found" : "No registrations yet"}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Undo Confirmation Dialog */}
      <AlertDialog open={!!undoTarget} onOpenChange={() => setUndoTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo Check-In?</AlertDialogTitle>
            <AlertDialogDescription>
              This will undo the check-in for {undoTarget?.userName}. They will need to check in again.
              {undoTarget?.activeForEvent && (
                <span className="block mt-2 text-amber-600">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Any scores submitted may be flagged for review.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUndoCheckIn}>
              Undo Check-In
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
