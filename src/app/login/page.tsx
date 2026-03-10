
'use client';

import { useState } from 'react';
import { useAuth } from '@/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile as updateFirebaseProfile
} from 'firebase/auth';
import { useFynWealthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { Loader2, Mail, Lock, User, ArrowRight, Chrome } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function LoginPage() {
  const auth = useAuth();
  const { updateProfile: updateStoreProfile } = useFynWealthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mode, setStep] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update Firebase Display Name
        await updateFirebaseProfile(user, { displayName: name });
        
        // Update Local Store Profile
        const [firstName = '', ...rest] = name.split(' ');
        updateStoreProfile({
          firstName,
          lastName: rest.join(' '),
          email: user.email || email
        });

        toast({
          title: 'Welcome to FynWealth!',
          description: 'Your account has been created successfully.',
        });
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Sync display name if not in store
        if (user.displayName) {
          const [firstName = '', ...rest] = user.displayName.split(' ');
          updateStoreProfile({
            firstName,
            lastName: rest.join(' '),
            email: user.email || email
          });
        }

        toast({
          title: 'Welcome Back!',
          description: 'Successfully signed in.',
        });
      }
    } catch (error: any) {
      console.error('Auth Error:', error);
      toast({
        variant: 'destructive',
        title: mode === 'signup' ? 'Sign Up Failed' : 'Sign In Failed',
        description: error.message || 'Could not authenticate. Please check your credentials.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user.displayName) {
        const [firstName = '', ...rest] = user.displayName.split(' ');
        updateStoreProfile({
          firstName,
          lastName: rest.join(' '),
          email: user.email || ''
        });
      }

      toast({
        title: 'Welcome!',
        description: 'Signed in with Google.',
      });
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      toast({
        variant: 'destructive',
        title: 'Google Login Failed',
        description: error.message || 'Could not complete Google sign in.',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
      <Card className="w-full max-w-md border-none shadow-2xl bg-card/80 backdrop-blur-xl rounded-3xl overflow-hidden">
        <CardHeader className="space-y-4 pb-8 text-center pt-10">
          <div className="flex justify-center mb-2">
            <Logo className="scale-125" />
          </div>
          <CardTitle className="text-2xl font-bold font-headline tracking-tight">
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
          <CardDescription className="text-sm">
            {mode === 'signin' 
              ? 'Manage your wealth with smart tracking and AI insights.' 
              : 'Join FynWealth to start your journey to financial freedom.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-10">
          <div className="space-y-6">
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

            <form onSubmit={handleEmailAuth} className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-12 bg-muted/30 border-none ring-1 ring-muted focus:ring-2 focus:ring-primary rounded-xl"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-xl"
                disabled={loading || googleLoading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="text-center">
              <button 
                type="button"
                className="text-xs font-bold text-primary hover:underline transition-all"
                onClick={() => setStep(mode === 'signin' ? 'signup' : 'signin')}
              >
                {mode === 'signin' ? "Don't have an account? Create one" : "Already have an account? Sign in"}
              </button>
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
