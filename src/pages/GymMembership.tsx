import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  QrCode, 
  CreditCard, 
  Building2, 
  Calendar,
  ChevronRight,
  X,
  Users,
  ScanLine
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Membership {
  id: string;
  gym_id: string;
  status: string;
  tier: string;
  membership_token: string;
  next_payment_date: string | null;
  gym?: {
    name: string;
    address: string | null;
  };
}

interface Gym {
  id: string;
  name: string;
  owner_id: string;
}

export default function GymMembership() {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [ownedGyms, setOwnedGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"user" | "admin">("user");
  const [showQR, setShowQR] = useState<string | null>(null);
  const [mockMembers] = useState([
    { id: "1", name: "John Doe", tier: "Premium", status: "active" },
    { id: "2", name: "Jane Smith", tier: "Standard", status: "active" },
    { id: "3", name: "Mike Johnson", tier: "Premium", status: "inactive" },
  ]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [membershipsRes, gymsRes] = await Promise.all([
      supabase
        .from("memberships")
        .select(`
          *,
          gym:gyms(name, address)
        `)
        .eq("user_id", user.id),
      supabase.from("gyms").select("*").eq("owner_id", user.id),
    ]);

    setMemberships(membershipsRes.data || []);
    setOwnedGyms(gymsRes.data || []);
    setLoading(false);
  };

  // Generate QR code as SVG (simple representation)
  const generateQRCode = (token: string) => {
    // This is a placeholder - in production use a proper QR library
    const size = 200;
    const cells = 21;
    const cellSize = size / cells;
    
    // Simple hash-based pattern
    const pattern: boolean[][] = [];
    for (let i = 0; i < cells; i++) {
      pattern[i] = [];
      for (let j = 0; j < cells; j++) {
        const hash = (token.charCodeAt((i * cells + j) % token.length) + i * j) % 3;
        pattern[i][j] = hash === 0 || hash === 1;
      }
    }

    // Add finder patterns
    const addFinderPattern = (startX: number, startY: number) => {
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
            pattern[startY + i][startX + j] = true;
          } else {
            pattern[startY + i][startX + j] = false;
          }
        }
      }
    };

    addFinderPattern(0, 0);
    addFinderPattern(cells - 7, 0);
    addFinderPattern(0, cells - 7);

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} fill="white" />
        {pattern.map((row, i) =>
          row.map((cell, j) =>
            cell ? (
              <rect
                key={`${i}-${j}`}
                x={j * cellSize}
                y={i * cellSize}
                width={cellSize}
                height={cellSize}
                fill="black"
              />
            ) : null
          )
        )}
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-safe px-4 pb-4 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const activeMembership = memberships.find((m) => m.status === "active");

  return (
    <div className="min-h-screen pt-safe px-4 pb-24">
      {/* Header */}
      <header className="pt-6 pb-4">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight"
        >
          Gym Membership
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-muted-foreground text-sm mt-1"
        >
          Manage your gym access
        </motion.p>
      </header>

      {/* View Toggle (if gym owner) */}
      {ownedGyms.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mt-4"
        >
          <button
            onClick={() => setActiveView("user")}
            className={cn(
              "flex-1 py-2 rounded-full text-sm font-medium transition-colors",
              activeView === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            My Membership
          </button>
          <button
            onClick={() => setActiveView("admin")}
            className={cn(
              "flex-1 py-2 rounded-full text-sm font-medium transition-colors",
              activeView === "admin"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            Gym Admin
          </button>
        </motion.div>
      )}

      {/* User View */}
      {activeView === "user" && (
        <>
          {activeMembership ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-6"
            >
              {/* Membership Card */}
              <div className="gradient-card-accent rounded-xl p-5 shadow-card border border-border/50">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2",
                        activeMembership.status === "active"
                          ? "bg-primary/20 text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {activeMembership.status.toUpperCase()}
                    </span>
                    <h2 className="text-xl font-semibold">
                      {activeMembership.gym?.name || "Unknown Gym"}
                    </h2>
                    {activeMembership.gym?.address && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {activeMembership.gym.address}
                      </p>
                    )}
                  </div>
                  <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-accent-foreground" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Tier</p>
                    <p className="font-medium capitalize">{activeMembership.tier}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Next Payment</p>
                    <p className="font-medium">
                      {activeMembership.next_payment_date
                        ? format(new Date(activeMembership.next_payment_date), "MMM d, yyyy")
                        : "—"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowQR(activeMembership.membership_token)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-medium"
                >
                  <QrCode className="h-5 w-5" />
                  Show QR Code
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-6 bg-card rounded-xl p-6 shadow-card border border-border/50 text-center"
            >
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="font-semibold mb-2">No Active Membership</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Join a gym to get started with your fitness journey
              </p>
              <button className="px-6 py-2 rounded-full bg-primary text-primary-foreground font-medium">
                Find a Gym
              </button>
            </motion.div>
          )}

          {/* Past Memberships */}
          {memberships.filter((m) => m.status !== "active").length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Past Memberships
              </p>
              <div className="space-y-2">
                {memberships
                  .filter((m) => m.status !== "active")
                  .map((membership) => (
                    <div
                      key={membership.id}
                      className="bg-card rounded-xl p-4 shadow-card border border-border/50 opacity-60"
                    >
                      <p className="font-medium">{membership.gym?.name || "Unknown Gym"}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {membership.tier} · {membership.status}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Admin View */}
      {activeView === "admin" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6"
        >
          {ownedGyms.map((gym) => (
            <div key={gym.id} className="mb-6">
              <h2 className="font-semibold mb-4">{gym.name}</h2>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-left">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                    <ScanLine className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="font-medium">Scan QR</p>
                  <p className="text-xs text-muted-foreground">Check in member</p>
                </button>
                <button className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-left">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="font-medium">Manage</p>
                  <p className="text-xs text-muted-foreground">Memberships</p>
                </button>
              </div>

              {/* Members List */}
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Members
              </p>
              <div className="space-y-2">
                {mockMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between bg-card rounded-xl p-4 shadow-card border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.tier}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        member.status === "active"
                          ? "bg-primary/20 text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {member.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {ownedGyms.length === 0 && (
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 text-center">
              <p className="text-muted-foreground">You don't own any gyms</p>
            </div>
          )}
        </motion.div>
      )}

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQR && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-[69]"
              onClick={() => setShowQR(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-4 m-auto w-[90%] max-w-sm h-fit bg-card rounded-2xl z-[70] shadow-elevated p-6"
            >
              <button
                onClick={() => setShowQR(null)}
                className="absolute right-4 top-4 p-2 rounded-full bg-muted"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 className="text-lg font-semibold text-center mb-4">Check-in QR Code</h2>
              
              <div className="flex justify-center mb-4 bg-white p-4 rounded-xl">
                {generateQRCode(showQR)}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Show this to staff to check in
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
