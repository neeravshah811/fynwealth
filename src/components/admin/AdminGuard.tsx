
'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Loader2, ShieldAlert } from 'lucide-react';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      if (isUserLoading) return;
      
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const adminRef = collection(db, 'admins');
        const q = query(adminRef, where('email', '==', user.email), limit(1));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty || user.email === 'admin@fynwealth.com') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          router.push('/dashboard');
        }
      } catch (error: any) {
        // If check fails (e.g. permissions), only allow if super admin email
        if (user.email === 'admin@fynwealth.com') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          router.push('/dashboard');
        }
      } finally {
        setChecking(false);
      }
    }

    checkAdmin();
  }, [user, isUserLoading, db, router]);

  if (isUserLoading || checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Verifying Authorization...</p>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-destructive mb-6" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground max-w-md">
          You do not have administrative privileges to access this area.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
