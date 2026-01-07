import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Building2, 
  Mail, 
  Check, 
  Loader2, 
  AlertCircle,
  LogIn,
  UserPlus
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useInvitationByToken } from "@/hooks/useGymInvitations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const { user, isLoading: authLoading } = useAuth();
  
  const { invitation, isLoading, error, acceptInvitation } = useInvitationByToken(token);
  
  const [mode, setMode] = useState<"check" | "login" | "signup">("check");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  // Pre-fill email from invitation
  useEffect(() => {
    if (invitation?.email) {
      setEmail(invitation.email);
    }
    if (invitation?.name) {
      setDisplayName(invitation.name);
    }
  }, [invitation]);

  // If user is already logged in, check if email matches
  useEffect(() => {
    if (user && invitation) {
      if (user.email?.toLowerCase() === invitation.email.toLowerCase()) {
        // Auto-accept
        handleAccept();
      } else {
        // Wrong account
        toast.error(`Please log in with ${invitation.email} to accept this invitation`);
      }
    }
  }, [user, invitation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      // After login, useEffect will handle acceptance
    } catch (err: any) {
      toast.error(err.message || "Failed to log in");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName
          }
        }
      });

      if (error) throw error;
      toast.success("Account created! You may now accept the invitation.");
      // After signup, useEffect will handle acceptance
    } catch (err: any) {
      toast.error(err.message || "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const result = await acceptInvitation();
      if (result?.gymId) {
        navigate(`/gym-membership?joined=${result.gymId}`);
      } else {
        navigate("/");
      }
    } catch (err) {
      // Error handled in hook
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-card rounded-2xl shadow-card border border-border p-8 text-center"
        >
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">Invalid Invitation</h1>
          <p className="text-muted-foreground mb-6">
            {error || "This invitation link is invalid or has expired."}
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
          >
            Go Home
          </button>
        </motion.div>
      </div>
    );
  }

  // User is logged in and email matches - show accepting state
  if (user && user.email?.toLowerCase() === invitation.email.toLowerCase()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-card rounded-2xl shadow-card border border-border p-8 text-center"
        >
          {isAccepting ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h1 className="text-2xl font-semibold mb-2">Joining {invitation.gym?.name}...</h1>
              <p className="text-muted-foreground">Setting up your membership</p>
            </>
          ) : (
            <>
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-semibold mb-2">Welcome!</h1>
              <p className="text-muted-foreground mb-6">
                You're about to join {invitation.gym?.name}
              </p>
              <button
                onClick={handleAccept}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium"
              >
                Accept & Join
              </button>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-card rounded-2xl shadow-card border border-border overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 text-center border-b border-border">
          {invitation.gym?.logo_url ? (
            <img 
              src={invitation.gym.logo_url} 
              alt={invitation.gym.name}
              className="h-16 w-16 rounded-xl mx-auto mb-4 object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          )}
          <h1 className="text-xl font-semibold">{invitation.gym?.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            You've been invited to join!
          </p>
          
          {invitation.membership_level && (
            <div className="mt-4 inline-block px-3 py-1 bg-primary/10 rounded-full">
              <span className="text-sm font-medium text-primary">
                {invitation.membership_level.name}
                {invitation.membership_level.price && 
                  ` - $${invitation.membership_level.price}/${invitation.membership_level.billing_cycle || 'mo'}`
                }
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-muted-foreground text-center mb-6">
            {mode === "check" 
              ? `This invitation was sent to ${invitation.email}` 
              : mode === "login" 
                ? "Log in to accept your invitation"
                : "Create an account to get started"
            }
          </p>

          {mode === "check" && (
            <div className="space-y-3">
              <button
                onClick={() => setMode("login")}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium"
              >
                <LogIn className="h-4 w-4" />
                I have an account
              </button>
              <button
                onClick={() => setMode("signup")}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                I'm new here
              </button>
            </div>
          )}

          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Log In & Accept
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setMode("check")}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Back
              </button>
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Your Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Create Account & Accept
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setMode("check")}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Back
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
