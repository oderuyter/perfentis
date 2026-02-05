import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOfferCategories, useCreateSubmission } from "@/hooks/useOffers";
import { Loader2, Send, Building2 } from "lucide-react";

interface SupplierSubmissionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupplierSubmissionSheet({ open, onOpenChange }: SupplierSubmissionSheetProps) {
  const { data: categories } = useOfferCategories();
  const { mutate: createSubmission, isPending } = useCreateSubmission();
  
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    category_id: '',
    description: '',
    proposed_code: '',
    proposed_affiliate_url: '',
    regions: [] as string[],
    expires_at: null as string | null
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createSubmission({
      ...formData,
      category_id: formData.category_id || null,
      phone: formData.phone || null,
      website: formData.website || null,
      proposed_code: formData.proposed_code || null,
      proposed_affiliate_url: formData.proposed_affiliate_url || null,
      expires_at: formData.expires_at || null
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setFormData({
          company_name: '',
          contact_name: '',
          email: '',
          phone: '',
          website: '',
          category_id: '',
          description: '',
          proposed_code: '',
          proposed_affiliate_url: '',
          regions: [],
          expires_at: null
        });
      }
    });
  };
  
  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const isValid = formData.company_name && formData.contact_name && formData.email && formData.description;
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-auto pb-safe">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <SheetTitle>Partner With Us</SheetTitle>
              <SheetDescription>Submit your offer for review</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => updateField('company_name', e.target.value)}
                placeholder="Your company"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact Name *</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => updateField('contact_name', e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => updateField('website', e.target.value)}
              placeholder="https://yourcompany.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category_id} onValueChange={(v) => updateField('category_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Offer Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Describe your offer and what makes it special..."
              rows={4}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="proposed_code">Proposed Discount Code</Label>
              <Input
                id="proposed_code"
                value={formData.proposed_code}
                onChange={(e) => updateField('proposed_code', e.target.value.toUpperCase())}
                placeholder="SAVE20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proposed_affiliate_url">Affiliate Link</Label>
              <Input
                id="proposed_affiliate_url"
                type="url"
                value={formData.proposed_affiliate_url}
                onChange={(e) => updateField('proposed_affiliate_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="expires_at">Offer Expiry Date</Label>
            <Input
              id="expires_at"
              type="date"
              value={formData.expires_at || ''}
              onChange={(e) => updateField('expires_at', e.target.value)}
            />
          </div>
          
          <div className="pt-4">
            <Button type="submit" className="w-full" disabled={!isValid || isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit for Review
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              We'll review your submission and get back to you within 2-3 business days.
            </p>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
