import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useOfferCategories, useCreateOffer, useUpdateOffer, type Offer } from "@/hooks/useOffers";
import { Loader2 } from "lucide-react";

interface AdminOfferFormProps {
  offer?: Offer | null;
  onSuccess: () => void;
  gymId?: string; // For gym-specific offers
}

export function AdminOfferForm({ offer, onSuccess, gymId }: AdminOfferFormProps) {
  const { data: categories } = useOfferCategories();
  const { mutate: createOffer, isPending: isCreating } = useCreateOffer();
  const { mutate: updateOffer, isPending: isUpdating } = useUpdateOffer();
  
  const [formData, setFormData] = useState({
    title: offer?.title || '',
    brand_name: offer?.brand_name || '',
    description_short: offer?.description_short || '',
    description_full: offer?.description_full || '',
    offer_type: offer?.offer_type || 'code',
    discount_code: offer?.discount_code || '',
    affiliate_url: offer?.affiliate_url || '',
    category_id: offer?.category_id || '',
    scope: offer?.scope || (gymId ? 'gym' : 'global'),
    gym_id: offer?.gym_id || gymId || null,
    regions: offer?.regions?.join(', ') || '',
    starts_at: offer?.starts_at ? offer.starts_at.split('T')[0] : '',
    expires_at: offer?.expires_at ? offer.expires_at.split('T')[0] : '',
    terms_url: offer?.terms_url || '',
    featured: offer?.featured || false,
    media_logo_url: offer?.media_logo_url || '',
    media_cover_url: offer?.media_cover_url || ''
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      category_id: formData.category_id || null,
      regions: formData.regions ? formData.regions.split(',').map(r => r.trim()).filter(Boolean) : [],
      starts_at: formData.starts_at || null,
      expires_at: formData.expires_at || null,
      terms_url: formData.terms_url || null,
      discount_code: formData.discount_code || null,
      affiliate_url: formData.affiliate_url || null,
      media_logo_url: formData.media_logo_url || null,
      media_cover_url: formData.media_cover_url || null,
      description_short: formData.description_short || null,
      description_full: formData.description_full || null,
      gym_id: formData.scope === 'gym' ? formData.gym_id : null,
      offer_type: formData.offer_type as 'code' | 'affiliate' | 'both',
      scope: formData.scope as 'global' | 'gym'
    };
    
    if (offer) {
      updateOffer({ id: offer.id, ...payload }, { onSuccess });
    } else {
      createOffer(payload, { onSuccess });
    }
  };
  
  const updateField = (field: string, value: string | boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const isPending = isCreating || isUpdating;
  const isValid = formData.title && formData.brand_name;
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="20% off all orders"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand_name">Brand Name *</Label>
          <Input
            id="brand_name"
            value={formData.brand_name}
            onChange={(e) => updateField('brand_name', e.target.value)}
            placeholder="Nike"
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description_short">Short Description</Label>
        <Input
          id="description_short"
          value={formData.description_short}
          onChange={(e) => updateField('description_short', e.target.value)}
          placeholder="Brief summary of the offer"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description_full">Full Description</Label>
        <Textarea
          id="description_full"
          value={formData.description_full}
          onChange={(e) => updateField('description_full', e.target.value)}
          placeholder="Detailed description of the offer..."
          rows={3}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="offer_type">Offer Type</Label>
          <Select value={formData.offer_type} onValueChange={(v) => updateField('offer_type', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="code">Discount Code</SelectItem>
              <SelectItem value="affiliate">Affiliate Link</SelectItem>
              <SelectItem value="both">Code + Link</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category_id} onValueChange={(v) => updateField('category_id', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {(formData.offer_type === 'code' || formData.offer_type === 'both') && (
        <div className="space-y-2">
          <Label htmlFor="discount_code">Discount Code</Label>
          <Input
            id="discount_code"
            value={formData.discount_code}
            onChange={(e) => updateField('discount_code', e.target.value.toUpperCase())}
            placeholder="SAVE20"
          />
        </div>
      )}
      
      {(formData.offer_type === 'affiliate' || formData.offer_type === 'both') && (
        <div className="space-y-2">
          <Label htmlFor="affiliate_url">Affiliate URL</Label>
          <Input
            id="affiliate_url"
            type="url"
            value={formData.affiliate_url}
            onChange={(e) => updateField('affiliate_url', e.target.value)}
            placeholder="https://..."
          />
        </div>
      )}
      
      {!gymId && (
        <div className="space-y-2">
          <Label htmlFor="scope">Scope</Label>
          <Select value={formData.scope} onValueChange={(v) => updateField('scope', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Global (All Users)</SelectItem>
              <SelectItem value="gym">Gym-Specific</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="starts_at">Start Date</Label>
          <Input
            id="starts_at"
            type="date"
            value={formData.starts_at}
            onChange={(e) => updateField('starts_at', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expires_at">Expiry Date</Label>
          <Input
            id="expires_at"
            type="date"
            value={formData.expires_at}
            onChange={(e) => updateField('expires_at', e.target.value)}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="regions">Regions (comma-separated)</Label>
        <Input
          id="regions"
          value={formData.regions}
          onChange={(e) => updateField('regions', e.target.value)}
          placeholder="UK, US, EU"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="media_logo_url">Logo URL</Label>
          <Input
            id="media_logo_url"
            type="url"
            value={formData.media_logo_url}
            onChange={(e) => updateField('media_logo_url', e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="media_cover_url">Cover Image URL</Label>
          <Input
            id="media_cover_url"
            type="url"
            value={formData.media_cover_url}
            onChange={(e) => updateField('media_cover_url', e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="terms_url">Terms & Conditions URL</Label>
        <Input
          id="terms_url"
          type="url"
          value={formData.terms_url}
          onChange={(e) => updateField('terms_url', e.target.value)}
          placeholder="https://..."
        />
      </div>
      
      <div className="flex items-center justify-between">
        <Label htmlFor="featured">Featured Offer</Label>
        <Switch
          id="featured"
          checked={formData.featured}
          onCheckedChange={(v) => updateField('featured', v)}
        />
      </div>
      
      <Button type="submit" className="w-full" disabled={!isValid || isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : offer ? (
          'Update Offer'
        ) : (
          'Create Offer'
        )}
      </Button>
    </form>
  );
}
