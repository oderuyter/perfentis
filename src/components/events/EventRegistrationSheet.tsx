import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, User, Mail, Plus, Trash2, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Division {
  id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  team_size: number | null;
  difficulty_level: string | null;
}

interface Ticket {
  id: string;
  name: string;
  price: number | null;
  division_id: string | null;
}

interface EventRegistrationSheetProps {
  eventId: string;
  eventTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TeamMember {
  email: string;
  name: string;
}

export function EventRegistrationSheet({
  eventId,
  eventTitle,
  isOpen,
  onClose,
  onSuccess,
}: EventRegistrationSheetProps) {
  const { user } = useAuth();
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [step, setStep] = useState<"division" | "type" | "team" | "confirm">("division");
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [registrationType, setRegistrationType] = useState<"individual" | "team">("individual");
  const [teamName, setTeamName] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([{ email: "", name: "" }]);

  useEffect(() => {
    if (isOpen) {
      fetchOptions();
      resetForm();
    }
  }, [isOpen, eventId]);

  const resetForm = () => {
    setStep("division");
    setSelectedDivision(null);
    setRegistrationType("individual");
    setTeamName("");
    setTeamMembers([{ email: "", name: "" }]);
  };

  const fetchOptions = async () => {
    setIsLoading(true);
    try {
      const [divRes, ticketRes] = await Promise.all([
        supabase
          .from("event_divisions")
          .select("*")
          .eq("event_id", eventId)
          .eq("is_active", true)
          .order("display_order"),
        supabase
          .from("event_tickets")
          .select("*")
          .eq("event_id", eventId)
          .eq("is_active", true),
      ]);

      setDivisions(divRes.data || []);
      setTickets(ticketRes.data || []);
    } catch (error) {
      console.error("Error fetching options:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDivisionSelect = (division: Division) => {
    setSelectedDivision(division);
    if (division.team_size && division.team_size > 1) {
      setStep("type");
    } else {
      setRegistrationType("individual");
      setStep("confirm");
    }
  };

  const handleTypeSelect = (type: "individual" | "team") => {
    setRegistrationType(type);
    if (type === "team") {
      setStep("team");
    } else {
      setStep("confirm");
    }
  };

  const addTeamMember = () => {
    if (selectedDivision?.team_size && teamMembers.length >= (selectedDivision.team_size - 1)) {
      return;
    }
    setTeamMembers([...teamMembers, { email: "", name: "" }]);
  };

  const removeTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  const updateTeamMember = (index: number, field: keyof TeamMember, value: string) => {
    const updated = [...teamMembers];
    updated[index][field] = value;
    setTeamMembers(updated);
  };

  const handleSubmit = async () => {
    if (!user || !selectedDivision) return;

    setIsSubmitting(true);
    try {
      if (registrationType === "team") {
        // Create team
        const { data: team, error: teamError } = await supabase
          .from("event_teams")
          .insert({
            event_id: eventId,
            division_id: selectedDivision.id,
            name: teamName,
            leader_id: user.id,
            size_limit: selectedDivision.team_size,
            status: "pending",
          })
          .select()
          .single();

        if (teamError) throw teamError;

        // Create team members and invites
        const validMembers = teamMembers.filter(m => m.email.trim());
        
        for (const member of validMembers) {
          // Create team member record
          await supabase.from("event_team_members").insert({
            team_id: team.id,
            email: member.email,
            name: member.name || null,
            status: "invited",
            invited_at: new Date().toISOString(),
          });

          // Create invite
          const token = crypto.randomUUID();
          await supabase.from("event_invites").insert({
            event_id: eventId,
            team_id: team.id,
            email: member.email,
            name: member.name || null,
            invite_type: "team_member",
            token,
            invited_by: user.id,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }

        // Create registration for team leader
        await supabase.from("event_registrations").insert({
          event_id: eventId,
          user_id: user.id,
          division_id: selectedDivision.id,
          team_id: team.id,
          registration_type: "team",
          status: "confirmed",
          payment_status: "pending",
        });

        toast.success("Team registered! Invites sent to team members.");
      } else {
        // Individual registration
        const { error } = await supabase.from("event_registrations").insert({
          event_id: eventId,
          user_id: user.id,
          division_id: selectedDivision.id,
          registration_type: "individual",
          status: "confirmed",
          payment_status: "pending",
        });

        if (error) throw error;
        toast.success("Successfully registered!");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to register");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[71]"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-[72] shadow-elevated max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-semibold">Register</h2>
            <p className="text-sm text-muted-foreground">{eventTitle}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {/* Step: Division */}
              {step === "division" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-4">Select your division</p>
                  {divisions.map((division) => (
                    <button
                      key={division.id}
                      onClick={() => handleDivisionSelect(division)}
                      className="w-full bg-muted rounded-xl p-4 text-left hover:bg-muted/80 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{division.name}</p>
                        {division.difficulty_level && (
                          <span className="text-xs px-2 py-0.5 bg-background rounded-full">
                            {division.difficulty_level}
                          </span>
                        )}
                      </div>
                      {division.description && (
                        <p className="text-sm text-muted-foreground mt-1">{division.description}</p>
                      )}
                      {division.team_size && division.team_size > 1 && (
                        <p className="text-xs text-accent mt-2">Team of {division.team_size}</p>
                      )}
                    </button>
                  ))}
                  {divisions.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No divisions available
                    </p>
                  )}
                </div>
              )}

              {/* Step: Type */}
              {step === "type" && (
                <div className="space-y-3">
                  <button
                    onClick={() => setStep("division")}
                    className="text-sm text-muted-foreground hover:text-foreground mb-2"
                  >
                    ← Back
                  </button>
                  <p className="text-sm text-muted-foreground mb-4">How are you registering?</p>
                  <button
                    onClick={() => handleTypeSelect("individual")}
                    className="w-full bg-muted rounded-xl p-4 text-left hover:bg-muted/80 transition-colors flex items-center gap-3"
                  >
                    <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">Individual</p>
                      <p className="text-sm text-muted-foreground">Register by yourself</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleTypeSelect("team")}
                    className="w-full bg-muted rounded-xl p-4 text-left hover:bg-muted/80 transition-colors flex items-center gap-3"
                  >
                    <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">Team</p>
                      <p className="text-sm text-muted-foreground">
                        Create a team and invite members
                      </p>
                    </div>
                  </button>
                </div>
              )}

              {/* Step: Team */}
              {step === "team" && (
                <div className="space-y-4">
                  <button
                    onClick={() => setStep("type")}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    ← Back
                  </button>

                  <div className="space-y-2">
                    <Label>Team Name</Label>
                    <Input
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Enter team name"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Team Members</Label>
                      <span className="text-xs text-muted-foreground">
                        {teamMembers.length} / {(selectedDivision?.team_size || 2) - 1}
                      </span>
                    </div>
                    
                    {teamMembers.map((member, index) => (
                      <div key={index} className="flex gap-2">
                        <div className="flex-1 space-y-2">
                          <Input
                            type="email"
                            value={member.email}
                            onChange={(e) => updateTeamMember(index, "email", e.target.value)}
                            placeholder="Email address"
                          />
                          <Input
                            value={member.name}
                            onChange={(e) => updateTeamMember(index, "name", e.target.value)}
                            placeholder="Name (optional)"
                          />
                        </div>
                        {teamMembers.length > 1 && (
                          <button
                            onClick={() => removeTeamMember(index)}
                            className="p-2 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}

                    {(!selectedDivision?.team_size || teamMembers.length < (selectedDivision.team_size - 1)) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addTeamMember}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Member
                      </Button>
                    )}
                  </div>

                  <Button
                    onClick={() => setStep("confirm")}
                    disabled={!teamName.trim()}
                    className="w-full mt-4"
                  >
                    Continue
                  </Button>
                </div>
              )}

              {/* Step: Confirm */}
              {step === "confirm" && (
                <div className="space-y-4">
                  <button
                    onClick={() => setStep(registrationType === "team" ? "team" : "division")}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    ← Back
                  </button>

                  <div className="bg-muted rounded-xl p-4 space-y-3">
                    <h3 className="font-medium">Registration Summary</h3>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Division</span>
                      <span>{selectedDivision?.name}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Type</span>
                      <span className="capitalize">{registrationType}</span>
                    </div>

                    {registrationType === "team" && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Team Name</span>
                          <span>{teamName}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Team Members</span>
                          <ul className="mt-1 space-y-1">
                            {teamMembers.filter(m => m.email).map((m, i) => (
                              <li key={i} className="text-xs">{m.name || m.email}</li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="bg-accent/10 rounded-xl p-3 text-center text-sm">
                    <p className="text-muted-foreground">Payment placeholder</p>
                    <p className="font-medium">FREE (Demo Mode)</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {step === "confirm" && (
          <div className="flex-shrink-0 p-4 border-t border-border pb-safe">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Confirm Registration
            </Button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
