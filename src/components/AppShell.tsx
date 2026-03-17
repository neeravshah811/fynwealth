'use client';

import { usePathname } from 'next/navigation';
import { useUser } from '@/firebase';
import { SplashScreen } from '@/components/SplashScreen';
import { TutorialTrigger } from '@/components/TutorialTrigger';
import { NotificationManager } from '@/components/NotificationManager';
import { SideDrawer } from "@/components/dashboard/SideDrawer";
import { BottomNav } from "@/components/dashboard/BottomNav";

/**
 * AppShell manages the visibility of the Dashboard UI elements.
 * It hides navigation, notifications, and tutorials when the user
 * is on the login page or is on administrative routes.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();

  const isLoginPage = pathname === '/login';
  const isAdminRoute = pathname.startsWith('/admin-dashboard');
  
  // Navigation elements should only show if we have a user and aren't on the gate (login page)
  // We also skip consumer navigation for admin-specific routes
  const showDashboardShell = user && !isLoginPage && !isAdminRoute;

  // For Admin routes or Login page, we render a simpler shell without consumer nav
  if (!showDashboardShell) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Background logic still runs if authenticated */}
        {user && <SplashScreen />}
        <main className="flex-1 w-full">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Background App Logic & Initial Entry Animations */}
      <SplashScreen />
      <TutorialTrigger />
      <NotificationManager />
      
      {/* Structural Navigation */}
      <SideDrawer />
      
      <main className="flex-1 pb-24 overflow-y-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
}
