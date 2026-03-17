"use client";

import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Save, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  Database
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function AdminSettingsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalExpenses: 0,
    totalReminders: 0,
    activeUsers24h: 0
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch App Stats
      const statsDoc = await getDoc(doc(db, 'analytics', 'appStats'));
      if (statsDoc.exists()) {
        setStats(statsDoc.data() as any);
      }

      // 2. Fetch Admin List
      const adminSnapshot = await getDocs(collection(db, 'admins'));
      setAdmins(adminSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    } catch (error: any) {
      console.error("Settings fetch failed", error);
      toast({ variant: "destructive", title: "Sync Failed", description: "Could not retrieve system configuration." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [db]);

  const handleUpdateStats = async () => {
    setSaving(true);
    try {
      const statsRef = doc(db, 'analytics', 'appStats');
      await setDoc(statsRef, stats, { merge: true });
      toast({ title: "Metrics Updated", description: "Global application stats have been synchronized." });
    } catch (error: any) {
      const permissionError = new FirestorePermissionError({
        path: 'analytics/appStats',
        operation: 'update',
        requestResourceData: stats
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) return;
    setSaving(true);
    try {
      const adminId = Math.random().toString(36).substring(7);
      await setDoc(doc(db, 'admins', adminId), {
        email: newAdminEmail.trim(),
        role: 'admin'
      });
      setNewAdminEmail('');
      await fetchData();
      toast({ title: "Admin Added", description: `${newAdminEmail} now has full dashboard access.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Action Denied", description: "You don't have permission to manage roles." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'admins', id));
      await fetchData();
      toast({ title: "Admin Removed" });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Could not remove administrator." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight">System Settings</h1>
          <p className="text-sm text-muted-foreground">Global application control and administrative management.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={saving} className="h-10 rounded-xl font-bold">
          <RefreshCw className={cn("w-4 h-4 mr-2", saving && "animate-spin")} />
          Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="registry" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="registry" className="font-bold text-xs uppercase">Admin Registry</TabsTrigger>
          <TabsTrigger value="metrics" className="font-bold text-xs uppercase">Global Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="registry" className="space-y-6">
          <Card className="border-none shadow-sm ring-1 ring-black/5 bg-white dark:bg-card">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Authorized Administrators
              </CardTitle>
              <CardDescription className="text-xs">Manage emails authorized to access the administrative interface.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-3">
                <Input 
                  placeholder="Enter administrator email..." 
                  className="h-11 rounded-xl bg-muted/30 border-none text-sm"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                />
                <Button onClick={handleAddAdmin} disabled={saving} className="h-11 rounded-xl shadow-lg font-bold px-6">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Admin
                </Button>
              </div>

              <div className="space-y-2 pt-2">
                {admins.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between p-4 rounded-xl border border-black/5 bg-muted/10 group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                        {admin.email[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold leading-none mb-1">{admin.email}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">{admin.role || 'Administrator'}</p>
                      </div>
                    </div>
                    {admin.email !== 'admin@fynwealth.com' && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-9 h-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 opacity-0 group-hover:opacity-100 transition-all"
                        onClick={() => handleDeleteAdmin(admin.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <Card className="border-none shadow-sm ring-1 ring-black/5 bg-white dark:bg-card">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-500" />
                System Metric Overrides
              </CardTitle>
              <CardDescription className="text-xs">Manually adjust global application statistics for display.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Total Users</Label>
                  <Input 
                    type="number" 
                    value={stats.totalUsers} 
                    onChange={(e) => setStats({...stats, totalUsers: parseInt(e.target.value) || 0})}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Expenses Recorded</Label>
                  <Input 
                    type="number" 
                    value={stats.totalExpenses} 
                    onChange={(e) => setStats({...stats, totalExpenses: parseInt(e.target.value) || 0})}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Reminders Set</Label>
                  <Input 
                    type="number" 
                    value={stats.totalReminders} 
                    onChange={(e) => setStats({...stats, totalReminders: parseInt(e.target.value) || 0})}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Active Users (24h)</Label>
                  <Input 
                    type="number" 
                    value={stats.activeUsers24h} 
                    onChange={(e) => setStats({...stats, activeUsers24h: parseInt(e.target.value) || 0})}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  <strong>Warning:</strong> Changes made here will immediately reflect across all administrative dashboard visualizations.
                </p>
              </div>

              <Button onClick={handleUpdateStats} disabled={saving} className="w-full h-12 rounded-xl shadow-lg font-bold">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Synchronize System Metrics
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
