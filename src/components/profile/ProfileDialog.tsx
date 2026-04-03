
"use client";

import { useState, useEffect } from "react";
import { useFynWealthStore } from "@/lib/store";
import { useAuth, useUser, useFirestore } from "@/firebase";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  User, 
  LogOut, 
  FileText, 
  Shield, 
  HelpCircle, 
  Zap, 
  MessageSquare,
  ChevronRight,
  Mail,
  AlertCircle,
  Lock
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { signOut } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";

export function ProfileDialog() {
  const { profile, updateProfile, clearAllData, setTutorialCompleted } = useFynWealthStore();
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeLegal, setActiveLegal] = useState<"terms" | "privacy" | "faq" | "feature" | null>(null);
  const [featureText, setFeatureText] = useState("");
  
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
    } else if (user) {
      const names = user.displayName?.split(' ') || [];
      setFormData({
        firstName: names[0] || "",
        lastName: names.slice(1).join(' ') || "",
        email: user.email || "",
      });
    }
  }, [profile, user]);

  const hasProfile = !!(profile?.firstName && profile?.email);
  
  const displayName = profile?.firstName 
    ? `${profile.firstName} ${profile.lastName}` 
    : (user?.displayName || "User Profile");
    
  const displayEmail = user?.email || profile?.email || "No email available";

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

  const submitFeatureRequest = async () => {
    if (!featureText.trim()) return;
    
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

      toast({ title: "Request Logged", description: "Your feedback was saved and your mail client should open." });
      setFeatureText("");
      setActiveLegal(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to submit feedback." });
    }
  };

  const handleAction = (label: string) => {
    toast({ title: label, description: "This feature is coming soon in a future update." });
  };

  const handleLogout = async () => {
    try {
      setTutorialCompleted(false);
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

  const initial = profile?.firstName?.[0] || user?.displayName?.[0] || user?.email?.[0] || "?";

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
          <button className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base hover:bg-primary/20 transition-colors border border-primary/20 overflow-hidden uppercase">
            {initial}
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden gap-0 border-none shadow-2xl">
          <DialogHeader className="p-8 bg-primary/5 border-b shrink-0">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold shadow-lg shadow-primary/20 uppercase">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <DialogTitle className="font-headline text-2xl truncate">
                    {displayName}
                  </DialogTitle>
                  {hasProfile && <Lock className="w-4 h-4 text-muted-foreground shrink-0" title="Profile Details Locked" />}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1.5 font-medium">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">{displayEmail}</span>
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
                <MenuButton icon={Zap} label="Request a Feature" onClick={() => setActiveLegal("feature")} />
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
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-[32px]">
          <DialogHeader className="p-6 bg-muted/30 border-b shrink-0">
            <DialogTitle className="font-headline text-xl flex items-center gap-2">
              {activeLegal === "terms" && <><FileText className="w-6 h-6 text-primary" /> Terms of Service</>}
              {activeLegal === "privacy" && <><Shield className="w-6 h-6 text-emerald-600" /> Privacy Policy</>}
              {activeLegal === "faq" && <><HelpCircle className="w-6 h-6 text-accent" /> App Help & FAQs</>}
              {activeLegal === "feature" && <><Zap className="w-6 h-6 text-purple-500" /> Feature Request</>}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium mt-1">
              Last updated: April 2026
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto min-h-0 w-full scrollbar-thin scrollbar-thumb-muted-foreground/20">
            <div className="p-8 space-y-8 text-sm text-muted-foreground leading-relaxed">
              {activeLegal === "terms" && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <p className="font-bold text-foreground">Effective Date: April 1, 2026</p>
                    <p className="text-xs">These Terms may be reviewed and updated periodically.</p>
                  </div>
                  <p>By accessing or using FynWealth, you agree to these Terms.</p>
                  
                  <section className="space-y-2">
                    <h3 className="font-bold text-foreground text-base">1. Nature of Service</h3>
                    <p>FynWealth is a personal finance management tool that helps users track expenses, organize financial data, and receive AI-generated insights. <strong>FynWealth does not provide financial, investment, tax, or legal advice.</strong></p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-bold text-foreground text-base">2. Eligibility</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>You must be at least 18 years old</li>
                      <li>You must have the legal capacity to enter into a binding agreement</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-bold text-foreground text-base">3. User Responsibilities</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Provide accurate and complete information</li>
                      <li>Maintain confidentiality of your account</li>
                      <li>Ensure lawful use of the platform</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-bold text-foreground text-base">4. Financial Data & AI Disclaimer</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Insights are generated using algorithms and may not be fully accurate</li>
                      <li>Outputs are indicative and should not be solely relied upon</li>
                      <li>You are responsible for all financial decisions</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-bold text-foreground text-base">5. Data Inputs & Accuracy</h3>
                    <p>We process data based on user input and uploaded/imported statements. We do not guarantee completeness, accuracy, or timeliness.</p>
                  </section>

                  <section className="space-y-2 pt-4 border-t">
                    <h3 className="font-bold text-foreground text-base">12. Contact</h3>
                    <p><a href="mailto:admin@fynwealth.com" className="text-primary hover:underline">admin@fynwealth.com</a></p>
                  </section>
                </div>
              )}

              {activeLegal === "privacy" && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <p className="font-bold text-foreground">Effective Date: April 1, 2026</p>
                    <p className="text-xs">This policy may be reviewed and updated periodically.</p>
                  </div>
                  <p>FynWealth is committed to protecting your personal and financial data in compliance with global privacy standards, including <strong>GDPR (EU)</strong> and <strong>India’s Digital Personal Data Protection (DPDP) Act</strong>.</p>

                  <section className="space-y-2">
                    <h3 className="font-bold text-foreground text-base">1. Information We Collect</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Personal Data: name, email</li>
                      <li>Financial Data: transactions, categories, uploaded statements</li>
                      <li>Technical Data: device, browser, usage patterns</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-bold text-foreground text-base">2. Purpose of Processing</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>provide expense tracking and insights</li>
                      <li>generate AI-based financial analysis</li>
                      <li>send reminders and notifications</li>
                      <li>improve product performance</li>
                    </ul>
                  </section>

                  <section className="space-y-2 pt-4 border-t">
                    <h3 className="font-bold text-foreground text-base">14. Contact / Grievance Officer</h3>
                    <p><a href="mailto:admin@fynwealth.com" className="text-primary hover:underline">admin@fynwealth.com</a></p>
                  </section>
                </div>
              )}

              {activeLegal === "faq" && (
                <div className="space-y-8">
                  {[
                    { q: "Is FynWealth free?", a: "Yes, core features are free. Optional premium features may be introduced." },
                    { q: "Is my financial data safe?", a: "Yes. We use encryption, secure authentication, and do not store banking credentials." },
                    { q: "Do you access my bank account directly?", a: "No. We do not require bank login credentials. You can import statements securely." },
                    { q: "How accurate are AI insights?", a: "AI insights are indicative and based on your data. They are not financial advice." },
                    { q: "Can I delete my data?", a: "Yes. You can delete your data or account at any time." },
                    { q: "What happens when I delete my account?", a: "All associated data is permanently removed and you are blacklisted." },
                    { q: "Do you sell my data?", a: "No. We do not sell personal or financial data." },
                    { q: "How can I contact support?", a: "Contact us at admin@fynwealth.com" }
                  ].map((item, i) => (
                    <div key={i} className="space-y-2">
                      <h3 className="font-bold text-foreground text-base">{i + 1}. {item.q}</h3>
                      <p className="text-muted-foreground">{item.a}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeLegal === "feature" && (
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
            <Button onClick={() => setActiveLegal(null)} className="w-full h-12 text-sm font-bold rounded-xl">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
