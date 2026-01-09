import { useState } from "react";
import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { WorkoutBiscuit } from "./workout/WorkoutBiscuit";
import { GlobalDrawer, HamburgerButton } from "./GlobalDrawer";

interface AppLayoutProps {
  hideNav?: boolean;
}

export function AppLayout({ hideNav = false }: AppLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen gradient-page">
      {/* Global Header with Hamburger */}
      {!hideNav && (
        <div className="fixed top-0 left-0 right-0 z-40 pt-safe">
          <div className="px-4 py-3">
            <HamburgerButton onClick={() => setDrawerOpen(true)} />
          </div>
        </div>
      )}

      <main className={hideNav ? "" : "pb-24"}>
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
