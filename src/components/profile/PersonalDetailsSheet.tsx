import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, MapPin, Building2, Globe, Instagram, Youtube, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

interface PersonalDetailsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PersonalDetailsSheet({ isOpen, onClose }: PersonalDetailsSheetProps) {
  const { profile, updateProfile } = useProfile();
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    display_name: "",
    telephone: "",
    instagram_handle: "",
    tiktok_handle: "",
    youtube_handle: "",
    twitter_handle: "",
    website_url: "",
    address_line1: "",
    address_line2: "",
    address_city: "",
    address_postcode: "",
    address_country: "",
    work_company: "",
    work_address_line1: "",
    work_address_line2: "",
    work_address_city: "",
    work_address_postcode: "",
    work_address_country: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        display_name: profile.display_name || "",
        telephone: profile.telephone || "",
        instagram_handle: profile.instagram_handle || "",
        tiktok_handle: profile.tiktok_handle || "",
        youtube_handle: profile.youtube_handle || "",
        twitter_handle: profile.twitter_handle || "",
        website_url: profile.website_url || "",
        address_line1: profile.address_line1 || "",
        address_line2: profile.address_line2 || "",
        address_city: profile.address_city || "",
        address_postcode: profile.address_postcode || "",
        address_country: profile.address_country || "",
        work_company: profile.work_company || "",
        work_address_line1: profile.work_address_line1 || "",
        work_address_line2: profile.work_address_line2 || "",
        work_address_city: profile.work_address_city || "",
        work_address_postcode: profile.work_address_postcode || "",
        work_address_country: profile.work_address_country || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Validate phone number (basic validation)
      if (formData.telephone && !/^[\d\s\+\-\(\)]+$/.test(formData.telephone)) {
        toast.error("Please enter a valid phone number");
        setIsSaving(false);
        return;
      }

      await updateProfile(formData);
      toast.success("Personal details saved");
      onClose();
    } catch (error) {
      toast.error("Failed to save details");
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[130] max-h-[90vh] overflow-hidden rounded-t-2xl bg-background flex flex-col pb-bottom-nav"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Personal Details</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Basic Info */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Basic Information</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => updateField("first_name", e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      value={formData.last_name}
                      onChange={(e) => updateField("last_name", e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    value={formData.display_name}
                    onChange={(e) => updateField("display_name", e.target.value)}
                    placeholder="How you appear in the app"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => updateField("telephone", e.target.value)}
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </section>

              <Separator />

              {/* Social Handles */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <span>Social Handles (Optional)</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={formData.instagram_handle}
                      onChange={(e) => updateField("instagram_handle", e.target.value)}
                      placeholder="@username"
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                    </svg>
                    <Input
                      value={formData.tiktok_handle}
                      onChange={(e) => updateField("tiktok_handle", e.target.value)}
                      placeholder="@username"
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={formData.youtube_handle}
                      onChange={(e) => updateField("youtube_handle", e.target.value)}
                      placeholder="@channel"
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Twitter className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={formData.twitter_handle}
                      onChange={(e) => updateField("twitter_handle", e.target.value)}
                      placeholder="@username"
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={formData.website_url}
                      onChange={(e) => updateField("website_url", e.target.value)}
                      placeholder="https://yourwebsite.com"
                      className="flex-1"
                    />
                  </div>
                </div>
              </section>

              <Separator />

              {/* Home Address */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Home Address</span>
                </div>

                <div className="space-y-3">
                  <Input
                    value={formData.address_line1}
                    onChange={(e) => updateField("address_line1", e.target.value)}
                    placeholder="Address Line 1"
                  />
                  <Input
                    value={formData.address_line2}
                    onChange={(e) => updateField("address_line2", e.target.value)}
                    placeholder="Address Line 2"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={formData.address_city}
                      onChange={(e) => updateField("address_city", e.target.value)}
                      placeholder="City"
                    />
                    <Input
                      value={formData.address_postcode}
                      onChange={(e) => updateField("address_postcode", e.target.value)}
                      placeholder="Postcode"
                    />
                  </div>
                  <Input
                    value={formData.address_country}
                    onChange={(e) => updateField("address_country", e.target.value)}
                    placeholder="Country"
                  />
                </div>
              </section>

              <Separator />

              {/* Work Address */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>Work Address</span>
                </div>

                <div className="space-y-3">
                  <Input
                    value={formData.work_company}
                    onChange={(e) => updateField("work_company", e.target.value)}
                    placeholder="Company Name (Optional)"
                  />
                  <Input
                    value={formData.work_address_line1}
                    onChange={(e) => updateField("work_address_line1", e.target.value)}
                    placeholder="Address Line 1"
                  />
                  <Input
                    value={formData.work_address_line2}
                    onChange={(e) => updateField("work_address_line2", e.target.value)}
                    placeholder="Address Line 2"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={formData.work_address_city}
                      onChange={(e) => updateField("work_address_city", e.target.value)}
                      placeholder="City"
                    />
                    <Input
                      value={formData.work_address_postcode}
                      onChange={(e) => updateField("work_address_postcode", e.target.value)}
                      placeholder="Postcode"
                    />
                  </div>
                  <Input
                    value={formData.work_address_country}
                    onChange={(e) => updateField("work_address_country", e.target.value)}
                    placeholder="Country"
                  />
                </div>
              </section>
            </div>

            <div className="p-4 border-t bg-background">
              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
