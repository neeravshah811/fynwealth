"use client";

import { useState, useMemo, useEffect } from "react";
import { useFynWealthStore } from "@/lib/store";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Edit2, 
  TrendingUp, 
  Target, 
  PieChart, 
  Loader2,
  Tag
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function BudgetsPage() {
  const { currency, viewMonth, viewYear } = useFynWealthStore();
  const { user } = useUser();
  const firestore = useFirestore();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editedLimits, setEditedLimits] = useState<Record<string, string>>({});
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    async function loadCategories() {
      if (!firestore) return;
      try {
        const snapshot = await getDocs(collection(firestore, "categories"));
        const catMap = new Map();
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const normalized = data.name?.trim().toLowerCase();
          if (!normalized) return;
          
          if (!catMap.has(normalized) || data.userId === user?.uid) {
            catMap.set(normalized, { id: doc.id, ...data });
          }
        });
        
        setCategories(Array.from(catMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    }
    loadCategories();
  }, [firestore, user?.uid]);

  const budgetsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'users', user.uid, 'budgets');
  }, [firestore, user?.uid]);

  const { data: budgetsData, isLoading: budgetsLoading } = useCollection(budgetsQuery);

  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    const startDate = format(new Date(viewYear, viewMonth, 1), 'yyyy-MM-dd');
    const endDate = format(new Date(viewYear, viewMonth + 1, 0), 'yyyy-MM-dd');
    
    return query(
      collection(firestore, 'users', user.uid, 'expenses'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
  }, [firestore, user?.uid, viewMonth, viewYear]);

  const { data: expensesData, isLoading: expensesLoading } = useCollection(expensesQuery);
  const expenses = expensesData || [];

  useEffect(() => {
    setMounted(true);
  }, []);

  const budgetStats = useMemo(() => {
    const totalSpent = expenses
      .filter(e => e.status === 'paid' || !e.status)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const totalBudget = budgetsData?.reduce((sum, b) => sum + (Number(b.limit) || 0), 0) || 0;
    const overallRemainingPercent = totalBudget > 0 ? Math.max(0, ((totalBudget - totalSpent) / totalBudget) * 100) : 0;

    return { totalSpent, totalBudget, overallRemainingPercent };
  }, [expenses, budgetsData]);

  const getMonthlySpendByCategory = (categoryId: string, categoryName: string) => {
    return expenses
      .filter(e => 
        (e.categoryId === categoryId || e.categoryName === categoryName || e.category === categoryName) &&
        (e.status === 'paid' || !e.status)
      )
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  };

  const handleOpenDialog = (categoryId?: string) => {
    const initialLimits: Record<string, string> = {};
    if (categoryId) {
      setActiveCategoryId(categoryId);
      const budgetDoc = budgetsData?.find(b => b.categoryId === categoryId);
      initialLimits[categoryId] = (budgetDoc && budgetDoc.limit !== 0) ? budgetDoc.limit.toString() : "";
    } else {
      setActiveCategoryId(null);
      categories.forEach(cat => {
        const budgetDoc = budgetsData?.find(b => b.categoryId === cat.id);
        initialLimits[cat.id] = (budgetDoc && budgetDoc.limit !== 0) ? budgetDoc.limit.toString() : "";
      });
    }
    setEditedLimits(initialLimits);
    setIsDialogOpen(true);
  };

  const handleSaveLimits = async () => {
    if (!firestore || !user?.uid) return;

    try {
      const entriesToSave = activeCategoryId 
        ? [[activeCategoryId, editedLimits[activeCategoryId]]] 
        : Object.entries(editedLimits);

      const promises = entriesToSave.map(([catId, limit]) => {
        const numLimit = limit === "" ? 0 : parseFloat(limit || "0");
        if (!isNaN(numLimit)) {
          const categoryObj = categories.find(c => c.id === catId);
          const docRef = doc(firestore, 'users', user.uid, 'budgets', catId);
          return setDoc(docRef, {
            categoryId: catId,
            categoryName: categoryObj?.name || "Unknown",
            limit: numLimit,
            userId: user.uid,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      
      setIsDialogOpen(false);
      toast({
        title: "Budgets updated",
        description: "Spending limits updated successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not save budget limits.",
      });
    }
  };

  if (!mounted || budgetsLoading || expensesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary/30 animate-spin" />
      </div>
    );
  }

  const activeCategoryName = activeCategoryId ? categories.find(c => c.id === activeCategoryId)?.name : null;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-24 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 px-1">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-headline text-primary tracking-tight">Budgets</h1>
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">{format(new Date(viewYear, viewMonth), 'MMMM yyyy')}</p>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          <Button onClick={() => handleOpenDialog()} className="h-11 px-8 rounded-xl font-bold shadow-lg transition-all active:scale-95">
            <Edit2 className="w-4 h-4 mr-2" />
            Adjust Limits
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-[20px] p-8 border-none shadow-2xl gap-0">
          <DialogHeader className="pb-6 border-b border-muted/50 mb-8">
            <DialogTitle className="font-headline text-2xl font-bold text-primary">
              {activeCategoryName ? `Adjust ${activeCategoryName} Limit` : 'Adjust All Limits'}
            </DialogTitle>
            <DialogDescription className="text-sm mt-2">
              {activeCategoryName 
                ? `Set a realistic target for the ${activeCategoryName} category.` 
                : 'Set realistic targets for each category from your cloud registry.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin mb-8">
            {categories
              .filter(cat => !activeCategoryId || cat.id === activeCategoryId)
              .map((cat) => (
              <div key={cat.id} className="grid grid-cols-4 items-center gap-4 group">
                <Label htmlFor={cat.id} className="text-right text-[10px] font-bold uppercase truncate text-muted-foreground group-hover:text-primary transition-colors tracking-widest">
                  {cat.name}
                </Label>
                <div className="col-span-3 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">{currency.symbol}</span>
                  <input 
                    id={cat.id} 
                    type="number" 
                    className="flex h-11 w-full rounded-xl border border-input bg-muted/30 py-2 pl-9 pr-4 text-sm font-bold shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all" 
                    placeholder="0.00"
                    value={editedLimits[cat.id] ?? ""} 
                    onChange={(e) => setEditedLimits({ ...editedLimits, [cat.id]: e.target.value })} 
                  />
                </div>
              </div>
            ))}
            {categories.length === 0)$ (
              <p className="text-center py-12 text-muted-foreground text-sm italic font-medium">No categories defined in registry.</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSaveLimits} className="w-full h-14 rounded-xl font-bold text-base shadow-lg transition-all active:scale-95">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div id="tour-budget-progress" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-none shadow-sm ring-1 ring-primary/10 transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Target className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold font-headline uppercase tracking-widest text-primary">Progress</span>
            </div>
            <div className="text-3xl font-bold font-headline mb-1 tracking-tight">{budgetStats.overallRemainingPercent.toFixed(0)}%</div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Remaining of Total</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-none shadow-sm transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold font-headline uppercase tracking-widest text-muted-foreground">Total Spent</span>
            </div>
            <div className="text-3xl font-bold font-headline mb-1 tracking-tight">{formatCurrency(budgetStats.totalSpent, currency.symbol, true)}</div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Usage for {format(new Date(viewYear, viewMonth), 'MMM')}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-none shadow-sm transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <PieChart className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold font-headline uppercase tracking-widest text-muted-foreground">Budget Limit</span>
            </div>
            <div className="text-3xl font-bold font-headline mb-1 tracking-tight">{formatCurrency(budgetStats.totalBudget, currency.symbol, true)}</div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Global Monthly Target</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        {categories.map((cat) => {
          const budgetDoc = budgetsData?.find(b => b.categoryId === cat.id);
          const limit = Number(budgetDoc?.limit) || 0;
          const spent = getMonthlySpendByCategory(cat.id, cat.name);
          const percent = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
          const isOver = limit > 0 && spent > limit;
          
          return (
            <Card key={cat.id} className="border-none bg-card hover:shadow-md transition-all group">
              <CardHeader className="pb-5 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <CardTitle className="text-base font-headline font-bold truncate">
                      {cat.name}
                    </CardTitle>
                    {isOver && <Badge variant="destructive" className="py-0 h-5 text-[9px] uppercase font-bold shadow-sm shadow-destructive/20">Over</Badge>}
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleOpenDialog(cat.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all lg:opacity-0 group-hover:opacity-100"
                      title="Edit Limit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-foreground">{formatCurrency(spent, currency.symbol)}</span>
                      <span className="text-muted-foreground mx-2 text-[10px] opacity-50">/</span>
                      <span className="text-xs font-bold text-muted-foreground">{formatCurrency(limit, currency.symbol, true)}</span>
                    </div>
                  </div>
                </div>
                <Progress value={percent} className={cn("h-2.5 rounded-full", isOver ? 'bg-destructive/20' : 'bg-muted/50')} />
              </CardHeader>
              <CardContent className="pt-0 p-6">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-muted-foreground">{percent.toFixed(0)}% utilized</span>
                  <div className="flex items-center gap-2">
                    {limit > 0 ? (
                       <span className={cn("px-2.5 py-1 rounded-lg border font-bold", isOver ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100')}>
                       {isOver ? `${formatCurrency(spent - limit, currency.symbol)} over` : `${formatCurrency(limit - spent, currency.symbol)} left`}
                     </span>
                    ) : (
                      <span className="text-muted-foreground/40 italic font-medium">No limit set</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {categories.length === 0 && (
          <div className="lg:col-span-2 text-center py-32 bg-muted/10 rounded-[20px] border-2 border-dashed border-muted/50 flex flex-col items-center justify-center gap-4">
            <Tag className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-sm font-bold text-muted-foreground italic">No categories found. Please seed them in Admin Settings.</p>
          </div>
        )}
      </div>
    </div>
  );
}
