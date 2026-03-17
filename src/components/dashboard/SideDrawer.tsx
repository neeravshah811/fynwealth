"use client";

import { useState } from "react";
import { 
  User, 
  Eye, 
  EyeOff, 
  Eraser, 
  Trash2, 
  LogOut, 
  ChevronRight,
  ShieldCheck,
  Coins,
  FileText,
  Shield,
  HelpCircle,
  Zap,
  MessageSquare,
  AlertCircle,
  MoreHorizontal,
  Calendar as CalendarIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFynWealthStore, SUPPORTED_CURRENCIES } from "@/lib/store";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { signOut } from "firebase/auth";
import { collection, addDoc, query, where, getDocs, writeBatch, doc, updateDoc } from "firebase/firestore";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { TutorialDialog } from "@/components/TutorialDialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

/**
 * SideDrawer manages the sliding dashboard content.
 * standalone: if true, renders only the button and sheet (no outer bar)
 */
export function SideDrawer({ standalone = false }: { standalone?: boolean }) {
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const { 
    clearAllData, 
    privacyMode, 
    togglePrivacyMode, 
    profile, 
    viewMonth, 
    viewYear,
    currency,
    setCurrency,
    setTutorialCompleted,
    setViewDate
  } = useFynWealthStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [legalDialog, setLegalDialog] = useState<"terms" | "privacy" | "faq" | "feature" | null>(null);
  const [featureText, setFeatureText] = useState("");
  const [isClearing, setIsClearing] = useState(false);
  const [showTutorialGlobal, setShowTutorialGlobal] = useState(false);

  const handleLogout = async () => {
    try {
      setTutorialCompleted(false);
      await signOut(auth);
      setIsOpen(false);
      toast({ title: "Signed Out", description: "Successfully logged out." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to sign out." });
    }
  };

  const handleCurrencyChange = async (v: string) => {
    setCurrency(v);
    setIsOpen(false); // Auto-close drawer on selection
    if (db && user?.uid) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { preferredCurrency: v });
      } catch (err) {
        console.error("Failed to sync currency preference", err);
      }
    }
  };

  const handleClearAllData = async () => {
    if (!db || !user?.uid) return;
    
    setIsClearing(true);
    try {
      const collectionsToClear = ['expenses', 'budgets', 'bills', 'folders'];
      const batch = writeBatch(db);
      
      for (const collName of collectionsToClear) {
        const snapshot = await getDocs(collection(db, 'users', user.uid, collName));
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
      }
      
      await batch.commit();
      clearAllData();
      setIsOpen(false);
      toast({ title: "App Reset", description: "All cloud data and local preferences have been cleared." });
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Reset Failed", description: "Could not clear all cloud data." });
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearMonthlyData = async () => {
    if (!db || !user?.uid) return;
    
    setIsClearing(true);
    try {
      const startDate = format(new Date(viewYear, viewMonth, 1), 'yyyy-MM-dd');
      const endDate = format(new Date(viewYear, viewMonth + 1, 0), 'yyyy-MM-dd');
      
      const q = query(
        collection(db, 'users', user.uid, 'expenses'),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      setIsOpen(false);
      toast({ title: "Monthly Data Cleared", description: `Successfully removed all records for ${monthName}.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to clear cloud data." });
    } finally {
      setIsClearing(false);
    }
  };

  const submitFeatureRequest = async () => {
    if (!featureText.trim()) return;
    
    const displayEmail = user?.email || profile?.email || "Anonymous Guest";

    try {
      await addDoc(collection(db, 'featureRequests'), {
        email: displayEmail,
        request: featureText,
        timestamp: new Date().toISOString(),
        status: 'pending'
      });

      const subject = encodeURIComponent("FynWealth Feature Request");
      const body = encodeURIComponent(`User: ${displayEmail}\n\nRequest:\n${featureText}`);
      const mailtoUrl = `mailto:admin@fynwealth.com?subject=${subject}&body=${body}`;
      
      window.open(mailtoUrl, '_blank');

      toast({ title: "Request Sent", description: "Your request has been logged and your mail client should open." });
      setFeatureText("");
      setLegalDialog(null);
    } catch (err) {
      toast({ variant: "destructive", title: "Submission Failed", description: "Could not log request. Please try again." });
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setViewDate(date.getMonth(), date.getFullYear());
    }
  };

  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(viewYear, viewMonth));
  
  const displayName = profile?.firstName 
    ? `${profile.firstName} ${profile.lastName}` 
    : (user?.displayName || "My Profile");
  
  const displayEmail = user?.email || profile?.email || "Anonymous Guest";
  
  const initial = profile?.firstName?.[0] 
    || user?.displayName?.[0] 
    || user?.email?.[0] 
    || "?";

  const sheetContent = (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className={cn(
          "rounded-lg flex items-center justify-center transition-colors shadow-sm focus:outline-none",
          standalone 
            ? "w-12 h-10 text-muted-foreground hover:text-primary hover:bg-primary/5" 
            : "w-12 h-10 bg-primary/10 text-primary hover:bg-primary/20"
        )}>
          <MoreHorizontal className="w-6 h-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[320px] p-0 border-r-none flex flex-col">
        <SheetHeader className="px-6 py-8 border-b bg-primary/5">
          <div className="flex items-center justify-between mb-6">
            <Logo className="scale-100 origin-left" />
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-2xl shadow-md uppercase">
              {initial}
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base font-headline font-bold truncate">
                {displayName}
              </SheetTitle>
              <SheetDescription className="text-xs font-medium truncate opacity-70">
                {displayEmail}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="flex flex-col p-5 space-y-8">
            <div className="space-y-4">
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Preferences</p>
              
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
                    onCheckedChange={(val) => {
                      togglePrivacyMode();
                      setIsOpen(false); // Auto-close drawer
                    }}
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
                  <Select value={currency.code} onValueChange={handleCurrencyChange}>
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
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Maintenance</p>
              
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
                      This removes all expenses recorded for this specific month from your cloud vault. <strong>We recommend exporting your data from the Expenses tab before deleting it.</strong>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="text-sm h-10">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearMonthlyData} className="bg-amber-600 text-sm h-10">
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
                      This will clear ALL expenses, budgets, reminders, and documents for ALL months from the whole app. This cannot be undone. <strong>Please ensure you have exported your data from the Expenses tab if you need a backup before proceeding.</strong>
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

            <div className="space-y-2">
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Legal & Support</p>
              
              <button 
                onClick={() => {
                  setLegalDialog("terms");
                  setIsOpen(false); // Auto-close drawer
                }}
                className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-muted/50 transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="text-xs md:text-sm font-bold">Terms of Service</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => {
                  setLegalDialog("privacy");
                  setIsOpen(false); // Auto-close drawer
                }}
                className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-muted/50 transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs md:text-sm font-bold">Privacy Policy</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => {
                  setLegalDialog("faq");
                  setIsOpen(false); // Auto-close drawer
                }}
                className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-muted/50 transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-accent" />
                  <span className="text-xs md:text-sm font-bold">FAQs</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => {
                  setLegalDialog("feature");
                  setIsOpen(false); // Auto-close drawer
                }}
                className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-muted/50 transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-purple-500" />
                  <span className="text-xs md:text-sm font-bold">Feature Request</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </ScrollArea>

        <div className="p-5 border-t bg-muted/10">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-4 rounded-xl bg-card border text-muted-foreground hover:bg-muted transition-colors font-bold text-xs md:text-sm justify-center shadow-sm"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
          <div className="text-center mt-4">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">FynWealth v1.0.0</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  const legalContent = (
    <Dialog open={legalDialog !== null} onOpenChange={(open) => !open && setLegalDialog(null)}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
        <DialogHeader className="p-6 bg-muted/30 border-b shrink-0">
          <DialogTitle className="font-headline text-xl flex items-center gap-2">
            {legalDialog === "terms" && <><FileText className="w-6 h-6 text-primary" /> Terms of Service</>}
            {legalDialog === "privacy" && <><Shield className="w-6 h-6 text-emerald-600" /> Privacy Policy</>}
            {legalDialog === "faq" && <><HelpCircle className="w-6 h-6 text-accent" /> App Help & FAQs</>}
            {legalDialog === "feature" && <><Zap className="w-6 h-6 text-purple-500" /> Feature Request</>}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0 w-full scrollbar-thin scrollbar-thumb-muted-foreground/20">
          <div className="p-8 space-y-8 text-sm text-muted-foreground leading-relaxed">
            {legalDialog === "terms" && (
              <>
                <section>
                  <h3 className="font-bold text-foreground text-lg mb-2">1. Acceptance of Terms</h3>
                  <p>By accessing or using FynWealth, you agree to be bound by these Terms of Service.</p>
                </section>
                <section>
                  <h3 className="font-bold text-foreground text-lg mb-2">2. Financial Disclaimer</h3>
                  <div className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-xl border border-amber-100 dark:border-amber-900/30 flex gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-400 font-semibold">FynWealth is a tracking tool and does not provide professional financial advice.</p>
                  </div>
                </section>
              </>
            )}

            {legalDialog === "privacy" && (
              <>
                <section>
                  <h3 className="font-bold text-foreground text-lg mb-2">1. Data Collection</h3>
                  <p>FynWealth utilizes Firebase for secure storage. Your data is encrypted and tied to your account.</p>
                </section>
              </>
            )}

            {legalDialog === "faq" && (
              <div className="space-y-10">
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-2">Is my data secure?</h3>
                  <p>Yes, we use industry-standard encryption provided by Firebase.</p>
                </div>
              </div>
            )}

            {legalDialog === "feature" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Feedback</Label>
                  <Textarea 
                    placeholder="Describe the improvement..." 
                    className="min-h-[150px] rounded-xl text-base"
                    value={featureText}
                    onChange={(e) => setFeatureText(e.target.value)}
                  />
                </div>
                <Button onClick={submitFeatureRequest} className="w-full h-12 font-bold rounded-xl shadow-lg">
                  Submit Feedback
                </Button>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="p-6 border-t bg-muted/10 shrink-0">
          <Button variant="outline" onClick={() => setLegalDialog(null)} className="w-full h-12 text-sm font-bold rounded-xl">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (standalone) {
    return (
      <>
        {sheetContent}
        {legalContent}
      </>
    );
  }

  return (
    <div className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-md border-b px-4 h-14 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {sheetContent}
        <Logo className="hidden sm:flex scale-100 origin-left" />
      </div>

      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
          onClick={() => {
            setShowTutorialGlobal(true);
            setIsOpen(false); // Auto-close drawer
          }}
          title="Show Tutorial"
        >
          <HelpCircle className="w-5 h-5" />
        </Button>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
              title="Select Date"
            >
              <CalendarIcon className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-[20px] overflow-hidden mt-2" align="end">
            <Calendar
              mode="single"
              selected={new Date(viewYear, viewMonth)}
              onSelect={handleCalendarSelect}
              initialFocus
              captionLayout="dropdown"
              fromYear={2020}
              toYear={2035}
            />
          </PopoverContent>
        </Popover>

        {displayName && (
          <div className="px-3.5 py-1.5 rounded-full bg-primary/5 border border-primary/10 flex items-center gap-2 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-tight truncate max-w-[100px]">
              {profile?.firstName || user?.displayName?.split(' ')[0] || "User"}
            </span>
          </div>
        )}
      </div>
      {legalContent}
      <TutorialDialog open={showTutorialGlobal} onOpenChange={setShowTutorialGlobal} />
    </div>
  );
}
