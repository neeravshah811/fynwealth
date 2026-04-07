'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFynWealthStore } from '@/lib/store';
import { TutorialTrigger } from '@/components/TutorialTrigger';
import { NotificationManager } from '@/components/NotificationManager';
import { SideDrawer } from "@/components/dashboard/SideDrawer";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { DataPrivacyConsent } from '@/components/DataPrivacyConsent';

/**
 * AppShell manages the visibility of the Dashboard UI elements.
 * It hides navigation, notifications, and tutorials when the user
 * is on the login page or is on administrative routes.
 * It also handles synchronization of user preferences between local store and Firestore.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const db = useFirestore();
  const { currency, setCurrency } = useFynWealthStore();
  const hasSyncedPreferences = useRef(false);

  const isLoginPage = pathname === '/login';
  const isAdminRoute = pathname.startsWith('/admin-dashboard');
  
  const showDashboardShell = user && !isLoginPage && !isAdminRoute;

  // Preference Synchronization Logic
  useEffect(() => {
    if (!user?.uid || !db || hasSyncedPreferences.current) return;

    const syncUserPreferences = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          
          // 1. If cloud has a currency and it differs from local, cloud wins
          if (data.preferredCurrency && data.preferredCurrency !== currency.code) {
            setCurrency(data.preferredCurrency);
          } 
          // 2. If cloud is missing currency but local has one, push local to cloud
          else if (!data.preferredCurrency && currency.code) {
            await updateDoc(userRef, { preferredCurrency: currency.code });
          }
          
          hasSyncedPreferences.current = true;
        }
      } catch (err) {
        console.error("Preference sync failed", err);
      }
    };

    syncUserPreferences();
  }, [user?.uid, db, currency.code, setCurrency]);

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
      <DataPrivacyConsent />
      <TutorialTrigger />
      <NotificationManager />
      
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
