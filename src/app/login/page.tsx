
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  updateProfile as updateFirebaseProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { useFynWealthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { Loader2, Mail, Lock, User, ArrowRight, Chrome, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function LoginPage() {
  const auth = useAuth();
  const { updateProfile: updateStoreProfile, setTutorialCompleted, setTourStepIndex } = useFynWealthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingRedirect, setCheckingRedirect] = useState(true);

  // Handle returning from a Google redirect (standard for mobile)
  useEffect(() => {
    if (!auth) return;

    // Check if we already have a user from a previous session or immediate login
    if (auth.currentUser) {
      setCheckingRedirect(false);
      return;
    }

    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          const user = result.user;
          
          if (user.displayName) {
            const [firstName = '', ...rest] = user.displayName.split(' ');
            updateStoreProfile({
              firstName,
              lastName: rest.join(' '),
              email: user.email || ''
            });
          }

          // Reset walkthrough for every relogin
          setTourStepIndex(0);
          setTutorialCompleted(false);

          toast({
            title: 'Welcome!',
            description: 'Signed in with Google successfully.',
          });
        }
        setCheckingRedirect(false);
      })
      .catch((error: any) => {
        setCheckingRedirect(false);
        if (error.code !== 'auth/no-current-user') {
          console.error('Redirect Sign-in Error:', error);
          toast({
            variant: 'destructive',
            title: 'Google Login Failed',
            description: 'Could not complete the mobile sign-in process. Please try again.',
          });
        }
      });
  }, [auth, updateStoreProfile, setTutorialCompleted, setTourStepIndex]);

  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'signup') {
      createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          const user = userCredential.user;
          updateFirebaseProfile(user, { displayName: name }).catch(() => {});
          
          const [firstName = '', ...rest] = name.split(' ');
          updateStoreProfile({
            firstName,
            lastName: rest.join(' '),
            email: user.email || email
          });

          // Reset walkthrough for new account
          setTourStepIndex(0);
          setTutorialCompleted(false);

          toast({
            title: 'Welcome to FynWealth!',
            description: 'Your account has been created successfully.',
          });
          setLoading(false);
        })
        .catch((error: any) => {
          let message = 'Could not create account.';
          if (error.code === 'auth/email-already-in-use') message = 'This email is already in use.';
          if (error.code === 'auth/invalid-email') message = 'Invalid email address.';
          if (error.code === 'auth/weak-password') message = 'Password is too weak.';
          
          toast({
            variant: 'destructive',
            title: 'Sign Up Failed',
            description: message,
          });
          setLoading(false);
        });
    } else if (mode === 'signin') {
      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          const user = userCredential.user;
          
          if (user.displayName) {
            const [firstName = '', ...rest] = user.displayName.split(' ');
            updateStoreProfile({
              firstName,
              lastName: rest.join(' '),
              email: user.email || email
            });
          }

          // Reset walkthrough for every relogin
          setTourStepIndex(0);
          setTutorialCompleted(false);

          toast({
            title: 'Welcome Back!',
            description: 'Successfully signed in.',
          });
          setLoading(false);
        })
        .catch((error: any) => {
          let message = 'Check your email and password.';
          if (
            error.code === 'auth/user-not-found' || 
            error.code === 'auth/wrong-password' || 
            error.code === 'auth/invalid-credential'
          ) {
            message = 'Invalid email or password.';
          } else if (error.code === 'auth/too-many-requests') {
            message = 'Too many failed attempts. Please try again later.';
          }
          
          toast({
            variant: 'destructive',
            title: 'Sign In Failed',
            description: message,
          });
          setLoading(false);
        });
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ variant: 'destructive', title: 'Email Required', description: 'Please enter your email to reset password.' });
      return;
    }
    setLoading(true);
    sendPasswordResetEmail(auth, email)
      .then(() => {
        toast({
          title: 'Reset Link Sent',
          description: `Check your inbox at ${email} for instructions.`,
        });
        setMode('signin');
        setLoading(false);
      })
      .catch((error: any) => {
        toast({
          variant: 'destructive',
          title: 'Reset Failed',
          description: 'Could not send reset email. Check if the address is correct.',
        });
        setLoading(false);
      });
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    // Detection for mobile environments where popups are often blocked
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      // Use redirect for mobile to bypass popup blockers
      signInWithRedirect(auth, provider);
    } else {
      // Use popup for desktop for better UX
      signInWithPopup(auth, provider)
        .then((result) => {
          const user = result.user;

          if (user.displayName) {
            const [firstName = '', ...rest] = user.displayName.split(' ');
            updateStoreProfile({
              firstName,
              lastName: rest.join(' '),
              email: user.email || ''
            });
          }

          // Reset walkthrough for every relogin
          setTourStepIndex(0);
          setTutorialCompleted(false);

          toast({
            title: 'Welcome!',
            description: 'Signed in with Google.',
          });
          setGoogleLoading(false);
        })
        .catch((error: any) => {
          console.error('Google Sign In Error:', error);
          let message = 'Could not complete Google sign in.';
          if (error.code === 'auth/popup-closed-by-user') message = 'Sign-in window was closed.';
          if (error.code === 'auth/cancelled-by-user') message = 'Sign-in was cancelled.';
          
          toast({
            variant: 'destructive',
            title: 'Google Login Failed',
            description: message,
          });
          setGoogleLoading(false);
        });
    }
  };

  if (checkingRedirect) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Verifying Authentication...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
      <Card className="w-full max-w-md border-none shadow-2xl bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
        <CardHeader className="space-y-4 pb-8 text-center pt-10">
          <div className="flex justify-center mb-2">
            <Logo className="scale-125" />
          </div>
          <CardTitle className="text-2xl font-bold font-headline tracking-tight">
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'reset' && 'Reset Password'}
          </CardTitle>
          <CardDescription className="text-sm">
            {mode === 'signin' && 'Manage your wealth with smart tracking and AI insights.'}
            {mode === 'signup' && 'Join FynWealth to start your journey to financial freedom.'}
            {mode === 'reset' && 'We\'ll send a recovery link to your email address.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-10">
          <div className="space-y-6">
            {mode !== 'reset' && (
              <>
                <Button 
                  variant="outline"
                  className="w-full h-12 text-sm font-bold border-muted hover:bg-muted/5 rounded-xl shadow-sm"
                  onClick={handleGoogleLogin}
                  disabled={loading || googleLoading}
                >
                  {googleLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Chrome className="w-4 h-4 mr-2 text-primary" />}
                  Continue with Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                    <span className="bg-card px-2 text-muted-foreground">Or with Email</span>
                  </div>
                </div>
              </>
            )}

            <form onSubmit={mode === 'reset' ? handleResetPassword : handleEmailAuth} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Jane Doe"
                      className="pl-10 h-12 bg-muted/30 border-none ring-1 ring-muted focus:ring-2 focus:ring-primary rounded-xl"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={mode === 'signup'}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane@example.com"
                    className="pl-10 h-12 bg-muted/30 border-none ring-1 ring-muted focus:ring-2 focus:ring-primary rounded-xl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {mode !== 'reset' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Password
                    </Label>
                    {mode === 'signin' && (
                      <button 
                        type="button"
                        onClick={() => setMode('reset')}
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10 h-12 bg-muted/30 border-none ring-1 ring-muted focus:ring-2 focus:ring-primary rounded-xl"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required={mode !== 'reset'}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-xl"
                disabled={loading || googleLoading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                {mode === 'signin' && 'Sign In'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'reset' && 'Send Reset Link'}
              </Button>
            </form>

            <div className="text-center space-y-4">
              {mode === 'reset' ? (
                <button 
                  type="button"
                  className="text-xs font-bold text-muted-foreground hover:text-primary transition-all flex items-center justify-center mx-auto"
                  onClick={() => setMode('signin')}
                >
                  <ChevronLeft className="w-3 h-3 mr-1" />
                  Back to Sign In
                </button>
              ) : (
                <button 
                  type="button"
                  className="text-xs font-bold text-primary hover:underline transition-all"
                  onClick={(): void => setMode(mode === 'signin' ? 'signup' : 'signin')}
                >
                  {mode === 'signin' ? "Don't have an account? Create one" : "Already have an account? Sign in"}
                </button>
              )}
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-muted/50 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
              Secure Cloud Storage • AES-256 Encryption
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
