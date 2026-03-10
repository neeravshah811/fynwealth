
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
  Coins,
  FileText,
  Shield,
  HelpCircle,
  Zap,
  MessageSquare,
  AlertCircle
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
  const [legalDialog, setLegalDialog] = useState<"terms" | "privacy" | "faq" | "feature" | null>(null);
  const [featureText, setFeatureText] = useState("");

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

  const submitFeatureRequest = () => {
    if (!featureText.trim()) return;
    toast({ title: "Request Received", description: "Thank you! Our team will review your suggestion." });
    setFeatureText("");
    setLegalDialog(null);
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
          <SheetContent side="left" className="w-[320px] p-0 border-r-none flex flex-col">
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

                <div className="space-y-2">
                  <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Legal & Support</p>
                  
                  <button 
                    onClick={() => setLegalDialog("terms")}
                    className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-muted/50 transition-colors group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-primary" />
                      <span className="text-xs md:text-sm font-bold">Terms of Service</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button 
                    onClick={() => setLegalDialog("privacy")}
                    className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-muted/50 transition-colors group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-emerald-600" />
                      <span className="text-xs md:text-sm font-bold">Privacy Policy</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button 
                    onClick={() => setLegalDialog("faq")}
                    className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-muted/50 transition-colors group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-5 h-5 text-accent" />
                      <span className="text-xs md:text-sm font-bold">FAQs</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button 
                    onClick={() => setLegalDialog("feature")}
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

      {/* Legal Dialogs */}
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
          
          <ScrollArea className="flex-1 min-h-0 w-full">
            <div className="p-8 space-y-8 text-sm text-muted-foreground leading-relaxed">
              {legalDialog === "terms" && (
                <>
                  <section>
                    <h3 className="font-bold text-foreground text-lg mb-2">1. Acceptance of Terms</h3>
                    <p>By accessing or using FynWealth, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-foreground text-lg mb-2">2. Financial Disclaimer</h3>
                    <div className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-xl border border-amber-100 dark:border-amber-900/30 flex gap-4">
                      <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                      <p className="text-sm text-amber-800 dark:text-amber-400 font-semibold leading-normal">FynWealth is a tracking and visualization tool. It does not provide professional financial, investment, or legal advice. AI-generated insights are automated suggestions based on provided data and should be verified independently.</p>
                    </div>
                  </section>
                  <section>
                    <h3 className="font-bold text-foreground text-lg mb-2">3. User Responsibility</h3>
                    <p>You are responsible for maintaining the confidentiality of your account. You agree to provide accurate financial information for the best experience.</p>
                  </section>
                </>
              )}

              {legalDialog === "privacy" && (
                <>
                  <section>
                    <h3 className="font-bold text-foreground text-lg mb-2">1. Data Storage</h3>
                    <p>FynWealth utilizes Firebase for secure data storage. Your transaction records, categories, and profile details are encrypted and stored in private cloud instances tied directly to your authenticated UID.</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-foreground text-lg mb-2">2. AI Processing</h3>
                    <p>When you scan a bill or use voice entry, your data is processed by Google Gemini AI models. This processing occurs in real-time to extract merchant names, amounts, and categories. Your physical media (images/audio) are not permanently stored on our servers after extraction is complete.</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-foreground text-lg mb-2">3. Data Security</h3>
                    <p>We implement strict Firestore Security Rules to ensure that only YOU can read or write your personal financial data. Even system administrators cannot view your private transaction logs.</p>
                  </section>
                </>
              )}

              {legalDialog === "faq" && (
                <div className="space-y-10">
                  <div>
                    <h3 className="font-bold text-foreground text-lg mb-2">How accurate is the bill scanning?</h3>
                    <p>Our AI is highly accurate with standard retail receipts and digital invoices. For best results, ensure the photo is flat, well-lit, and the total amount is clearly visible.</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg mb-2">Is my voice recording kept?</h3>
                    <p>No. Your voice is transcribed locally or via real-time streaming to the AI model. Once the text details are extracted and saved to your history, the original audio file is discarded.</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg mb-2">What is "Privacy Mode"?</h3>
                    <p>Privacy Mode blurs all sensitive financial figures across the dashboard. This is designed for use in public places (like commuting) to keep your balances private while you manage entries.</p>
                  </div>
                </div>
              )}

              {legalDialog === "feature" && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">What would make FynWealth better for you?</Label>
                    <Textarea 
                      placeholder="Describe the feature or improvement you'd like to see..." 
                      className="min-h-[150px] rounded-xl text-base"
                      value={featureText}
                      onChange={(e) => setFeatureText(e.target.value)}
                    />
                  </div>
                  <Button onClick={submitFeatureRequest} className="w-full h-12 font-bold rounded-xl shadow-lg">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Submit Feedback
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <DialogFooter className="p-6 border-t bg-muted/10 shrink-0">
            <Button variant="outline" onClick={() => setLegalDialog(null)} className="w-full h-12 text-sm font-bold rounded-xl">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
