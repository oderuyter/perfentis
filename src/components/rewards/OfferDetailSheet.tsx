import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Lock, Tag, Clock, MapPin, AlertTriangle, Star, FileText } from "lucide-react";
import { format, isPast } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useTrackOfferEvent, type Offer } from "@/hooks/useOffers";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface OfferDetailSheetProps {
  offer: Offer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasMembership?: boolean;
  onCopyCode: (offer: Offer) => void;
  onAffiliateClick: (offer: Offer) => void;
}

export function OfferDetailSheet({ 
  offer, 
  open, 
  onOpenChange, 
  hasMembership, 
  onCopyCode, 
  onAffiliateClick 
}: OfferDetailSheetProps) {
  const navigate = useNavigate();
  const { mutate: trackEvent } = useTrackOfferEvent();
  
  if (!offer) return null;
  
  const hasCode = offer.offer_type === 'code' || offer.offer_type === 'both';
  const hasAffiliate = offer.offer_type === 'affiliate' || offer.offer_type === 'both';
  const isExpired = offer.expires_at ? isPast(new Date(offer.expires_at)) : false;
  
  const handleReportExpired = () => {
    if (offer) {
      trackEvent({ 
        offerId: offer.id, 
        eventType: 'report_expired',
        metadata: { reason: 'user_reported' }
      });
      toast.success('Thank you for letting us know!');
    }
  };
  
  const handleUnlockClick = () => {
    trackEvent({ offerId: offer.id, eventType: 'unlock_click' });
    navigate('/gym-membership');
    onOpenChange(false);
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl overflow-auto pb-safe">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
              {offer.media_logo_url ? (
                <img src={offer.media_logo_url} alt={offer.brand_name} className="h-full w-full object-cover" />
              ) : (
                <Tag className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-xl">{offer.title}</SheetTitle>
                {offer.featured && (
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                )}
              </div>
              <p className="text-muted-foreground">{offer.brand_name}</p>
            </div>
          </div>
        </SheetHeader>
        
        {/* Cover image */}
        {offer.media_cover_url && (
          <div className="rounded-xl overflow-hidden mb-4 -mx-6">
            <img 
              src={offer.media_cover_url} 
              alt={offer.title} 
              className="w-full h-40 object-cover"
            />
          </div>
        )}
        
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {offer.category && (
            <Badge variant="secondary">{offer.category.name}</Badge>
          )}
          {offer.scope === 'gym' && offer.gym && (
            <Badge variant="outline">{offer.gym.name} exclusive</Badge>
          )}
          {offer.expires_at && (
            <Badge variant={isExpired ? "destructive" : "outline"}>
              <Clock className="h-3 w-3 mr-1" />
              {isExpired ? 'Expired' : `Expires ${format(new Date(offer.expires_at), 'MMM d, yyyy')}`}
            </Badge>
          )}
          {offer.regions && offer.regions.length > 0 && (
            <Badge variant="outline">
              <MapPin className="h-3 w-3 mr-1" />
              {offer.regions.join(', ')}
            </Badge>
          )}
        </div>
        
        {/* Description */}
        <div className="space-y-4 mb-6">
          {offer.description_short && (
            <p className="text-lg font-medium">{offer.description_short}</p>
          )}
          {offer.description_full && (
            <p className="text-muted-foreground whitespace-pre-wrap">{offer.description_full}</p>
          )}
        </div>
        
        {/* Code reveal section */}
        {hasCode && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Discount Code
            </h3>
            {hasMembership ? (
              <div className="bg-muted rounded-xl p-4 flex items-center justify-between">
                <code className="text-lg font-mono font-bold tracking-wide">
                  {offer.discount_code}
                </code>
                <Button size="sm" onClick={() => onCopyCode(offer)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div className="bg-muted rounded-xl p-4 flex items-center justify-center blur-sm select-none">
                  <code className="text-lg font-mono font-bold tracking-wide">
                    XXXXXXXXX
                  </code>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Lock className="h-6 w-6 text-primary mb-2" />
                  <p className="font-medium text-sm">Join a gym to unlock</p>
                  <Button size="sm" className="mt-2" onClick={handleUnlockClick}>
                    Get Membership
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Affiliate link */}
        {hasAffiliate && offer.affiliate_url && (
          <Button 
            className="w-full mb-4" 
            size="lg"
            onClick={() => onAffiliateClick(offer)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Shop Now
          </Button>
        )}
        
        {/* Terms */}
        {offer.terms_url && (
          <a 
            href={offer.terms_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <FileText className="h-4 w-4" />
            View Terms & Conditions
          </a>
        )}
        
        {/* Report button */}
        <button
          onClick={handleReportExpired}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
        >
          <AlertTriangle className="h-4 w-4" />
          Report expired or broken
        </button>
      </SheetContent>
    </Sheet>
  );
}
