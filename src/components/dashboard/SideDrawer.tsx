
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
            <button className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 border-r-none flex flex-col">
            <SheetHeader className="px-5 py-6 border-b bg-primary/5">
              <div className="flex items-center justify-between mb-4">
                <Logo className="scale-90 origin-left" />
                <ThemeToggle />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl shadow-md">
                  {initial ? initial.toUpperCase() : <User className="w-6 h-6" />}
                </div>
                <div className="min-w-0">
                  <SheetTitle className="text-sm font-headline font-bold truncate">
                    {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : "My Profile"}
                  </SheetTitle>
                  <SheetDescription className="text-[10px] font-medium truncate">
                    {user?.phoneNumber || "Anonymous Guest"}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex flex-col flex-1 justify-between p-4 overflow-y-auto">
              <div className="space-y-4">
                {/* Preferences Section */}
                <div className="space-y-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-1">Preferences</p>
                  
                  <div className="bg-muted/30 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg", privacyMode ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary")}>
                          {privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </div>
                        <div>
                          <Label htmlFor="privacy-toggle-drawer" className="font-bold text-[11px] block">Privacy Mode</Label>
                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight">Hide Figures</p>
                        </div>
                      </div>
                      <Switch 
                        id="privacy-toggle-drawer"
                        checked={privacyMode}
                        onCheckedChange={togglePrivacyMode}
                        className="scale-75"
                      />
                    </div>
                  </div>

                  <div className="bg-muted/30 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
                          <Coins className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <Label className="font-bold text-[11px] block">Currency</Label>
                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight truncate">Display Settings</p>
                        </div>
                      </div>
                      <Select value={currency.code} onValueChange={(v) => setCurrency(v)}>
                        <SelectTrigger className="w-20 h-8 text-[10px] rounded-lg border-none bg-background shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {SUPPORTED_CURRENCIES.map(c => (
                            <SelectItem key={c.code} value={c.code} className="text-[10px]">
                              {c.code} ({c.symbol})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-1">Maintenance</p>
                  
                  <AlertDialog>
                    <button onClick={(e) => e.stopPropagation()} className="w-full">
                      <SheetTrigger asChild>
                        <button className="flex items-center justify-between w-full p-2.5 rounded-lg hover:bg-muted/50 transition-colors group text-left">
                          <div className="flex items-center gap-2.5 text-amber-600">
                            <Eraser className="w-4 h-4" />
                            <span className="text-[11px] font-bold">Clear {monthName} Data</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </SheetTrigger>
                    </button>
                    <AlertDialogContent className="rounded-xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-sm">Clear {monthName} Data?</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs">
                          This removes all expenses recorded for this specific month.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="text-xs h-9">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { clearMonthlyExpenses(); setIsOpen(false); }} className="bg-amber-600 text-xs h-9">
                          Clear Data
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <button onClick={(e) => e.stopPropagation()} className="w-full">
                      <SheetTrigger asChild>
                        <button className="flex items-center justify-between w-full p-2.5 rounded-lg hover:bg-muted/50 transition-colors group text-left">
                          <div className="flex items-center gap-2.5 text-destructive">
                            <Trash2 className="w-4 h-4" />
                            <span className="text-[11px] font-bold">Reset App Data</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </SheetTrigger>
                    </button>
                    <AlertDialogContent className="rounded-xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-sm">Permanent Reset?</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs">
                          This deletes everything. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="text-xs h-9">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearAllData} className="bg-destructive text-xs h-9">
                          Reset Everything
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full p-3 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors font-bold text-[11px] justify-center"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
                <div className="text-center">
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">FynWealth v1.0.0</p>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Logo className="hidden sm:flex scale-90 origin-left" />
      </div>

      <div className="flex items-center gap-2">
        {profile?.firstName && (
          <div className="px-2.5 py-1 rounded-full bg-primary/5 border border-primary/10 flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-primary" />
            <span className="text-[9px] font-bold text-primary uppercase tracking-tight">{profile.firstName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
