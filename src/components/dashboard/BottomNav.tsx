
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Receipt, 
  PieChart, 
  Sparkles,
  Bell,
  Menu,
  User,
  Eye,
  EyeOff,
  Eraser,
  Trash2,
  LogOut,
  Settings,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFynWealthStore } from "@/lib/store";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ThemeToggle } from "@/components/ThemeToggle";

export function BottomNav() {
  const pathname = usePathname();
  const auth = useAuth();
  const { user } = useUser();
  const { 
    clearAllData, 
    clearMonthlyExpenses, 
    privacyMode, 
    togglePrivacyMode, 
    profile, 
    viewMonth, 
    viewYear 
  } = useFynWealthStore();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const navItems = [
    { name: "Overview", icon: LayoutDashboard, href: "/dashboard" },
    { name: "Reminders", icon: Bell, href: "/bills" },
    { name: "Expenses", icon: Receipt, href: "/expenses", isCenter: true },
    { name: "Budgets", icon: PieChart, href: "/budgets" },
    { name: "AI Insights", icon: Sparkles, href: "/insights" },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsSheetOpen(false);
      toast({ title: "Signed Out", description: "Successfully logged out." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to sign out." });
    }
  };

  const handleClearAllData = () => {
    clearAllData();
    setIsSheetOpen(false);
    toast({ title: "System Reset", description: "All data cleared successfully." });
    window.location.reload();
  };

  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(viewYear, viewMonth));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t shadow-[0_-8px_30px_rgb(0,0,0,0.12)] safe-area-pb">
      <div className="max-w-screen-md mx-auto px-4 h-20 flex items-center justify-between gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 transition-all group relative",
                item.isCenter ? "-mt-10" : "h-full"
              )}
            >
              {item.isCenter ? (
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-primary/30" 
                    : "bg-card border-2 border-primary/20 text-primary shadow-black/5"
                )}>
                  <item.icon className="w-7 h-7" />
                </div>
              ) : (
                <>
                  <item.icon className={cn(
                    "w-6 h-6 mb-1 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  )} />
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-tight transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  )}>
                    {item.name}
                  </span>
                </>
              )}
              {isActive && !item.isCenter && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center flex-1 h-full transition-all group">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-1 group-hover:bg-primary/20">
                <Menu className="w-5 h-5 text-primary" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground group-hover:text-primary">
                More
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-[2rem] border-none p-0 max-h-[85vh] overflow-hidden">
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mt-4 mb-2" />
            <SheetHeader className="px-8 pt-4 pb-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                    {profile?.firstName?.[0] || user?.phoneNumber?.[2] || <User className="w-6 h-6" />}
                  </div>
                  <div>
                    <SheetTitle className="text-xl font-headline font-bold">
                      {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : "My Profile"}
                    </SheetTitle>
                    <SheetDescription className="text-xs font-medium">
                      {user?.phoneNumber || "Anonymous Guest"}
                    </SheetDescription>
                  </div>
                </div>
                <ThemeToggle />
              </div>
            </SheetHeader>

            <div className="p-6 space-y-6">
              <div className="bg-muted/30 rounded-[1.5rem] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl", privacyMode ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary")}>
                      {privacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </div>
                    <div>
                      <Label htmlFor="privacy-toggle-sheet" className="font-bold text-sm block">Privacy Mode</Label>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Hide balances across dashboard</p>
                    </div>
                  </div>
                  <Switch 
                    id="privacy-toggle-sheet"
                    checked={privacyMode}
                    onCheckedChange={togglePrivacyMode}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="flex items-center gap-4 p-4 w-full rounded-2xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors text-left border border-amber-100">
                      <Eraser className="w-5 h-5" />
                      <div className="flex-1">
                        <span className="text-sm font-bold block">Clear Monthly Data</span>
                        <span className="text-[10px] uppercase font-bold tracking-tight opacity-70">Remove {monthName} records</span>
                      </div>
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear {monthName} Data?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove all expense transactions recorded for {monthName} {viewYear}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => { clearMonthlyExpenses(); setIsSheetOpen(false); }} className="bg-amber-600 rounded-xl">
                        Clear Monthly Data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="flex items-center gap-4 p-4 w-full rounded-2xl bg-destructive/5 text-destructive hover:bg-destructive/10 transition-colors text-left border border-destructive/10">
                      <Trash2 className="w-5 h-5" />
                      <div className="flex-1">
                        <span className="text-sm font-bold block">Reset App Data</span>
                        <span className="text-[10px] uppercase font-bold tracking-tight opacity-70">Wipe all history & settings</span>
                      </div>
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Permanent Reset?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete ALL data. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearAllData} className="bg-destructive rounded-xl">
                        Reset Everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-4 p-4 w-full rounded-2xl bg-muted/50 text-muted-foreground hover:bg-muted transition-colors text-left border border-muted"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-bold">Sign Out</span>
                </button>
              </div>

              <div className="pt-4 text-center">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">FynWealth Smart Finance v1.0.0</p>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
