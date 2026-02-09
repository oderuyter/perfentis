import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useExternalGymCards } from "@/hooks/useExternalGymCards";
import { toast } from "sonner";
import { Scanner } from "@yudiel/react-qr-scanner";
import {
  Keyboard,
  ScanLine,
  ChevronLeft,
  AlertTriangle,
  Camera,
  Check,
} from "lucide-react";

interface AddExternalCardSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "choose" | "manual" | "scan" | "scan-confirm";

export function AddExternalCardSheet({ open, onOpenChange }: AddExternalCardSheetProps) {
  const { canAddCard, remainingSlots, maxCards, addCard } = useExternalGymCards();
  const [step, setStep] = useState<Step>("choose");
  const [isSaving, setIsSaving] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);

  // Form fields
  const [gymName, setGymName] = useState("");
  const [membershipNumber, setMembershipNumber] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [source, setSource] = useState<"manual" | "scanned">("manual");

  const resetForm = () => {
    setStep("choose");
    setGymName("");
    setMembershipNumber("");
    setContactEmail("");
    setContactPhone("");
    setAddress("");
    setWebsite("");
    setSource("manual");
    setScannerActive(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleScanResult = (result: string) => {
    setScannerActive(false);
    setMembershipNumber(result);
    setSource("scanned");
    setStep("scan-confirm");
  };

  const isFormValid = () => {
    if (!gymName.trim() || !membershipNumber.trim()) return false;
    if (!contactEmail.trim() && !contactPhone.trim()) return false;
    return true;
  };

  const handleSave = async () => {
    if (!isFormValid()) return;
    setIsSaving(true);

    try {
      await addCard({
        gym_name: gymName,
        membership_number: membershipNumber,
        source,
        contact_email: contactEmail || undefined,
        contact_phone: contactPhone || undefined,
        address: address || undefined,
        website: website || undefined,
      });
      toast.success("External gym card added!");
      handleClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to add card");
    } finally {
      setIsSaving(false);
    }
  };

  const renderChooseStep = () => (
    <div className="space-y-4">
      {!canAddCard ? (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Limit Reached</p>
            <p className="text-sm text-muted-foreground mt-1">
              You can have a maximum of {maxCards} external gym cards. Delete an existing card to add a new one.
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Add a membership card for a gym not on the platform. You can enter your details manually or scan an existing card.
          </p>
          <Badge variant="secondary" className="font-normal">
            {remainingSlots} of {maxCards} slots remaining
          </Badge>

          <div className="grid gap-3 mt-2">
            <button
              onClick={() => { setSource("manual"); setStep("manual"); }}
              className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all text-left"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Keyboard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Enter Details Manually</p>
                <p className="text-sm text-muted-foreground">Type your gym name and membership number</p>
              </div>
            </button>

            <button
              onClick={() => { setSource("scanned"); setScannerActive(true); setStep("scan"); }}
              className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all text-left"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ScanLine className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Scan Existing Card</p>
                <p className="text-sm text-muted-foreground">Scan a QR code or barcode from your card</p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderScanStep = () => (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => { setScannerActive(false); setStep("choose"); }} className="-ml-2">
        <ChevronLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <div className="rounded-xl overflow-hidden border border-border bg-black aspect-square max-h-[300px]">
        {scannerActive && (
          <Scanner
            onScan={(result) => {
              if (result && result.length > 0 && result[0].rawValue) {
                handleScanResult(result[0].rawValue);
              }
            }}
            onError={(err) => {
              console.error("Scanner error:", err);
              toast.error("Camera error. Please try manual entry.");
              setStep("choose");
            }}
            styles={{ container: { width: "100%", height: "100%" } }}
          />
        )}
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
        <Camera className="h-4 w-4 text-muted-foreground mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Point your camera at the QR code or barcode on your gym membership card.
        </p>
      </div>

      <Button variant="outline" className="w-full" onClick={() => { setScannerActive(false); setSource("manual"); setStep("manual"); }}>
        Enter manually instead
      </Button>
    </div>
  );

  const renderFormFields = () => (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => { setStep("choose"); setScannerActive(false); }} className="-ml-2">
        <ChevronLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      {source === "scanned" && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <Check className="h-4 w-4 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium">Scanned Successfully</p>
            <p className="text-xs text-muted-foreground">
              Scanned codes may include extra data. Please confirm your membership number below.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gym Information</p>
        <div>
          <Label htmlFor="gymName">Gym Name *</Label>
          <Input id="gymName" value={gymName} onChange={(e) => setGymName(e.target.value)} placeholder="e.g. PureGym Manchester" />
        </div>
        <div>
          <Label htmlFor="membershipNumber">Membership Number *</Label>
          <Input id="membershipNumber" value={membershipNumber} onChange={(e) => setMembershipNumber(e.target.value)} placeholder="e.g. MEM-12345" className="font-mono" />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gym Contact Details</p>
        <p className="text-xs text-muted-foreground">At least email or phone is required so we can verify this gym.</p>
        <div>
          <Label htmlFor="contactEmail">Email</Label>
          <Input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="info@gym.com" />
        </div>
        <div>
          <Label htmlFor="contactPhone">Phone</Label>
          <Input id="contactPhone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+44 7..." />
        </div>
        <div>
          <Label htmlFor="address">Address (min. city + country)</Label>
          <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Manchester, UK" />
        </div>
        <div>
          <Label htmlFor="website">Website (optional)</Label>
          <Input id="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
        </div>
      </div>

      <Button className="w-full" disabled={!isFormValid() || isSaving} onClick={handleSave}>
        {isSaving ? "Saving..." : "Add External Card"}
      </Button>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(true); }}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl overflow-y-auto pb-24">
        <SheetHeader className="mb-4">
          <SheetTitle>
            {step === "choose" && "Add External Gym Card"}
            {step === "manual" && "Enter Card Details"}
            {step === "scan" && "Scan Your Card"}
            {step === "scan-confirm" && "Confirm Scanned Details"}
          </SheetTitle>
        </SheetHeader>

        {step === "choose" && renderChooseStep()}
        {step === "scan" && renderScanStep()}
        {(step === "manual" || step === "scan-confirm") && renderFormFields()}
      </SheetContent>
    </Sheet>
  );
}
