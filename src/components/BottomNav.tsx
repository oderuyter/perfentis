import { Dumbbell, TrendingUp, UtensilsCrossed, Sparkles } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { to: "/train", icon: Dumbbell, label: "Train" },
  { to: "/progress", icon: TrendingUp, label: "Progress" },
  { to: "/nutrition", icon: UtensilsCrossed, label: "Nutrition" },
  { to: "/habits", icon: Sparkles, label: "Habits" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      {/* Glass background with subtle gradient */}
      <div className="mx-3 mb-2 rounded-2xl border border-border/30 bg-card/85 backdrop-blur-xl shadow-lg dark:bg-surface-card/90 dark:border-border/20">
        <div className="flex items-center justify-around h-16 px-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="relative flex flex-col items-center justify-center flex-1 h-full py-2"
              >
                <div className="relative flex flex-col items-center">
                  {/* Active background pill */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-bg"
                      className="absolute -inset-x-2 -inset-y-1 rounded-xl bg-primary/12 dark:bg-primary/15"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  
                  {/* Icon with glow effect */}
                  <div className="relative">
                    {isActive && (
                      <motion.div
                        layoutId="nav-glow"
                        className="absolute inset-0 rounded-full bg-primary/40 blur-lg scale-150"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <item.icon
                      className={cn(
                        "relative h-5 w-5 transition-colors duration-200",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground/70"
                      )}
                      strokeWidth={isActive ? 2.5 : 1.8}
                    />
                  </div>
                  
                  {/* Label */}
                  <span
                    className={cn(
                      "mt-1 text-[10px] font-medium transition-colors duration-200",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground/70"
                    )}
                  >
                    {item.label}
                  </span>
                </div>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
