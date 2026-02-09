import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { ExternalGymCard } from "@/hooks/useExternalGymCards";
import { ChevronLeft, Building2, AlertTriangle, ShieldAlert, Trash2 } from "lucide-react";

interface ExternalCardQRViewProps {
  card: ExternalGymCard;
  onBack: () => void;
  onDelete?: (cardId: string) => void;
}

export function ExternalCardQRView({ card, onBack, onDelete }: ExternalCardQRViewProps) {
  const statusBadge = () => {
    if (card.submission_status === "approved") {
      return card.is_enrolled ? (
        <Badge variant="default">Verified</Badge>
      ) : (
        <Badge variant="secondary" className="gap-1">
          <ShieldAlert className="h-3 w-3" />
          Gym Not Enrolled
        </Badge>
      );
    }
    if (card.submission_status === "rejected") {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Gym Not Verified
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <AlertTriangle className="h-3 w-3" />
        Unverified
      </Badge>
    );
  };

  return (
    <div className="flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Passes
        </Button>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(card.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="text-center mb-6">
        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3 border-2 border-dashed border-border">
          <Building2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg">{card.gym_name}</h3>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs font-normal">External Gym</Badge>
          {statusBadge()}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg mb-4">
        <QRCodeSVG
          value={card.membership_number}
          size={200}
          level="H"
          includeMargin
          className="rounded-lg"
        />
      </div>

      <p className="font-mono text-sm font-medium text-foreground mb-4">
        {card.membership_number}
      </p>

      {/* Disclaimer banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 max-w-xs text-center">
        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground text-left">
          This gym is not enrolled in the platform. QR acceptance is not guaranteed and may not be supported.
        </p>
      </div>
    </div>
  );
}
