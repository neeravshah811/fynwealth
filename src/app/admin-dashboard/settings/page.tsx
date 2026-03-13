'use client';

import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, query, where, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
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
  Database,
  Tag,
  Layers,
  Sparkles
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { SYSTEM_CATEGORIES } from '@/lib/constants';

export default function AdminSettingsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  
  // Taxonomy State
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCatForSub, setSelectedCatForSub] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');

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

      // 3. Fetch Taxonomy
      const catSnapshot = await getDocs(collection(db, 'categories'));
      setCategories(catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const subSnapshot = await getDocs(collection(db, 'subcategories'));
      setSubcategories(subSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

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

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'categories'), { name: newCategoryName.trim() });
      setNewCategoryName('');
      await fetchData();
      toast({ title: "Category Created" });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Could not add category." });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSubcategory = async () => {
    if (!newSubcategoryName.trim() || !selectedCatForSub) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'subcategories'), { 
        name: newSubcategoryName.trim(),
        categoryId: selectedCatForSub 
      });
      setNewSubcategoryName('');
      await fetchData();
      toast({ title: "Subcategory Created" });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Could not add subcategory." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTaxonomy = async (coll: string, id: string) => {
    setSaving(true);
    try {
      await deleteDoc(doc(db, coll, id));
      await fetchData();
      toast({ title: "Deleted Successfully" });
    } catch (err) {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setSaving(false);
    }
  };

  const seedDefaultTaxonomy = async () => {
    setSaving(true);
    try {
      const batch = writeBatch(db);
      
      for (const [catName, subs] of Object.entries(SYSTEM_CATEGORIES)) {
        const catRef = doc(collection(db, 'categories'));
        batch.set(catRef, { name: catName });
        
        subs.forEach(subName => {
          const subRef = doc(collection(db, 'subcategories'));
          batch.set(subRef, { name: subName, categoryId: catRef.id });
        });
      }
      
      await batch.commit();
      await fetchData();
      toast({ title: "Taxonomy Seeded", description: "13 categories and their subcategories added." });
    } catch (err) {
      toast({ variant: "destructive", title: "Seeding Failed" });
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
          <p className="text-sm text-muted-foreground">Manage administrative access and global application metrics.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={saving} className="h-10 rounded-xl font-bold">
          <RefreshCw className={cn("w-4 h-4 mr-2", saving && "animate-spin")} />
          Refresh Registry
        </Button>
      </div>

      <Tabs defaultValue="registry" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="registry" className="font-bold text-xs uppercase">Admins</TabsTrigger>
          <TabsTrigger value="taxonomy" className="font-bold text-xs uppercase">Categories</TabsTrigger>
          <TabsTrigger value="metrics" className="font-bold text-xs uppercase">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="registry" className="space-y-6">
          <Card className="border-none shadow-sm ring-1 ring-black/5 bg-white dark:bg-card">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Admin Registry
              </CardTitle>
              <CardDescription className="text-xs">Authorize team members to access the Admin Dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-3">
                <Input 
                  placeholder="Enter email address..." 
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
                        onClick={() => handleDeleteTaxonomy('admins', admin.id)}
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

        <TabsContent value="taxonomy" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm ring-1 ring-black/5 bg-white dark:bg-card">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    Categories
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={seedDefaultTaxonomy} disabled={saving} className="text-[10px] font-bold uppercase text-primary">
                    <Sparkles className="w-3 h-3 mr-1" /> Seed Default
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="Category name..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="h-10" />
                  <Button size="sm" onClick={handleAddCategory} disabled={saving}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="max-h-[400px] overflow-y-auto space-y-1">
                  {categories.map(cat => (
                    <div key={cat.id} className={cn("flex items-center justify-between p-2 rounded-lg text-xs font-medium border", selectedCatForSub === cat.id ? "bg-primary/5 border-primary/20" : "bg-muted/10")}>
                      <button onClick={() => setSelectedCatForSub(cat.id)} className="flex-1 text-left">{cat.name}</button>
                      <button onClick={() => handleDeleteTaxonomy('categories', cat.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm ring-1 ring-black/5 bg-white dark:bg-card">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  Subcategories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="Subcategory name..." value={newSubcategoryName} onChange={e => setNewSubcategoryName(e.target.value)} className="h-10" disabled={!selectedCatForSub} />
                  <Button size="sm" onClick={handleAddSubcategory} disabled={saving || !selectedCatForSub}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="max-h-[400px] overflow-y-auto space-y-1">
                  {subcategories.filter(s => s.categoryId === selectedCatForSub).map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-2 rounded-lg text-xs font-medium bg-muted/10 border">
                      <span>{sub.name}</span>
                      <button onClick={() => handleDeleteTaxonomy('subcategories', sub.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  {selectedCatForSub && subcategories.filter(s => s.categoryId === selectedCatForSub).length === 0 && (
                    <p className="text-center py-10 text-muted-foreground text-[10px] italic">No subcategories for this selection.</p>
                  )}
                  {!selectedCatForSub && (
                    <p className="text-center py-10 text-muted-foreground text-[10px] italic">Select a category to manage subcategories.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <Card className="border-none shadow-sm ring-1 ring-black/5 bg-white dark:bg-card">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-500" />
                System Data Override
              </CardTitle>
              <CardDescription className="text-xs">Manually override global metrics for maintenance or testing purposes.</CardDescription>
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
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Total Expenses Recorded</Label>
                  <Input 
                    type="number" 
                    value={stats.totalExpenses} 
                    onChange={(e) => setStats({...stats, totalExpenses: parseInt(e.target.value) || 0})}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Total Reminders Created</Label>
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
                  <strong>Warning:</strong> Updating these values directly will override automated calculations. 
                </p>
              </div>

              <Button onClick={handleUpdateStats} disabled={saving} className="w-full h-12 rounded-xl shadow-lg font-bold">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save All Metrics
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
