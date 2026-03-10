
'use client';

import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isUserLoading) {
      if (!user && pathname !== '/login') {
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push('/dashboard');
      }
    }
  }, [user, isUserLoading, pathname, router]);

  if (isUserLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Authenticating...</p>
        </div>
      </div>
    );
  }

  // If we're on the login page, we don't want to show the sidebar/header layout from RootLayout
  // So if we're on /login, we just render the children directly (which is the login page)
  // and we handle the layout redirection in RootLayout if needed, but for simplicity here:
  if (!user && pathname === '/login') {
    return <>{children}</>;
  }

  // If we are authenticated but on the login page, we're about to redirect
  if (user && pathname === '/login') {
    return null;
  }

  // If we are not authenticated and not on login, we're about to redirect
  if (!user && pathname !== '/login') {
    return null;
  }

  return <>{children}</>;
}
