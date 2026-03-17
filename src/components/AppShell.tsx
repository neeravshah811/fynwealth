
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
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
  const db = useFirestore();

  const isLoginPage = pathname === '/login';
  const isAdminRoute = pathname.startsWith('/admin-dashboard');
  
  // Navigation elements should only show if we have a user and aren't on the gate (login page)
  // We also skip consumer navigation for admin-specific routes
  const showDashboardShell = user && !isLoginPage && !isAdminRoute;

  // Background activity tracking
  useEffect(() => {
    if (!user?.uid || !db) return;

    const updatePresence = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { lastActive: serverTimestamp() }, { merge: true });
      } catch (err) {
        // Silent failure for presence tracking
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 5 * 60 * 1000); // Every 5 mins
    return () => clearInterval(interval);
  }, [user?.uid, db]);

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
