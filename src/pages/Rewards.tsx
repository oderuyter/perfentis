import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Tag, ExternalLink, Lock, Copy, Gift, ChevronRight, Star, Clock, MapPin, AlertTriangle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useOffers, useOfferCategories, useHasActiveMembership, useTrackOfferEvent, type Offer } from "@/hooks/useOffers";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, isPast, isWithinInterval, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { OfferDetailSheet } from "@/components/rewards/OfferDetailSheet";
import { SupplierSubmissionSheet } from "@/components/rewards/SupplierSubmissionSheet";

export default function Rewards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeOnly, setActiveOnly] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  
  const { data: categories, isLoading: categoriesLoading } = useOfferCategories();
  const { data: hasMembership, isLoading: membershipLoading } = useHasActiveMembership();
  const { mutate: trackEvent } = useTrackOfferEvent();
  
  const { data: offers, isLoading: offersLoading } = useOffers({
    categoryId: categoryFilter !== "all" ? categoryFilter : undefined,
    offerType: typeFilter !== "all" ? typeFilter as 'code' | 'affiliate' | 'both' : undefined,
    search: search || undefined
  });
  
  const handleCopyCode = (offer: Offer) => {
    if (!hasMembership) {
      navigate('/gym-membership');
      return;
    }
    
    if (offer.discount_code) {
      navigator.clipboard.writeText(offer.discount_code);
      toast.success('Code copied to clipboard!');
      trackEvent({ offerId: offer.id, eventType: 'code_copy' });
    }
  };
  
  const handleAffiliateClick = (offer: Offer) => {
    if (offer.affiliate_url) {
      trackEvent({ offerId: offer.id, eventType: 'affiliate_click' });
      window.open(offer.affiliate_url, '_blank');
    }
  };
  
  const handleOfferClick = (offer: Offer) => {
    trackEvent({ offerId: offer.id, eventType: 'view' });
    setSelectedOffer(offer);
  };
  
  const isExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const expiry = new Date(expiresAt);
    return isWithinInterval(new Date(), { start: new Date(), end: addDays(expiry, -7) }) && !isPast(expiry);
  };
  
  const clearFilters = () => {
    setCategoryFilter("all");
    setTypeFilter("all");
    setSearch("");
  };
  
  const hasActiveFilters = categoryFilter !== "all" || typeFilter !== "all" || search.length > 0;
  
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/50">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Rewards & Discounts</h1>
              <p className="text-sm text-muted-foreground">Exclusive offers for members</p>
            </div>
            <Gift className="h-8 w-8 text-primary opacity-60" />
          </div>
          
          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search brands, offers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Filter className="h-4 w-4" />
                  {hasActiveFilters && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto max-h-[60vh]">
                <SheetHeader>
                  <SheetTitle>Filter Offers</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Offer Type</Label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="code">Discount Code</SelectItem>
                        <SelectItem value="affiliate">Affiliate Link</SelectItem>
                        <SelectItem value="both">Code + Link</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Active offers only</Label>
                    <Switch checked={activeOnly} onCheckedChange={setActiveOnly} />
                  </div>
                  
                  {hasActiveFilters && (
                    <Button variant="ghost" onClick={clearFilters} className="w-full">
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
          
          {/* Category chips */}
          {!categoriesLoading && categories && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
              <Button
                variant={categoryFilter === "all" ? "default" : "outline"}
                size="sm"
                className="rounded-full shrink-0"
                onClick={() => setCategoryFilter("all")}
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={categoryFilter === cat.id ? "default" : "outline"}
                  size="sm"
                  className="rounded-full shrink-0"
                  onClick={() => setCategoryFilter(cat.id)}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Membership status banner */}
      {!membershipLoading && !hasMembership && user && (
        <div className="mx-4 mt-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Unlock All Discount Codes</p>
                <p className="text-xs text-muted-foreground">Join any gym to reveal exclusive codes</p>
              </div>
              <Button size="sm" onClick={() => navigate('/gym-membership')}>
                Join Now
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Offers grid */}
      <div className="p-4 space-y-3">
        {offersLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </>
        ) : offers && offers.length > 0 ? (
          <>
            {/* Featured offers */}
            {offers.filter(o => o.featured).length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Featured</h2>
                {offers.filter(o => o.featured).map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    hasMembership={hasMembership}
                    onCopyCode={handleCopyCode}
                    onAffiliateClick={handleAffiliateClick}
                    onClick={() => handleOfferClick(offer)}
                    isExpiringSoon={isExpiringSoon(offer.expires_at)}
                  />
                ))}
              </div>
            )}
            
            {/* All offers */}
            <div className="space-y-2">
              {offers.filter(o => o.featured).length > 0 && (
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">All Offers</h2>
              )}
              {offers.filter(o => !o.featured).map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  hasMembership={hasMembership}
                  onCopyCode={handleCopyCode}
                  onAffiliateClick={handleAffiliateClick}
                  onClick={() => handleOfferClick(offer)}
                  isExpiringSoon={isExpiringSoon(offer.expires_at)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Gift className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-medium">No offers found</p>
            <p className="text-sm text-muted-foreground">Check back soon for new deals</p>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="mt-4">
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Partner CTA */}
      <div className="px-4 py-6">
        <Card className="bg-muted/50">
          <CardContent className="p-4 text-center">
            <h3 className="font-semibold mb-1">Are you a supplier?</h3>
            <p className="text-sm text-muted-foreground mb-3">Partner with us to offer exclusive deals</p>
            <Button variant="outline" onClick={() => setShowSubmissionForm(true)}>
              Submit an Offer
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Offer Detail Sheet */}
      <OfferDetailSheet
        offer={selectedOffer}
        open={!!selectedOffer}
        onOpenChange={(open) => !open && setSelectedOffer(null)}
        hasMembership={hasMembership}
        onCopyCode={handleCopyCode}
        onAffiliateClick={handleAffiliateClick}
      />
      
      {/* Supplier Submission Sheet */}
      <SupplierSubmissionSheet
        open={showSubmissionForm}
        onOpenChange={setShowSubmissionForm}
      />
    </div>
  );
}

interface OfferCardProps {
  offer: Offer;
  hasMembership?: boolean;
  onCopyCode: (offer: Offer) => void;
  onAffiliateClick: (offer: Offer) => void;
  onClick: () => void;
  isExpiringSoon?: boolean;
}

function OfferCard({ offer, hasMembership, onCopyCode, onAffiliateClick, onClick, isExpiringSoon }: OfferCardProps) {
  const hasCode = offer.offer_type === 'code' || offer.offer_type === 'both';
  const hasAffiliate = offer.offer_type === 'affiliate' || offer.offer_type === 'both';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
        <CardContent className="p-0">
          <div className="flex gap-3 p-4">
            {/* Logo */}
            <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
              {offer.media_logo_url ? (
                <img src={offer.media_logo_url} alt={offer.brand_name} className="h-full w-full object-cover" />
              ) : (
                <Tag className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{offer.title}</h3>
                    {offer.featured && (
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{offer.brand_name}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
              
              {/* Description */}
              {offer.description_short && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{offer.description_short}</p>
              )}
              
              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {offer.category && (
                  <Badge variant="secondary" className="text-xs">{offer.category.name}</Badge>
                )}
                {offer.scope === 'gym' && offer.gym && (
                  <Badge variant="outline" className="text-xs">{offer.gym.name}</Badge>
                )}
                {isExpiringSoon && (
                  <Badge variant="destructive" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Expiring soon
                  </Badge>
                )}
                {offer.regions && offer.regions.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <MapPin className="h-3 w-3 mr-0.5" />
                    {offer.regions[0]}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex border-t border-border/50">
            {hasCode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyCode(offer);
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
                  hasMembership 
                    ? "hover:bg-muted text-foreground" 
                    : "text-muted-foreground bg-muted/50"
                )}
              >
                {hasMembership ? (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Code
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Join to Unlock
                  </>
                )}
              </button>
            )}
            {hasAffiliate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAffiliateClick(offer);
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium hover:bg-muted transition-colors",
                  hasCode && "border-l border-border/50"
                )}
              >
                <ExternalLink className="h-4 w-4" />
                Shop Now
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
