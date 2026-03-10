
"use client";

import { useState, useEffect } from "react";
import { useFynWealthStore } from "@/lib/store";
import { useAuth, useUser } from "@/firebase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  User, 
  LogOut, 
  FileText, 
  Shield, 
  HelpCircle, 
  Zap, 
  MessageSquare,
  ChevronRight,
  Phone,
  AlertCircle,
  Lock
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { signOut } from "firebase/auth";

export function ProfileDialog() {
  const { profile, updateProfile, clearAllData } = useFynWealthStore();
  const { user } = useUser();
  const auth = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeLegal, setActiveLegal] = useState<"terms" | "privacy" | "faq" | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: profile?.firstName || "",
    lastName: profile?.lastName || "",
    email: profile?.email || "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
      });
    }
  }, [profile]);

  const hasProfile = !!(profile?.firstName && profile?.email);

  const handleSave = () => {
    if (!formData.firstName || !formData.email) {
      toast({ 
        variant: "destructive", 
        title: "Missing information", 
        description: "First name and email are required to complete your profile." 
      });
      return;
    }
    updateProfile(formData);
    toast({ 
      title: "Profile Captured", 
      description: "Your details have been locked and saved successfully." 
    });
  };

  const handleAction = (label: string) => {
    toast({ title: label, description: "This feature is coming soon in a future update." });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsOpen(false);
      toast({ title: "Logged Out", description: "You have been signed out of your account." });
    } catch (error) {
      toast({ variant: "destructive", title: "Logout Error", description: "Could not sign out. Please try again." });
    }
  };

  const handleResetData = () => {
    if (confirm("This will permanently delete all your local data. This cannot be undone. Are you sure?")) {
      clearAllData();
      toast({ title: "Data Cleared", description: "All your personal data has been deleted." });
    }
  };

  const initial = profile?.firstName?.[0] || profile?.lastName?.[0];

  const MenuButton = ({ icon: Icon, label, onClick, variant = "default" }: { icon: any, label: string, onClick?: () => void, variant?: "default" | "destructive" }) => (
    <button 
      onClick={onClick || (() => handleAction(label))}
      className={`w-full flex items-center justify-between p-4 hover:bg-muted/50 rounded-xl transition-all group ${variant === 'destructive' ? 'text-destructive' : 'text-foreground'}`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-full transition-colors ${variant === 'destructive' ? 'bg-destructive/10 text-destructive group-hover:bg-destructive group-hover:text-destructive-foreground' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
    </button>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <button className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base hover:bg-primary/20 transition-colors border border-primary/20 overflow-hidden">
            {initial ? initial.toUpperCase() : <User className="w-5 h-5" />}
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden gap-0 border-none shadow-2xl">
          <DialogHeader className="p-8 bg-primary/5 border-b shrink-0">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold shadow-lg shadow-primary/20">
                {initial ? initial.toUpperCase() : <User className="w-8 h-8" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <DialogTitle className="font-headline text-2xl truncate">
                    {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : "User Profile"}
                  </DialogTitle>
                  {hasProfile && <Lock className="w-4 h-4 text-muted-foreground shrink-0" title="Profile Details Locked" />}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1.5 font-medium">
                  <Phone className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">{user?.phoneNumber || "Anonymous Guest"}</span>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-muted-foreground/20">
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Personal Details</h4>
                  {hasProfile && (
                    <span className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Verified & Locked
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-xs font-bold uppercase text-muted-foreground ml-1">First Name</Label>
                    <Input 
                      id="firstName" 
                      className="text-sm h-11 rounded-xl bg-background" 
                      placeholder="Enter first name"
                      disabled={hasProfile}
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-xs font-bold uppercase text-muted-foreground ml-1">Last Name</Label>
                    <Input 
                      id="lastName" 
                      className="text-sm h-11 rounded-xl bg-background" 
                      placeholder="Enter last name"
                      disabled={hasProfile}
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase text-muted-foreground ml-1">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email"
                    className="text-sm h-11 rounded-xl bg-background" 
                    placeholder="name@example.com"
                    disabled={hasProfile}
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                
                {!hasProfile ? (
                  <Button 
                    className="w-full h-12 text-sm font-bold mt-2 rounded-xl shadow-lg shadow-primary/10" 
                    onClick={handleSave}
                  >
                    Complete & Lock Profile
                  </Button>
                ) : (
                  <div className="p-4 bg-muted/30 rounded-xl border border-dashed border-muted flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Personal details are captured once during registration and cannot be modified to ensure account integrity.
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">Legal & Support</h4>
                <MenuButton icon={FileText} label="Terms of Service" onClick={() => setActiveLegal("terms")} />
                <MenuButton icon={Shield} label="Privacy Policy" onClick={() => setActiveLegal("privacy")} />
                <MenuButton icon={HelpCircle} label="Frequently Asked Questions" onClick={() => setActiveLegal("faq")} />
              </div>

              <Separator />

              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">App Maintenance</h4>
                <MenuButton icon={Zap} label="Request a Feature" />
                <MenuButton icon={MessageSquare} label="Send Feedback" />
                <MenuButton icon={LogOut} label="Reset All Data" variant="destructive" onClick={handleResetData} />
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-muted/20 border-t sm:justify-between flex-row items-center gap-4 shrink-0">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive text-sm h-11 px-6 font-bold rounded-xl"
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  Sign Out
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign Out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to log out of your FynWealth account?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout} className="bg-primary">
                    Confirm Sign Out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-muted-foreground font-semibold">Version 1.0.0 (B2026)</p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeLegal !== null} onOpenChange={(open) => !open && setActiveLegal(null)}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
          <DialogHeader className="p-6 bg-muted/30 border-b shrink-0">
            <DialogTitle className="font-headline text-xl flex items-center gap-2">
              {activeLegal === "terms" && <><FileText className="w-6 h-6 text-primary" /> Terms of Service</>}
              {activeLegal === "privacy" && <><Shield className="w-6 h-6 text-emerald-600" /> Privacy Policy</>}
              {activeLegal === "faq" && <><HelpCircle className="w-6 h-6 text-accent" /> App Help & FAQs</>}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium mt-1">
              Last updated: March 2026
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto min-h-0 w-full scrollbar-thin scrollbar-thumb-muted-foreground/20">
            <div className="p-8 space-y-8 text-sm text-muted-foreground leading-relaxed">
              {activeLegal === "terms" && (
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
                  <section>
                    <h3 className="font-bold text-foreground text-lg mb-2">4. Data Ownership</h3>
                    <p>You retain full ownership of all data you input. We do not sell your personal financial data to third parties.</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-foreground text-lg mb-2">5. Limitation of Liability</h3>
                    <p>FynWealth shall not be liable for any financial losses resulting from the use of the application or reliance on its AI-generated forecasts.</p>
                  </section>
                </>
              )}

              {activeLegal === "privacy" && (
                <>
                  <section>
                    <h3 className="font-bold text-foreground text-lg mb-2">1. Data Collection</h3>
                    <p>FynWealth collects information you provide directly: your phone number for secure authentication, and your expense records, categories, and descriptions.</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-foreground text-lg mb-2">2. Data Usage</h3>
                    <p>Your data is used solely to provide core app features: tracking expenses, monitoring budget targets, and using AI models to identify spending patterns and forecast heavy spending months.</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-foreground text-lg mb-2">3. Data Processing & AI</h3>
                    <p>FynWealth utilizes Firebase for secure storage and Google GenAI for expense extraction. Data processed by AI is used only for your specific insights and is not used to train global AI models without consent.</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-foreground text-lg mb-2">4. Security Measures</h3>
                    <p>All data is stored in Firebase with industry-standard encryption. Access is restricted via strict Security Rules tied to your authenticated unique ID.</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-foreground text-lg mb-2">5. Data Deletion</h3>
                    <p>You can delete all your data at any time via the "Reset System" option. This action is permanent and immediate.</p>
                  </section>
                </>
              )}

              {activeLegal === "faq" && (
                <>
                  <div className="space-y-10">
                    <div>
                      <h3 className="font-bold text-foreground text-lg mb-2">How does the AI scan my bills?</h3>
                      <p>Our AI identifies the merchant name, total amount, and date from your uploaded photos and populates your expense entry automatically. For best results, ensure the bill is flat and well-lit.</p>
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-lg mb-2">Is my voice recording stored?</h3>
                      <p>No. Your voice is transcribed in real-time. Once the extraction is complete, the audio processing is discarded, and only the resulting text data is saved to your history.</p>
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-lg mb-2">What is "Privacy Mode"?</h3>
                      <p>Located in the sidebar, Privacy Mode blurs all sensitive financial figures across the dashboard. It's designed for use in public places to keep your balances private.</p>
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-lg mb-2">How do I manage recurring expenses?</h3>
                      <p>Mark any expense as "Monthly Recurring" when creating it. You can then use the "Rollover" button on the dashboard to automatically copy these to a new month with one click.</p>
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-lg mb-2">How secure is my data?</h3>
                      <p>We use Firebase Authentication and Firestore Security Rules. This means your data is only accessible to you. Not even our system administrators can view your private transaction data.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <DialogFooter className="p-6 border-t bg-muted/10 shrink-0">
            <Button onClick={() => setActiveLegal(null)} className="w-full h-12 text-sm font-bold rounded-xl">Got it, Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
