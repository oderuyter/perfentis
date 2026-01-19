import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQRWallet, GymPass, EventPass } from "@/hooks/useQRWallet";
import { QRCodeSVG } from "qrcode.react";
import { 
  Building2, 
  Trophy, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2,
  Clock,
  Calendar
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface QRWalletSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QRWalletSheet({ isOpen, onClose }: QRWalletSheetProps) {
  const { gymPasses, eventPasses, isLoading, totalPasses, hasOnlyOnePass, singlePass } = useQRWallet();
  const [selectedPass, setSelectedPass] = useState<GymPass | EventPass | null>(null);

  const isGymPass = (pass: GymPass | EventPass): pass is GymPass => {
    return "gymName" in pass;
  };

  const renderPassList = () => {
    if (totalPasses === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Trophy className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-lg mb-2">No Active Passes</h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            Your gym memberships and event passes will appear here when available.
          </p>
        </div>
      );
    }

    return (
      <Tabs defaultValue={gymPasses.length > 0 ? "gym" : "event"} className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger value="gym" className="gap-2">
            <Building2 className="h-4 w-4" />
            Gym ({gymPasses.length})
          </TabsTrigger>
          <TabsTrigger value="event" className="gap-2">
            <Trophy className="h-4 w-4" />
            Events ({eventPasses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gym">
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {gymPasses.map((pass) => (
                <button
                  key={pass.id}
                  onClick={() => setSelectedPass(pass)}
                  className="w-full p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{pass.gymName}</p>
                        <p className="text-sm text-muted-foreground">{pass.membershipLevel}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={pass.status === "active" ? "default" : "secondary"}>
                        {pass.status}
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              ))}
              {gymPasses.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No gym passes available
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="event">
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {eventPasses.map((pass) => (
                <button
                  key={pass.id}
                  onClick={() => setSelectedPass(pass)}
                  className="w-full p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Trophy className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{pass.eventName}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {pass.divisionName && <span>{pass.divisionName}</span>}
                          {pass.teamName && <span>• {pass.teamName}</span>}
                        </div>
                        {pass.eventStartDate && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(pass.eventStartDate), "MMM d, yyyy")}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pass.isCheckedIn ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Checked In
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              ))}
              {eventPasses.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No event passes available
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    );
  };

  const renderQRView = (pass: GymPass | EventPass) => {
    const isGym = isGymPass(pass);
    const token = isGym ? pass.qrToken : pass.passToken;

    return (
      <div className="flex flex-col items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedPass(null)}
          className="self-start mb-4 -ml-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Passes
        </Button>

        <div className="text-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            {isGym ? (
              <Building2 className="h-6 w-6 text-primary" />
            ) : (
              <Trophy className="h-6 w-6 text-primary" />
            )}
          </div>
          <h3 className="font-semibold text-lg">
            {isGym ? pass.gymName : pass.eventName}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isGym ? pass.membershipLevel : pass.divisionName || "Individual"}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg mb-6">
          <QRCodeSVG
            value={token}
            size={200}
            level="H"
            includeMargin
            className="rounded-lg"
          />
        </div>

        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Show this QR code at check-in. Do not share this code with others.
        </p>

        {!isGym && (pass as EventPass).isCheckedIn && (
          <Badge variant="default" className="mt-4 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Already Checked In
          </Badge>
        )}
      </div>
    );
  };

  // Auto-select single pass
  const displayPass = selectedPass || (hasOnlyOnePass ? singlePass : null);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            {displayPass ? (
              isGymPass(displayPass) ? "Gym Pass" : "Event Pass"
            ) : (
              "QR Wallet"
            )}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayPass ? (
          renderQRView(displayPass)
        ) : (
          renderPassList()
        )}
      </SheetContent>
    </Sheet>
  );
}
