
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
  Coins
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFynWealthStore, SUPPORTED_CURRENCIES } from "@/lib/store";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    viewYear,
    currency,
    setCurrency
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
    <div className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-md border-b px-4 h-14 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors shadow-sm">
              <Menu className="w-6 h-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] p-0 border-r-none flex flex-col">
            <SheetHeader className="px-6 py-8 border-b bg-primary/5">
              <div className="flex items-center justify-between mb-6">
                <Logo className="scale-100 origin-left" />
                <ThemeToggle />
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-2xl shadow-md">
                  {initial ? initial.toUpperCase() : <User className="w-7 h-7" />}
                </div>
                <div className="min-w-0">
                  <SheetTitle className="text-base font-headline font-bold truncate">
                    {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : "My Profile"}
                  </SheetTitle>
                  <SheetDescription className="text-xs font-medium truncate opacity-70">
                    {user?.phoneNumber || "Anonymous Guest"}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex flex-col flex-1 justify-between p-5 overflow-y-auto">
              <div className="space-y-6">
                <div className="space-y-4">
                  <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">Preferences</p>
                  
                  <div className="bg-muted/30 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", privacyMode ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary")}>
                          {privacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </div>
                        <div>
                          <Label htmlFor="privacy-toggle-drawer" className="font-bold text-xs md:text-sm block">Privacy Mode</Label>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Hide Figures</p>
                        </div>
                      </div>
                      <Switch 
                        id="privacy-toggle-drawer"
                        checked={privacyMode}
                        onCheckedChange={togglePrivacyMode}
                        className="scale-90"
                      />
                    </div>
                  </div>

                  <div className="bg-muted/30 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                          <Coins className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <Label className="font-bold text-xs md:text-sm block">Currency</Label>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight truncate">Display Settings</p>
                        </div>
                      </div>
                      <Select value={currency.code} onValueChange={(v) => setCurrency(v)}>
                        <SelectTrigger className="w-24 h-9 text-xs md:text-sm rounded-lg border-none bg-background shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {SUPPORTED_CURRENCIES.map(c => (
                            <SelectItem key={c.code} value={c.code} className="text-xs md:text-sm">
                              {c.code} ({c.symbol})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">Maintenance</p>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-muted/50 transition-colors group text-left">
                        <div className="flex items-center gap-3 text-amber-600">
                          <Eraser className="w-5 h-5" />
                          <span className="text-xs md:text-sm font-bold">Clear {monthName} Data</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-base md:text-lg">Clear {monthName} Data?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm">
                          This removes all expenses recorded for this specific month.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="text-sm h-10">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { clearMonthlyExpenses(); setIsOpen(false); }} className="bg-amber-600 text-sm h-10">
                          Clear Data
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-muted/50 transition-colors group text-left">
                        <div className="flex items-center gap-3 text-destructive">
                          <Trash2 className="w-5 h-5" />
                          <span className="text-xs md:text-sm font-bold">Reset App Data</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-base md:text-lg">Permanent Reset?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm">
                          This deletes everything. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="text-sm h-10">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearAllData} className="bg-destructive text-sm h-10">
                          Reset Everything
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="space-y-4 pt-6">
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full p-4 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors font-bold text-xs md:text-sm justify-center shadow-sm"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
                <div className="text-center">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">FynWealth v1.0.0</p>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Logo className="hidden sm:flex scale-100 origin-left" />
      </div>

      <div className="flex items-center gap-2">
        {profile?.firstName && (
          <div className="px-3.5 py-1.5 rounded-full bg-primary/5 border border-primary/10 flex items-center gap-2 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-tight">{profile.firstName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
