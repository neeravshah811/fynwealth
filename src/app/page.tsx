
'use client';

import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function handleRedirect() {
      if (isUserLoading) return;

      if (!user) {
        router.push('/login');
        return;
      }

      try {
        // Super admin bypass
        if (user.email === 'admin@fynwealth.com') {
          router.push('/admin-dashboard');
          return;
        }

        // Check Firestore admins collection
        const adminRef = collection(db, 'admins');
        const q = query(adminRef, where('email', '==', user.email), limit(1));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          router.push('/admin-dashboard');
        } else {
          router.push('/dashboard');
        }
      } catch (error) {
        // Default to user dashboard on error or if admins collection doesn't exist
        router.push('/dashboard');
      } finally {
        setChecking(false);
      }
    }

    handleRedirect();
  }, [user, isUserLoading, router, db]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Initializing FynWealth...</p>
      </div>
    </div>
  );
}
