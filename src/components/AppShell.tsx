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
 * is on the login page or is not authenticated.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();

  const isLoginPage = pathname === '/login';
  
  // Navigation elements should only show if we have a user and aren't on the gate (login page)
  const showDashboardShell = user && !isLoginPage;

  if (!showDashboardShell) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
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
