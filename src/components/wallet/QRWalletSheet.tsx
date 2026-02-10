import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQRWallet, GymPass, EventPass } from "@/hooks/useQRWallet";
import { useExternalGymCards, ExternalGymCard } from "@/hooks/useExternalGymCards";
import { ExternalCardQRView } from "@/components/gym/ExternalCardQRView";
import { AddExternalCardSheet } from "@/components/gym/AddExternalCardSheet";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { 
  Building2, 
  Trophy, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2,
  Clock,
  Calendar,
  Plus,
  CreditCard,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface QRWalletSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QRWalletSheet({ isOpen, onClose }: QRWalletSheetProps) {
  const { gymPasses, eventPasses, isLoading, totalPasses, hasOnlyOnePass, singlePass } = useQRWallet();
  const { cards: externalCards, isLoading: externalLoading, deleteCard } = useExternalGymCards();
  const [selectedPass, setSelectedPass] = useState<GymPass | EventPass | null>(null);
  const [selectedExternalCard, setSelectedExternalCard] = useState<ExternalGymCard | null>(null);
  const [showAddExternal, setShowAddExternal] = useState(false);
  const [userNavigatedBack, setUserNavigatedBack] = useState(false);

  const isGymPass = (pass: GymPass | EventPass): pass is GymPass => {
    return "gymName" in pass;
  };

  const maskNumber = (num: string) => {
    if (num.length <= 4) return num;
    return "••••" + num.slice(-4);
  };

  const handleDeleteExternalCard = async (cardId: string) => {
    try {
      await deleteCard(cardId);
      setSelectedExternalCard(null);
      toast.success("External card removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const allLoading = isLoading || externalLoading;
  const allGymCount = gymPasses.length + externalCards.length;
  const totalAll = totalPasses + externalCards.length;

  const getDefaultTab = () => {
    if (allGymCount > 0) return "gym";
    return "events";
  };

  const renderPassList = () => {
    if (totalAll === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Trophy className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-lg mb-2">No Active Passes</h3>
          <p className="text-muted-foreground text-sm max-w-xs mb-4">
            Your gym memberships and event passes will appear here when available.
          </p>
          <Button variant="outline" onClick={() => setShowAddExternal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Gym Card
          </Button>
        </div>
      );
    }

    return (
      <Tabs defaultValue={getDefaultTab()} className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-4 bg-muted/80">
          <TabsTrigger value="gym" className="gap-1.5 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            Gym ({allGymCount})
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-1.5 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground">
            <Trophy className="h-3.5 w-3.5" />
            Events ({eventPasses.length})
          </TabsTrigger>
        </TabsList>

        {/* Gym Passes (enrolled + manual) */}
        <TabsContent value="gym">
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => setShowAddExternal(true)}
              >
                <Plus className="h-4 w-4" />
                Add Gym Card
              </Button>

              {/* Enrolled gym passes */}
              {gymPasses.map((pass) => (
                <button
                  key={pass.id}
                  onClick={() => { setSelectedPass(pass); setUserNavigatedBack(false); }}
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

              {/* External (manual) gym cards */}
              {externalCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => setSelectedExternalCard(card)}
                  className="w-full p-4 rounded-xl bg-card border border-dashed border-border hover:border-primary/50 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center border border-dashed border-border">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{card.gym_name}</p>
                          <Badge variant="muted" className="text-[10px] px-1.5 py-0">Manual</Badge>
                        </div>
                        <p className="text-sm font-mono text-muted-foreground">
                          {maskNumber(card.membership_number)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {card.submission_status === "pending" && (
                        <Badge variant="warning" className="text-xs gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Unverified
                        </Badge>
                      )}
                      {card.submission_status === "rejected" && (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          Unverified
                        </Badge>
                      )}
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              ))}

              {allGymCount === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No gym passes yet
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Event Passes */}
        <TabsContent value="events">
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {eventPasses.map((pass) => (
                <button
                  key={pass.id}
                  onClick={() => { setSelectedPass(pass); setUserNavigatedBack(false); }}
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
    const qrValue = isGym ? pass.membershipNumber : pass.passToken;

    return (
      <div className="flex flex-col items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setSelectedPass(null); setUserNavigatedBack(true); }}
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

        <div className="bg-white p-6 rounded-2xl shadow-lg mb-4">
          <QRCodeSVG
            value={qrValue}
            size={200}
            level="H"
            includeMargin
            className="rounded-lg"
          />
        </div>

        {isGym && (
          <p className="font-mono text-sm font-medium text-foreground mb-4">
            {pass.membershipNumber}
          </p>
        )}

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

  const displayPass = selectedPass || (!userNavigatedBack && hasOnlyOnePass && externalCards.length === 0 ? singlePass : null);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setUserNavigatedBack(false); } }}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              {selectedExternalCard
                ? "Manual Gym Card"
                : displayPass
                  ? isGymPass(displayPass) ? "Gym Pass" : "Event Pass"
                  : "Passes"
              }
            </SheetTitle>
          </SheetHeader>

          {allLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : selectedExternalCard ? (
            <ExternalCardQRView
              card={selectedExternalCard}
              onBack={() => setSelectedExternalCard(null)}
              onDelete={handleDeleteExternalCard}
            />
          ) : displayPass ? (
            renderQRView(displayPass)
          ) : (
            renderPassList()
          )}
        </SheetContent>
      </Sheet>

      <AddExternalCardSheet
        open={showAddExternal}
        onOpenChange={setShowAddExternal}
      />
    </>
  );
}
