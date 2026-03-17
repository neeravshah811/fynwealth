
'use client';

import { useUser, useFirestore, useAuth } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { toast } from '@/hooks/use-toast';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isVerifyingRole, setIsVerifyingRole] = useState(true);
  const verifyAttempted = useRef(false);

  useEffect(() => {
    async function verifyRole() {
      if (isUserLoading) return;

      if (!user) {
        setIsVerifyingRole(false);
        if (pathname !== '/login') {
          router.push('/login');
        }
        return;
      }

      // Skip verification if already done for this session/user
      if (verifyAttempted.current && pathname !== '/login') {
        setIsVerifyingRole(false);
        return;
      }

      try {
        // 1. Check Blacklist (Ban logic)
        const blacklistDoc = await getDoc(doc(db, 'blacklist', user.uid));
        if (blacklistDoc.exists()) {
          await signOut(auth);
          router.push('/login');
          toast({
            variant: 'destructive',
            title: 'Session Expired',
            description: 'Your account is no longer authorized to access this platform.',
          });
          return;
        }

        // 2. Check Admin Status
        if (user.email) {
          const adminRef = collection(db, 'admins');
          const q = query(adminRef, where('email', '==', user.email), limit(1));
          const snapshot = await getDocs(q);
          const adminExists = !snapshot.empty || user.email === 'admin@fynwealth.com';
          
          verifyAttempted.current = true;

          if (pathname === '/login') {
            if (adminExists) {
              router.push('/admin-dashboard');
            } else {
              router.push('/dashboard');
            }
          }
        } else {
          // If email is missing (some anonymous logins), assume regular user
          setIsVerifyingRole(false);
          if (pathname === '/login') router.push('/dashboard');
          return;
        }
      } catch (error) {
        // Default to safe behavior on error
        if (pathname === '/login') {
          router.push('/dashboard');
        }
      } finally {
        setIsVerifyingRole(false);
      }
    }

    verifyRole();
  }, [user, isUserLoading, pathname, router, db, auth]);

  if (isUserLoading || isVerifyingRole) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Initializing Security...</p>
        </div>
      </div>
    );
  }

  // Handle standard auth redirects
  if (!user && pathname !== '/login') return null;
  if (user && pathname === '/login') return null;

  return <>{children}</>;
}
