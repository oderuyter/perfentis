import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { WorkoutBiscuit } from "./workout/WorkoutBiscuit";
import { GlobalDrawer, HamburgerButton } from "./GlobalDrawer";
import { useProfile } from "@/hooks/useProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Dumbbell } from "lucide-react";

interface AppLayoutProps {
  hideNav?: boolean;
}

export function AppLayout({ hideNav = false }: AppLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { profile } = useProfile();
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate("/profile");
  };

  return (
    <div className="min-h-screen gradient-page">
      {/* Global Header */}
      {!hideNav && (
        <header className="fixed top-0 left-0 right-0 z-40 pt-safe">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Left: Hamburger */}
            <HamburgerButton onClick={() => setDrawerOpen(true)} />
            
            {/* Center: Logo/Brand - Clickable to go home */}
            <button
              onClick={() => navigate("/")}
              className="absolute left-1/2 -translate-x-1/2 p-2 -m-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Go to home"
            >
              <Dumbbell className="h-6 w-6 text-white" />
            </button>
            
            {/* Right: Profile Avatar */}
            <button
              onClick={handleProfileClick}
              className="relative rounded-full ring-2 ring-border/40 ring-offset-2 ring-offset-background hover:ring-primary/50 transition-all"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={profile?.avatar_url || undefined} alt="Profile" />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </header>
      )}

      <main className={hideNav ? "" : "pt-16 pb-28"}>
        <Outlet />
      </main>
      
      {!hideNav && (
        <>
          <WorkoutBiscuit />
          <BottomNav />
          <GlobalDrawer isOpen={drawerOpen} onOpenChange={setDrawerOpen} />
        </>
      )}
    </div>
  );
}
