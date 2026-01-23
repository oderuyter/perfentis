import { useState } from "react";
import { 
  MapPin, 
  Users, 
  Calendar,
  Clock,
  ExternalLink,
  Instagram,
  Globe,
  Mail,
  Phone,
  Footprints,
  Check,
  Loader2
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  RunClub, 
  useRunClubStatus, 
  applyToRunClub 
} from "@/hooks/useRunClubs";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface RunClubDetailSheetProps {
  club: RunClub | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RunClubDetailSheet({ club, isOpen, onClose }: RunClubDetailSheetProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { isMember, isOrganiser, application, isLoading, refetch } = useRunClubStatus(club?.id || null);
  
  const [activeTab, setActiveTab] = useState("overview");
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  if (!club) return null;

  const handleApply = async () => {
    if (!user) {
      toast.error("Please sign in to apply");
      return;
    }

    setIsApplying(true);
    try {
      await applyToRunClub(club.id, user.id, applicationMessage, {
        name: profile?.display_name || undefined,
        email: user.email || undefined,
        phone: profile?.telephone || undefined
      });
      toast.success("Application submitted!");
      setShowApplyForm(false);
      setApplicationMessage("");
      refetch();
    } catch (error: any) {
      console.error("Error applying:", error);
      if (error.code === "23505") {
        toast.error("You've already applied to this club");
      } else {
        toast.error("Failed to submit application");
      }
    } finally {
      setIsApplying(false);
    }
  };

  const renderStatus = () => {
    if (isLoading) return null;

    if (isMember) {
      return (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
          <Check className="h-5 w-5 text-green-600" />
          <span className="text-green-600 font-medium">You're a member</span>
        </div>
      );
    }

    if (application?.status === "pending") {
      return (
        <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
          <p className="text-yellow-600 font-medium">Application pending</p>
          <p className="text-sm text-muted-foreground mt-1">
            Submitted {new Date(application.applied_at).toLocaleDateString()}
          </p>
        </div>
      );
    }

    if (application?.status === "rejected") {
      return (
        <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
          <p className="text-red-600 font-medium">Application not approved</p>
          {application.rejection_reason && (
            <p className="text-sm text-muted-foreground mt-1">{application.rejection_reason}</p>
          )}
        </div>
      );
    }

    if (!club.applications_enabled) {
      return (
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-muted-foreground">Applications are currently closed</p>
        </div>
      );
    }

    if (showApplyForm) {
      return (
        <div className="space-y-3 p-4 bg-muted rounded-lg">
          <Textarea
            placeholder="Tell us a bit about yourself and why you'd like to join..."
            value={applicationMessage}
            onChange={(e) => setApplicationMessage(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button 
              onClick={handleApply} 
              disabled={isApplying}
              className="flex-1"
            >
              {isApplying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Application
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowApplyForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    return (
      <Button className="w-full" onClick={() => setShowApplyForm(true)}>
        Apply to Join
      </Button>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="text-left">
          <div className="flex gap-4 items-start">
            <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
              {club.logo_url ? (
                <img src={club.logo_url} alt={club.name} className="h-full w-full object-cover" />
              ) : (
                <Footprints className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl truncate">{club.name}</SheetTitle>
              {club.primary_city && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{club.primary_city}{club.primary_postcode && `, ${club.primary_postcode}`}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {club.club_style && (
                  <Badge variant="outline" className="capitalize">{club.club_style}</Badge>
                )}
                {club.membership_type === "free" ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                    Free
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    £{club.membership_fee}/{club.membership_fee_cadence}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
              <TabsTrigger value="runs" className="flex-1">Runs</TabsTrigger>
              <TabsTrigger value="events" className="flex-1">Events</TabsTrigger>
              <TabsTrigger value="membership" className="flex-1">Join</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-6">
              {/* Description */}
              {club.description && (
                <div>
                  <h3 className="font-medium mb-2">About</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{club.description}</p>
                </div>
              )}

              {/* Distances */}
              {club.distances_offered.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Distances</h3>
                  <div className="flex flex-wrap gap-2">
                    {club.distances_offered.map(d => (
                      <Badge key={d} variant="secondary">{d}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Run Days */}
              {club.days_of_week.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Run Days</h3>
                  <div className="flex flex-wrap gap-2">
                    {club.days_of_week.map(d => (
                      <Badge key={d} variant="outline">{DAYS_FULL[d]}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Pace Groups */}
              {Array.isArray(club.pace_groups) && club.pace_groups.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Pace Groups</h3>
                  <div className="space-y-2">
                    {(club.pace_groups as Array<{ name: string; pace: string }>).map((pg, i) => (
                      <div key={i} className="flex items-center justify-between bg-muted p-3 rounded-lg">
                        <span className="font-medium">{pg.name}</span>
                        <span className="text-muted-foreground">{pg.pace}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact */}
              <div>
                <h3 className="font-medium mb-2">Contact</h3>
                <div className="space-y-2">
                  {club.contact_email && (
                    <a 
                      href={`mailto:${club.contact_email}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <Mail className="h-4 w-4" />
                      {club.contact_email}
                    </a>
                  )}
                  {club.contact_phone && (
                    <a 
                      href={`tel:${club.contact_phone}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <Phone className="h-4 w-4" />
                      {club.contact_phone}
                    </a>
                  )}
                  {club.website_url && (
                    <a 
                      href={club.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <Globe className="h-4 w-4" />
                      Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {club.instagram_handle && (
                    <a 
                      href={`https://instagram.com/${club.instagram_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <Instagram className="h-4 w-4" />
                      @{club.instagram_handle}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {club.strava_club_url && (
                    <a 
                      href={club.strava_club_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                    >
                      <Footprints className="h-4 w-4" />
                      View on Strava
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="runs" className="mt-4">
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Run schedule coming soon</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Join to see the full run schedule
                </p>
              </div>
            </TabsContent>

            <TabsContent value="events" className="mt-4">
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No upcoming events</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Check back later for club events and races
                </p>
              </div>
            </TabsContent>

            <TabsContent value="membership" className="mt-4 space-y-6">
              {/* Fee */}
              <div className="p-4 bg-muted rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Membership Fee</span>
                  {club.membership_type === "free" ? (
                    <span className="text-green-600 font-semibold">Free</span>
                  ) : (
                    <span className="font-semibold">
                      £{club.membership_fee}/{club.membership_fee_cadence}
                    </span>
                  )}
                </div>
              </div>

              {/* Benefits */}
              {club.membership_benefits && (
                <div>
                  <h3 className="font-medium mb-2">What's Included</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{club.membership_benefits}</p>
                </div>
              )}

              {/* Expectations */}
              {club.membership_expectations && (
                <div>
                  <h3 className="font-medium mb-2">What We Expect</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{club.membership_expectations}</p>
                </div>
              )}

              {/* Apply CTA */}
              <div className="pt-4">
                {renderStatus()}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
