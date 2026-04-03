'use client';

import { useState, useEffect } from 'react';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  getRedirectResult,
  updateProfile as updateFirebaseProfile,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { useFynWealthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { Loader2, Mail, Lock, User, ArrowRight, Chrome, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { user: currentUser, isUserLoading } = useUser();
  const { updateProfile: updateStoreProfile, setTutorialCompleted, setTourStepIndex, currency } = useFynWealthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [loading, setLoading] = useState(false);
  const [checkingRedirect, setCheckingRedirect] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const syncUserToFirestore = async (user: any, isNew: boolean = false) => {
    try {
      // 1. Check Blacklist
      const blacklistDoc = await getDoc(doc(db, 'blacklist', user.uid));
      if (blacklistDoc.exists()) {
        await signOut(auth);
        throw new Error('BAN_ACTIVE');
      }

      // 2. Prepare Profile
      const userRef = doc(db, 'users', user.uid);
      const userData: any = {
        uid: user.uid,
        email: user.email,
        name: user.displayName || name || 'Anonymous User',
        lastActive: serverTimestamp(),
        updatedAt: serverTimestamp(),
        preferredCurrency: currency.code || 'USD'
      };

      if (isNew) {
        userData.createdAt = serverTimestamp();
        userData.stats = { totalExpenses: 0, totalReminders: 0 };
        // Increment global count
        await setDoc(doc(db, 'analytics', 'appStats'), { totalUsers: increment(1) }, { merge: true });
      }

      // 3. Save to Cloud
      await setDoc(userRef, userData, { merge: true });
      
      // 4. Update Local Store
      if (userData.name) {
        const [firstName = '', ...rest] = userData.name.split(' ');
        updateStoreProfile({
          firstName,
          lastName: rest.join(' '),
          email: user.email || ''
        });
      }
    } catch (error: any) {
      if (error.message === 'BAN_ACTIVE') throw error;
      console.error("Cloud Sync Error:", error);
      throw error;
    }
  };

  // Handle Mount Logic (Redirect Catch)
  useEffect(() => {
    if (!auth) return;

    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          try {
            await syncUserToFirestore(result.user, false);
            setTourStepIndex(0);
            setTutorialCompleted(false);
            router.push('/dashboard');
          } catch (err: any) {
            if (err.message === 'BAN_ACTIVE') {
              toast({ variant: 'destructive', title: 'Access Denied', description: 'This account has been disabled.' });
            }
          }
        }
        setCheckingRedirect(false);
      })
      .catch((error: any) => {
        console.error("Auth Handshake Error:", error);
        setCheckingRedirect(false);
      });
  }, [auth, db, router]);

  // Auth Guard: If already logged in, skip login page
  useEffect(() => {
    if (!isUserLoading && !checkingRedirect && currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, isUserLoading, checkingRedirect, router]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateFirebaseProfile(userCredential.user, { displayName: name });
        await syncUserToFirestore(userCredential.user, true);
        toast({ title: 'Welcome!', description: 'Account created successfully.' });
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await syncUserToFirestore(userCredential.user, false);
        toast({ title: 'Welcome Back!', description: 'Signed in successfully.' });
      }
      setTourStepIndex(0);
      setTutorialCompleted(false);
      router.push('/dashboard');
    } catch (error: any) {
      let message = 'Verification failed.';
      if (error.code === 'auth/email-already-in-use') message = 'Email already registered.';
      if (error.code === 'auth/invalid-credential') message = 'Invalid email or password.';
      if (error.message === 'BAN_ACTIVE') message = 'Account disabled by admin.';
      
      toast({ variant: 'destructive', title: 'Auth Error', description: message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        await syncUserToFirestore(result.user, false);
        setTourStepIndex(0);
        setTutorialCompleted(false);
        toast({ title: 'Success', description: 'Logged in with Google.' });
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error("Google Popup Error:", error);
      
      let errorMessage = "Could not complete Google Sign-in.";
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = "Domain not authorized. Please add fynwealth-six.vercel.app to Authorized Domains in Firebase Console.";
      } else if (error.message === 'BAN_ACTIVE') {
        errorMessage = "This account has been disabled by an administrator.";
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = "Popup was blocked by your browser. Please allow popups for this site.";
      }

      toast({ 
        variant: 'destructive', 
        title: 'Login Failed', 
        description: errorMessage 
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingRedirect || isUserLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Establishing Secure Session...</p>
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
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Chrome className="w-4 h-4 mr-2 text-primary" />}
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

            <form onSubmit={mode === 'reset' ? (e) => { e.preventDefault(); toast({ title: 'Coming Soon', description: 'Reset is disabled for this prototype.' }); } : handleEmailAuth} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <Input id="name" type="text" placeholder="Jane Doe" className="pl-10 h-12 bg-muted/30 border-none ring-1 ring-muted focus:ring-2 focus:ring-primary rounded-xl" value={name} onChange={(e) => setName(e.target.value)} required={mode === 'signup'} />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                  <Input id="email" type="email" placeholder="jane@example.com" className="pl-10 h-12 bg-muted/30 border-none ring-1 ring-muted focus:ring-2 focus:ring-primary rounded-xl" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>

              {mode !== 'reset' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
                    {mode === 'signin' && (
                      <button type="button" onClick={() => setMode('reset')} className="text-[10px] font-bold text-primary hover:underline">Forgot password?</button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10 h-12 bg-muted/30 border-none ring-1 ring-muted focus:ring-2 focus:ring-primary rounded-xl" value={password} onChange={(e) => setPassword(e.target.value)} required={mode !== 'reset'} />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-xl" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                {mode === 'signin' && 'Sign In'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'reset' && 'Send Reset Link'}
              </Button>
            </form>

            <div className="text-center space-y-4">
              {mode === 'reset' ? (
                <button type="button" className="text-xs font-bold text-muted-foreground hover:text-primary transition-all flex items-center justify-center mx-auto" onClick={() => setMode('signin')}>
                  <ChevronLeft className="w-3 h-3 mr-1" /> Back to Sign In
                </button>
              ) : (
                <button type="button" className="text-xs font-bold text-primary hover:underline transition-all" onClick={(): void => setMode(mode === 'signin' ? 'signup' : 'signin')}>
                  {mode === 'signin' ? "Don't have an account? Create one" : "Already have an account? Sign in"}
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
