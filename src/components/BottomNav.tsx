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
    <nav className="fixed bottom-0 left-0 right-0 z-footer">
      {/* Solid surface container - no excessive blur/glow */}
      <div className="footer-surface pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="relative flex flex-col items-center justify-center flex-1 h-full py-2"
              >
                <div className="relative flex flex-col items-center">
                  {/* Active background pill - subtle */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-bg"
                      className="absolute -inset-x-3 -inset-y-1.5 rounded-xl bg-primary/10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  
                  {/* Icon */}
                  <div className="relative">
                    <item.icon
                      className={cn(
                        "relative h-5 w-5 transition-colors duration-200",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground/70"
                      )}
                      strokeWidth={isActive ? 2.25 : 1.75}
                    />
                  </div>
                  
                  {/* Label */}
                  <span
                    className={cn(
                      "mt-1.5 text-[10px] font-medium transition-colors duration-200",
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
