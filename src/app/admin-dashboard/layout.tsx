'use client';

import { AdminGuard } from '@/components/admin/AdminGuard';
import { useUser, useAuth, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { useFynWealthStore } from '@/lib/store';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut, 
  Search,
  Bell,
  Menu,
  Calendar as CalendarIcon,
  MessageSquare,
  Clock,
  CheckCircle2,
  Mail,
  SunMoon
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const auth = useAuth();
  const { setTutorialCompleted } = useFynWealthStore();
  const [adminDate, setAdminDate] = useState<Date | undefined>(new Date());

  // Notification Fetching (Feature Requests)
  const notificationsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'featureRequests'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
  }, [db]);

  const { data: notifications } = useCollection(notificationsQuery);
  const unreadCount = notifications?.filter(n => n.status === 'pending').length || 0;

  const handleLogout = async () => {
    setTutorialCompleted(false);
    await signOut(auth);
    router.push('/login');
  };

  const handleMarkRead = (id: string) => {
    const docRef = doc(db, 'featureRequests', id);
    updateDoc(docRef, { status: 'read' })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: { status: 'read' }
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const markAllAsRead = () => {
    if (!notifications) return;
    const pending = notifications.filter(n => n.status === 'pending');
    
    if (pending.length === 0) return;

    pending.forEach((n) => {
      const docRef = doc(db, 'featureRequests', n.id);
      updateDoc(docRef, { status: 'read' })
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: { status: 'read' }
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        });
    });

    toast({ title: "Inbox Cleared", description: "All notifications marked as read." });
  };

  const navItems = [
    { name: 'Dashboard', href: '/admin-dashboard', icon: LayoutDashboard },
    { name: 'Users', href: '/admin-dashboard/users', icon: Users },
    { name: 'Analytics', href: '/admin-dashboard/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/admin-dashboard/settings', icon: Settings },
  ];

  const AdminNav = () => (
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
  );

  const AdminFooter = () => (
    <div className="p-4 border-t bg-muted/10 space-y-4">
      <div className="flex items-center justify-between px-2">
        <ThemeToggle />
        <span className="text-[9px] font-bold text-muted-foreground uppercase">System Theme</span>
      </div>
      <Button 
        variant="ghost" 
        className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-bold text-xs uppercase tracking-widest"
        onClick={handleLogout}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );

  return (
    <AdminGuard>
      <div className="flex h-screen bg-[#F8F9FC] dark:bg-background overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="w-64 border-r bg-white dark:bg-card hidden md:flex flex-col shadow-sm z-20">
          <div className="p-6 border-b flex items-center gap-3">
            <Logo className="scale-90 origin-left" />
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-tighter">Admin</span>
          </div>
          
          <AdminNav />
          <AdminFooter />
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="h-16 border-b bg-white dark:bg-card px-4 md:px-8 flex items-center justify-between z-10 shadow-sm">
            <div className="flex items-center flex-1 max-w-xl gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64 flex flex-col">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Admin Navigation Menu</SheetTitle>
                    <SheetDescription>Main navigation menu for administrative tasks.</SheetDescription>
                  </SheetHeader>
                  <div className="p-6 border-b flex items-center gap-3">
                    <Logo className="scale-90 origin-left" />
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-tighter">Admin</span>
                  </div>
                  <AdminNav />
                  <AdminFooter />
                </SheetContent>
              </Sheet>

              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Global user search..." 
                  className="w-full pl-10 h-10 rounded-full bg-muted/50 border-none text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <div className="flex items-center gap-1 mr-2">
                <div className="hidden sm:flex mr-1">
                  <ThemeToggle />
                </div>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary transition-colors">
                      <CalendarIcon className="w-5 h-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-2xl overflow-hidden mt-2" align="end">
                    <Calendar
                      mode="single"
                      selected={adminDate}
                      onSelect={setAdminDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary transition-colors rounded-full">
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-4 h-4 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full border-2 border-white flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 border-none shadow-2xl rounded-2xl overflow-hidden mt-2" align="end">
                    <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-widest">Notifications</h3>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{unreadCount} Unread</Badge>
                    </div>
                    <ScrollArea className="max-h-[400px]">
                      {notifications && notifications.length > 0 ? (
                        <div className="divide-y divide-black/5">
                          {notifications.map((n) => (
                            <button 
                              key={n.id} 
                              className={cn(
                                "w-full text-left p-4 hover:bg-muted/10 transition-colors flex items-start gap-3 group",
                                n.status !== 'pending' && "opacity-50 grayscale-[0.5]"
                              )}
                              onClick={() => handleMarkRead(n.id)}
                            >
                              <div className={cn(
                                "p-2 rounded-lg shrink-0 transition-colors",
                                n.status === 'pending' ? "bg-amber-100 text-amber-600" : "bg-muted text-muted-foreground"
                              )}>
                                {n.status === 'pending' ? <MessageSquare className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter flex items-center gap-1.5">
                                    <Clock className="w-3 h-3" />
                                    {formatDistanceToNow(new Date(n.timestamp))} ago
                                  </p>
                                  {n.status === 'pending' && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-foreground line-clamp-2 leading-relaxed">
                                  {n.request}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <Mail className="w-2.5 h-2.5 text-primary/50" />
                                  <p className="text-[9px] text-primary font-bold truncate">
                                    {n.email}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-12 text-center text-muted-foreground">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-3 opacity-20" />
                          <p className="text-xs font-medium italic">No new feature requests.</p>
                        </div>
                      )}
                    </ScrollArea>
                    <div className="p-3 bg-muted/10 border-t flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[10px] uppercase font-bold tracking-widest flex-1 h-9 rounded-lg"
                        onClick={markAllAsRead}
                        disabled={unreadCount === 0}
                      >
                        Mark All Read
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex items-center gap-3 pl-2 md:pl-4 border-l">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold truncate max-w-[120px]">{user?.email}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Super Admin</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shadow-inner uppercase border border-primary/20">
                  {user?.email?.[0]}
                </div>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
