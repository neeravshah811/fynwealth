
import type {Metadata} from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { SplashScreen } from '@/components/SplashScreen';
import { Toaster } from '@/components/ui/toaster';
import { BottomNav } from "@/components/dashboard/BottomNav";
import { SideDrawer } from "@/components/dashboard/SideDrawer";
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { TutorialTrigger } from '@/components/TutorialTrigger';
import { NotificationManager } from '@/components/NotificationManager';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FynWealth - Smart Personal Finance',
  description: 'Know Where Your Money Goes. Manage your bills, track expenses, and get AI-powered financial insights.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${poppins.variable}`}>
      <body className="font-body antialiased bg-background text-foreground" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <FirebaseClientProvider>
            <AuthGuard>
              <SplashScreen />
              <TutorialTrigger />
              <NotificationManager />
              <div className="flex flex-col min-h-screen bg-background">
                <SideDrawer />
                <main className="flex-1 pb-24 overflow-y-auto">
                  <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
                    {children}
                  </div>
                </main>
                <BottomNav />
              </div>
            </AuthGuard>
            <Toaster />
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
