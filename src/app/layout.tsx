
import type {Metadata} from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { SplashScreen } from '@/components/SplashScreen';
import { Toaster } from '@/components/ui/toaster';
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileDialog } from "@/components/profile/ProfileDialog";
import { HelpButton } from "@/components/HelpButton";
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
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
              <SidebarProvider>
                <SplashScreen />
                <TutorialTrigger />
                <NotificationManager />
                <div className="flex min-h-screen bg-background w-full">
                  <Sidebar />
                  <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
                    <header className="h-16 border-b bg-card/50 backdrop-blur-md sticky top-0 z-30 flex items-center px-4 md:px-8 gap-4">
                      <SidebarTrigger />
                      <div className="flex-1" />
                      <div className="flex items-center gap-4">
                        <HelpButton />
                        <ThemeToggle />
                        <ProfileDialog />
                      </div>
                    </header>
                    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
                      {children}
                    </div>
                  </main>
                </div>
              </SidebarProvider>
            </AuthGuard>
            <Toaster />
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
