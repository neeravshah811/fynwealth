
'use client';

import { useUser, useFirestore } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isVerifyingRole, setIsVerifyingRole] = useState(true);

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

      // Check if user is an admin
      try {
        const adminRef = collection(db, 'admins');
        const q = query(adminRef, where('email', '==', user.email), limit(1));
        const snapshot = await getDocs(q);
        const adminExists = !snapshot.empty || user.email === 'admin@fynwealth.com';
        
        setIsAdmin(adminExists);

        if (pathname === '/login') {
          if (adminExists) {
            router.push('/admin-dashboard');
          } else {
            router.push('/dashboard');
          }
        }
      } catch (error) {
        // Silent catch for role check: If query fails, assume they are a regular user
        // unless they are the hardcoded super admin email.
        const isSuperAdmin = user.email === 'admin@fynwealth.com';
        setIsAdmin(isSuperAdmin);
        
        if (pathname === '/login') {
          if (isSuperAdmin) {
            router.push('/admin-dashboard');
          } else {
            router.push('/dashboard');
          }
        }
      } finally {
        setIsVerifyingRole(false);
      }
    }

    verifyRole();
  }, [user, isUserLoading, pathname, router, db]);

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
