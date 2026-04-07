'use client';

import { useUser, useFirestore, useAuth } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { toast } from '@/hooks/use-toast';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard provides robust route protection and session verification.
 * It ensures authenticated users can access protected routes and unauthenticated
 * users are funneled to the login page.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isVerifyingRole, setIsVerifyingRole] = useState(true);
  const [mounted, setMounted] = useState(false);
  const verifyAttempted = useRef(false);

  useEffect(() => {
    setMounted(true);
    async function verifyRole() {
      // 1. Wait for Firebase initial auth check
      if (isUserLoading) return;

      // 2. Handle Unauthenticated Users
      if (!user) {
        setIsVerifyingRole(false);
        if (pathname !== '/login') {
          router.push('/login');
        }
        return;
      }

      // Skip verification if already completed for this specific user session
      if (verifyAttempted.current && pathname !== '/login') {
        setIsVerifyingRole(false);
        return;
      }

      try {
        // 3. Security Check: Verify Blacklist (Ban logic)
        const blacklistDoc = await getDoc(doc(db, 'blacklist', user.uid));
        if (blacklistDoc.exists()) {
          await signOut(auth);
          router.push('/login');
          toast({
            variant: 'destructive',
            title: 'Session Revoked',
            description: 'This account has been restricted by an administrator.',
          });
          return;
        }

        // 4. Role-based Routing (Admin vs User)
        if (user.email) {
          const adminRef = collection(db, 'admins');
          const q = query(adminRef, where('email', '==', user.email), limit(1));
          const snapshot = await getDocs(q);
          const isAdmin = !snapshot.empty || user.email === 'admin@fynwealth.com';
          
          verifyAttempted.current = true;

          // If user is on login page but authenticated, move them forward
          if (pathname === '/login') {
            if (isAdmin) {
              router.push('/admin-dashboard');
            } else {
              router.push('/dashboard');
            }
          }
        } else {
          // Fallback for anonymous or incomplete sessions
          setIsVerifyingRole(false);
          if (pathname === '/login') router.push('/dashboard');
          return;
        }
      } catch (error) {
        console.error("AuthGuard Verification Error:", error);
        // Fail safe: funnel to dashboard
        if (pathname === '/login') {
          router.push('/dashboard');
        }
      } finally {
        setIsVerifyingRole(false);
      }
    }

    verifyRole();
  }, [user, isUserLoading, pathname, router, db, auth]);

  // Global Loading State - with mounted check to prevent hydration mismatch
  // We return null here because the SplashScreen in layout.tsx covers the initialization phase.
  if (!mounted || isUserLoading || isVerifyingRole) {
    return null;
  }

  // Handle standard redirect edge cases
  if (!user && pathname !== '/login') return null;
  if (user && pathname === '/login') return null;

  return <>{children}</>;
}
