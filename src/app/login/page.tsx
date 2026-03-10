'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/firebase';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  signInAnonymously
} from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { Loader2, Phone, ShieldCheck, ArrowRight, AlertCircle, UserCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function LoginPage() {
  const auth = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [billingError, setBillingError] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (!recaptchaVerifier.current && recaptchaRef.current) {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        }
      });
    }
    return () => {
      if (recaptchaVerifier.current) {
        recaptchaVerifier.current.clear();
        recaptchaVerifier.current = null;
      }
    };
  }, [auth]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.startsWith('+')) {
      toast({
        variant: 'destructive',
        title: 'Invalid Format',
        description: 'Please include country code (e.g., +919876543210)',
      });
      return;
    }

    setLoading(true);
    setBillingError(false);
    try {
      const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier.current!);
      setConfirmationResult(result);
      setStep('otp');
      toast({
        title: 'OTP Sent',
        description: `We've sent a code to ${phoneNumber}`,
      });
    } catch (error: any) {
      console.error('Phone Sign In Error:', error);
      if (error.code === 'auth/billing-not-enabled') {
        setBillingError(true);
        toast({
          variant: 'destructive',
          title: 'Billing Required',
          description: 'Phone authentication requires a billing account to be linked in the Firebase Console.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: error.message || 'Could not send verification code.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;

    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
      toast({
        title: 'Welcome Back!',
        description: 'Successfully authenticated.',
      });
    } catch (error: any) {
      console.error('OTP Verification Error:', error);
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: 'Invalid OTP code. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    try {
      await signInAnonymously(auth);
      toast({
        title: 'Guest Access Enabled',
        description: 'Welcome! You can now explore the app.',
      });
    } catch (error: any) {
      console.error('Guest Sign In Error:', error);
      toast({
        variant: 'destructive',
        title: 'Guest Login Failed',
        description: error.message || 'Could not initiate guest session.',
      });
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
      <div id="recaptcha-container" ref={recaptchaRef}></div>
      
      <Card className="w-full max-w-md border-none shadow-2xl bg-card/80 backdrop-blur-xl">
        <CardHeader className="space-y-4 pb-8 text-center">
          <div className="flex justify-center mb-2">
            <Logo className="scale-125" />
          </div>
          <CardTitle className="text-2xl font-bold font-headline tracking-tight">
            {step === 'phone' ? 'Secure Sign In' : 'Verify Identity'}
          </CardTitle>
          <CardDescription className="text-sm">
            {step === 'phone' 
              ? 'Enter your phone number to access your financial dashboard.' 
              : `We've sent a 6-digit code to ${phoneNumber}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billingError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription className="text-[10px]">
                Firebase Phone Auth requires a billing account. Please go to the Firebase Console &gt; Project Settings &gt; Usage &amp; Billing to link a billing account.
              </AlertDescription>
            </Alert>
          )}

          {step === 'phone' ? (
            <div className="space-y-6">
              <form onSubmit={handleSendOtp} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 9876543210"
                      className="pl-10 h-12 bg-muted/30 border-none ring-1 ring-muted focus:ring-2 focus:ring-primary"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground ml-1">
                    Include country code (e.g. +91 for India)
                  </p>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                  disabled={loading || guestLoading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                  Send Verification Code
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button 
                variant="outline"
                className="w-full h-12 text-sm font-bold border-muted hover:bg-muted/5"
                onClick={handleGuestLogin}
                disabled={loading || guestLoading}
              >
                {guestLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserCircle className="w-4 h-4 mr-2 text-muted-foreground" />}
                Continue as Guest
              </Button>
            </div>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  Verification Code
                </Label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  <Input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    className="pl-10 h-12 bg-muted/30 border-none ring-1 ring-muted focus:ring-2 focus:ring-primary tracking-[0.5em] text-center font-bold"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button 
                  type="submit" 
                  className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                  Verify & Sign In
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-xs"
                  onClick={() => setStep('phone')}
                >
                  Change Phone Number
                </Button>
              </div>
            </form>
          )}
          
          <div className="mt-8 pt-6 border-t border-muted/50 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
              Trusted by users for smart wealth management
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
