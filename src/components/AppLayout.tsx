import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";

interface AppLayoutProps {
  hideNav?: boolean;
}

export function AppLayout({ hideNav = false }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <main className={hideNav ? "" : "pb-22"}>
        <Outlet />
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
