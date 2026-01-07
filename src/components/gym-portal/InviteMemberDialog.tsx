import { useState } from "react";
import { Mail, User, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMembershipLevels, useGymInvitations } from "@/hooks/useGymInvitations";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gymId: string;
  onSuccess?: () => void;
}

export function InviteMemberDialog({ 
  open, 
  onOpenChange, 
  gymId,
  onSuccess 
}: InviteMemberDialogProps) {
  const { activeLevels, isLoading: levelsLoading } = useMembershipLevels(gymId);
  const { sendInvitation } = useGymInvitations(gymId);
  
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [membershipLevelId, setMembershipLevelId] = useState<string>("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSending(true);
    try {
      await sendInvitation({
        email,
        name: name || undefined,
        membershipLevelId: membershipLevelId || undefined
      });
      
      // Reset form
      setEmail("");
      setName("");
      setMembershipLevelId("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Error is already handled in hook
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Send an invitation email to join your gym.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="member@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="level">Membership Level</Label>
            <Select value={membershipLevelId} onValueChange={setMembershipLevelId}>
              <SelectTrigger>
                <SelectValue placeholder={levelsLoading ? "Loading..." : "Select a level"} />
              </SelectTrigger>
              <SelectContent>
                {activeLevels.map((level) => (
                  <SelectItem key={level.id} value={level.id}>
                    {level.name}
                    {level.price && ` - $${level.price}/${level.billing_cycle || 'mo'}`}
                  </SelectItem>
                ))}
                {activeLevels.length === 0 && !levelsLoading && (
                  <SelectItem value="none" disabled>
                    No membership levels configured
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {activeLevels.length === 0 
                ? "Configure membership levels in Settings → Membership Levels"
                : "The selected level will be assigned when they accept"}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!email || isSending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send Invitation
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
