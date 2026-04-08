
'use client';

import { useState, useEffect } from 'react';
import { useFynWealthStore } from '@/lib/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';

export function DataPrivacyConsent() {
  const { hasAcceptedPrivacy, setHasAcceptedPrivacy } = useFynWealthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Show after splash screen concludes (3s splash + 0.2s buffer)
    if (!hasAcceptedPrivacy) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 3200);
      return () => clearTimeout(timer);
    }
  }, [hasAcceptedPrivacy]);

  const handleAccept = () => {
    setHasAcceptedPrivacy(true);
    setIsOpen(false);
  };

  if (!mounted) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Prevent accidental dismissal via backdrop click
      if (!open && !hasAcceptedPrivacy) return;
      setIsOpen(open);
    }}>
      <DialogContent 
        className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl rounded-[32px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-8 bg-primary/5 border-b shrink-0 text-center">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <DialogTitle className="text-2xl font-bold font-headline tracking-tight">
            Your Data, Your Control
          </DialogTitle>
        </DialogHeader>

        <div className="p-8 space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            FynWealth uses your data to help you track expenses and generate personalized financial insights.
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3" /> We collect and process:
              </h4>
              <ul className="text-xs space-y-1 text-muted-foreground pl-5 list-disc">
                <li>Your transaction data (entered or uploaded)</li>
                <li>Basic account details (name, email)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-rose-600 flex items-center gap-2">
                <ShieldAlert className="w-3 h-3" /> We do NOT:
              </h4>
              <ul className="text-xs space-y-1 text-muted-foreground pl-5 list-disc">
                <li>Store banking passwords</li>
                <li>Sell your personal data</li>
              </ul>
            </div>
          </div>

          <div className="bg-muted/30 p-4 rounded-2xl space-y-2">
            <p className="text-[10px] text-muted-foreground leading-tight">
              By continuing, you agree to our <span className="font-bold text-primary">Terms of Service</span> and <span className="font-bold text-primary">Privacy Policy</span>.
            </p>
            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase">
              <Lock className="w-3 h-3" /> You can delete your data anytime.
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0">
          <Button onClick={handleAccept} className="w-full h-14 rounded-2xl font-bold text-base shadow-lg transition-all active:scale-95">
            Accept & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
