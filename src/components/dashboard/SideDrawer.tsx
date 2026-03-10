
"use client";

import { useState } from "react";
import { 
  Menu, 
  User, 
  Eye, 
  EyeOff, 
  Eraser, 
  Trash2, 
  LogOut, 
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFynWealthStore } from "@/lib/store";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription
} from "@/components/ui/sheet";
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
import { Logo } from "@/components/Logo";

export function SideDrawer() {
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
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsOpen(false);
      toast({ title: "Signed Out", description: "Successfully logged out." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to sign out." });
    }
  };

  const handleClearAllData = () => {
    clearAllData();
    setIsOpen(false);
    toast({ title: "System Reset", description: "All data cleared successfully." });
    window.location.reload();
  };

  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(viewYear, viewMonth));

  const initial = profile?.firstName?.[0] || user?.phoneNumber?.[2];

  return (
    <div className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-md border-b px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors">
              <Menu className="w-6 h-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 border-r-none">
            <SheetHeader className="px-6 py-8 border-b bg-primary/5">
              <div className="flex items-center justify-between mb-6">
                <Logo />
                <ThemeToggle />
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-2xl shadow-lg shadow-primary/20">
                  {initial ? initial.toUpperCase() : <User className="w-7 h-7" />}
                </div>
                <div className="min-w-0">
                  <SheetTitle className="text-lg font-headline font-bold truncate">
                    {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : "My Profile"}
                  </SheetTitle>
                  <SheetDescription className="text-xs font-medium truncate">
                    {user?.phoneNumber || "Anonymous Guest"}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex flex-col h-[calc(100vh-180px)] justify-between p-6">
              <div className="space-y-6">
                <div className="bg-muted/30 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-xl", privacyMode ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary")}>
                        {privacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </div>
                      <div>
                        <Label htmlFor="privacy-toggle-drawer" className="font-bold text-sm block">Privacy Mode</Label>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Hide Balances</p>
                      </div>
                    </div>
                    <Switch 
                      id="privacy-toggle-drawer"
                      checked={privacyMode}
                      onCheckedChange={togglePrivacyMode}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-2">Maintenance</p>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                        <div className="flex items-center gap-3 text-amber-600">
                          <Eraser className="w-5 h-5" />
                          <span className="text-sm font-bold">Clear Monthly Data</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear {monthName} Data?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove all expenses for {monthName} {viewYear}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { clearMonthlyExpenses(); setIsOpen(false); }} className="bg-amber-600">
                          Clear Data
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                        <div className="flex items-center gap-3 text-destructive">
                          <Trash2 className="w-5 h-5" />
                          <span className="text-sm font-bold">Reset App Data</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Permanent Reset?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete ALL data. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearAllData} className="bg-destructive">
                          Reset Everything
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full p-4 rounded-2xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors font-bold text-sm"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">FynWealth v1.0.0</p>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Logo className="hidden sm:flex" />
      </div>

      <div className="flex items-center gap-2">
        {profile?.firstName && (
          <div className="px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-bold text-primary uppercase">{profile.firstName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
