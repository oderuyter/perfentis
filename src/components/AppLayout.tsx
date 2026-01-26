import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { WorkoutBiscuit } from "./workout/WorkoutBiscuit";
import { GlobalDrawer, HamburgerButton } from "./GlobalDrawer";
import { useProfile } from "@/hooks/useProfile";
import { useNotifications } from "@/hooks/useNotifications";
import { useQRWallet } from "@/hooks/useQRWallet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Dumbbell, Bell, QrCode } from "lucide-react";
import { NotificationCenter } from "@/components/profile/NotificationCenter";
import { QRWalletSheet } from "@/components/wallet/QRWalletSheet";

interface AppLayoutProps {
  hideNav?: boolean;
}

export function AppLayout({ hideNav = false }: AppLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [qrWalletOpen, setQrWalletOpen] = useState(false);
  const { profile } = useProfile();
  const { unreadCount } = useNotifications();
  const { totalPasses } = useQRWallet();
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate("/profile");
  };

  return (
    <div className="min-h-screen gradient-page">
      {/* Global Header */}
      {!hideNav && (
        <header className="fixed top-0 left-0 right-0 z-40 pt-safe">
          <div className="flex items-center justify-between px-5 py-3">
            {/* Left: Hamburger */}
            <HamburgerButton onClick={() => setDrawerOpen(true)} />
            
            {/* Center: Logo/Brand - Clickable to go home */}
            <button
              onClick={() => navigate("/")}
              className="absolute left-1/2 -translate-x-1/2 p-2.5 -m-2.5 rounded-full hover:bg-white/8 transition-colors duration-200"
              aria-label="Go to home"
            >
              <Dumbbell className="h-6 w-6 text-foreground/90" />
            </button>
            
            {/* Right: QR Wallet + Notification Bell + Profile Avatar */}
            <div className="flex items-center gap-1.5">
              {/* QR Wallet Button - Only show if user has passes */}
              {totalPasses > 0 && (
                <button
                  onClick={() => setQrWalletOpen(true)}
                  className="relative p-2.5 rounded-full hover:bg-white/8 transition-colors duration-200"
                  aria-label="QR Wallet"
                >
                  <QrCode className="h-5 w-5 text-foreground/80" />
                </button>
              )}

              {/* Notification Bell */}
              <button
                onClick={() => {
                  if (unreadCount > 0) {
                    setNotificationsOpen(true);
                  } else {
                    navigate("/notifications");
                  }
                }}
                className="relative p-2.5 rounded-full hover:bg-white/8 transition-colors duration-200"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 text-foreground/80" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Profile Avatar */}
              <button
                onClick={handleProfileClick}
                className="relative ml-1 rounded-full ring-2 ring-border/30 ring-offset-2 ring-offset-transparent hover:ring-primary/40 transition-all duration-200"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile?.avatar_url || undefined} alt="Profile" />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </button>
            </div>
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

      {/* Notification Center */}
      <NotificationCenter 
        isOpen={notificationsOpen} 
        onClose={() => setNotificationsOpen(false)} 
      />

      {/* QR Wallet Sheet */}
      <QRWalletSheet
        isOpen={qrWalletOpen}
        onClose={() => setQrWalletOpen(false)}
      />
    </div>
  );
}
