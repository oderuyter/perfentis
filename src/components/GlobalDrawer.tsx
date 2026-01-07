import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Menu, 
  X, 
  CreditCard, 
  Users, 
  MessageCircle, 
  Trophy, 
  Settings, 
  HelpCircle,
  ChevronRight,
  Building2
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface DrawerItem {
  to: string;
  icon: React.ElementType;
  label: string;
  description?: string;
}

const drawerItems: DrawerItem[] = [
  { to: "/gym-portal", icon: Building2, label: "Gym Admin", description: "Manage your gym" },
  { to: "/gym-membership", icon: CreditCard, label: "Gym Membership", description: "Manage your gym access" },
  { to: "/find-coach", icon: Users, label: "Find a Coach", description: "Connect with coaches" },
  { to: "/social", icon: MessageCircle, label: "Social", description: "Community feed" },
  { to: "/events", icon: Trophy, label: "Events & Competitions", description: "Compete and track" },
  { to: "/profile", icon: Settings, label: "Settings", description: "App preferences" },
  { to: "/help", icon: HelpCircle, label: "Help & Support", description: "Get assistance" },
];

interface GlobalDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalDrawer({ isOpen, onOpenChange }: GlobalDrawerProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (to: string) => {
    navigate(to);
    onOpenChange(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-[60]"
            onClick={() => onOpenChange(false)}
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-[85%] max-w-sm bg-card z-[61] shadow-elevated flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 pt-safe border-b border-border">
              <h2 className="text-lg font-semibold">Menu</h2>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 -mr-2 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 overflow-y-auto p-2">
              <nav className="space-y-1">
                {drawerItems.map((item) => {
                  const isActive = location.pathname === item.to;
                  return (
                    <button
                      key={item.to}
                      onClick={() => handleNavigation(item.to)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left",
                        isActive 
                          ? "bg-accent text-accent-foreground" 
                          : "hover:bg-muted"
                      )}
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center",
                        isActive ? "bg-primary/20" : "bg-muted"
                      )}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{item.label}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border pb-safe">
              <p className="text-xs text-muted-foreground text-center">
                Flow Fitness v1.0
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function HamburgerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
