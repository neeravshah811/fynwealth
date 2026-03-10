
'use client';

import { AdminGuard } from '@/components/admin/AdminGuard';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut, 
  User as UserIcon,
  Search,
  Bell
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const auth = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const navItems = [
    { name: 'Dashboard', href: '/admin-dashboard', icon: LayoutDashboard },
    { name: 'Users', href: '/admin-dashboard/users', icon: Users },
    { name: 'Analytics', href: '/admin-dashboard/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/admin-dashboard/settings', icon: Settings },
  ];

  return (
    <AdminGuard>
      <div className="flex h-screen bg-[#F8F9FC] dark:bg-background overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-white dark:bg-card flex flex-col shadow-sm z-20">
          <div className="p-6 border-b flex items-center gap-3">
            <Logo className="scale-90 origin-left" />
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-tighter">Admin</span>
          </div>
          
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 mb-4 mt-2">Main Menu</p>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all group",
                  pathname === item.href 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <item.icon className={cn("w-4 h-4", pathname === item.href ? "text-white" : "text-muted-foreground group-hover:text-primary")} />
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t bg-muted/10">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-bold text-xs uppercase tracking-widest"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="h-16 border-b bg-white dark:bg-card px-8 flex items-center justify-between z-10 shadow-sm">
            <div className="flex items-center flex-1 max-w-xl">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Global user search..." 
                  className="w-full pl-10 h-10 rounded-full bg-muted/50 border-none text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <button className="relative p-2 text-muted-foreground hover:text-primary transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border-2 border-white"></span>
              </button>
              
              <div className="flex items-center gap-3 pl-6 border-l">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold truncate max-w-[150px]">{user?.email}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Super Admin</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shadow-inner uppercase">
                  {user?.email?.[0]}
                </div>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto p-8 scrollbar-thin">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
