"use client";

import { useState, useMemo, useEffect } from "react";
import { useFynWealthStore, SYSTEM_CATEGORIES } from "@/lib/store";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Edit2, 
  TrendingUp, 
  Target, 
  PieChart, 
  Calendar as CalendarIcon, 
  Loader2,
  HelpCircle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { TutorialDialog } from "@/components/TutorialDialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export default function BudgetsPage() {
  const { expenses, currency, customCategories, viewMonth, viewYear, setViewDate } = useFynWealthStore();
  const { user } = useUser();
  const firestore = useFirestore();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [editedLimits, setEditedLimits] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

  // Firestore Budgets Query
  const budgetsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'users', user.uid, 'budgets');
  }, [firestore, user?.uid]);

  const { data: budgetsData, isLoading: budgetsLoading } = useCollection(budgetsQuery);

  useEffect(() => {
    setMounted(true);
  }, []);

  const allCategoriesList = useMemo(() => {
    return Object.keys({ ...SYSTEM_CATEGORIES, ...customCategories });
  }, [customCategories]);

  const getMonthlySpendByCategory = (category: string) => {
    return expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === viewMonth && d.getFullYear() === viewYear && e.category === category;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const formatAmount = (amount: number, decimals: number = 2) => {
    return amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const handleOpenDialog = () => {
    const initialLimits: Record<string, string> = {};
    allCategoriesList.forEach(cat => {
      const budgetDoc = budgetsData?.find(b => b.category === cat);
      initialLimits[cat] = budgetDoc ? budgetDoc.limit.toString() : "0";
    });
    setEditedLimits(initialLimits);
    setIsDialogOpen(true);
  };

  const handleSaveLimits = async () => {
    if (!firestore || !user?.uid) return;

    try {
      const promises = Object.entries(editedLimits).map(([category, limit]) => {
        const numLimit = parseFloat(limit);
        if (!isNaN(numLimit)) {
          // Document ID is the category name for easier direct access
          const docId = category.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          const docRef = doc(firestore, 'users', user.uid, 'budgets', docId);
          return setDoc(docRef, {
            category,
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
        description: "Monthly spending limits updated successfully in cloud storage.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not save budget limits. Check permissions.",
      });
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setViewDate(date.getMonth(), date.getFullYear());
    }
  };

  const totalSpent = allCategoriesList.reduce((sum, cat) => sum + getMonthlySpendByCategory(cat), 0);
  const totalBudget = budgetsData?.reduce((sum, b) => sum + (b.limit || 0), 0) || 0;
  const overallRemainingPercent = totalBudget > 0 ? Math.max(0, ((totalBudget - totalSpent) / totalBudget) * 100) : 0;

  if (!mounted || budgetsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <TutorialDialog open={showTutorial} onOpenChange={setShowTutorial} />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div>
          <h1 className="text-3xl font-bold font-headline mb-1 text-primary">Budgets</h1>
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{format(new Date(viewYear, viewMonth), 'MMMM yyyy')}</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 rounded-lg shadow-sm border-primary/20 text-primary hover:bg-primary/5 transition-colors"
              onClick={() => setShowTutorial(true)}
              title="Show Tutorial"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-10 w-10 rounded-lg shadow-sm border-primary/20 text-primary hover:bg-primary/5 transition-colors"
                  title="Select Date"
                >
                  <CalendarIcon className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-2xl overflow-hidden mt-2" align="end">
                <Calendar
                  mode="single"
                  selected={new Date(viewYear, viewMonth)}
                  onSelect={handleCalendarSelect}
                  initialFocus
                  captionLayout="dropdown"
                  fromYear={2020}
                  toYear={2035}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenDialog} className="h-11 px-6 rounded-xl font-bold shadow-lg shadow-primary/20">
                <Edit2 className="w-4 h-4 mr-2" />
                Adjust Limits
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto rounded-3xl">
              <DialogHeader>
                <DialogTitle className="font-headline text-2xl font-bold text-primary">Adjust Monthly Limits</DialogTitle>
                <DialogDescription>Set realistic targets for each category. These limits persist in your cloud profile.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-6">
                {allCategoriesList.map((category) => (
                  <div key={category} className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={category} className="text-right text-[10px] font-bold uppercase truncate text-muted-foreground">
                      {category}
                    </Label>
                    <div className="col-span-3 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">{currency.symbol}</span>
                      <Input 
                        id={category} 
                        type="number" 
                        className="pl-8 h-10 text-sm font-bold rounded-xl" 
                        value={editedLimits[category] || "0"} 
                        onChange={(e) => setEditedLimits({ ...editedLimits, [category]: e.target.value })} 
                      />
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button onClick={handleSaveLimits} className="w-full h-12 rounded-xl font-bold">Save to Cloud</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="bg-primary/5 border-none shadow-sm ring-1 ring-primary/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-primary" />
              <span className="text-xs font-bold font-headline uppercase tracking-wider text-primary">Progress</span>
            </div>
            <div className="text-2xl font-bold font-headline mb-1">{overallRemainingPercent.toFixed(0)}%</div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Remaining of Total</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 border-none shadow-sm ring-1 ring-black/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-destructive" />
              <span className="text-xs font-bold font-headline uppercase tracking-wider text-muted-foreground">Total Spent</span>
            </div>
            <div className="text-2xl font-bold font-headline mb-1">{currency.symbol}{formatAmount(totalSpent)}</div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Usage for {format(new Date(viewYear, viewMonth), 'MMM')}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 border-none shadow-sm ring-1 ring-black/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-emerald-500" />
              <span className="text-xs font-bold font-headline uppercase tracking-wider text-muted-foreground">Budget Limit</span>
            </div>
            <div className="text-2xl font-bold font-headline mb-1">{currency.symbol}{formatAmount(totalBudget)}</div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Global Monthly Target</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {allCategoriesList.map((categoryName) => {
          const budgetDoc = budgetsData?.find(b => b.category === categoryName);
          const limit = budgetDoc?.limit || 0;
          const spent = getMonthlySpendByCategory(categoryName);
          const percent = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
          const isOver = limit > 0 && spent > limit;
          
          return (
            <Card key={categoryName} className="border-none shadow-sm bg-card hover:ring-1 hover:ring-primary/20 transition-all ring-1 ring-black/5">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-3">
                  <CardTitle className="text-sm font-headline flex items-center gap-2 font-bold">
                    {categoryName}
                    {isOver && <Badge variant="destructive" className="py-0 h-4 text-[8px] uppercase font-bold">Over</Badge>}
                  </CardTitle>
                  <div className="text-[10px] font-bold">
                    <span className="text-foreground">{currency.symbol}{formatAmount(spent)}</span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="text-muted-foreground">{currency.symbol}{formatAmount(limit, 0)}</span>
                  </div>
                </div>
                <Progress value={percent} className={`h-2 ${isOver ? 'bg-destructive/20' : ''}`} />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                  <span className="text-muted-foreground">{percent.toFixed(0)}% utilized</span>
                  <div className="flex items-center gap-1">
                    {limit > 0 ? (
                       <span className={isOver ? 'text-destructive' : 'text-emerald-600'}>
                       {isOver ? `${currency.symbol}${formatAmount(spent - limit)} over` : `${currency.symbol}${formatAmount(limit - spent)} available`}
                     </span>
                    ) : (
                      <span className="text-muted-foreground italic opacity-50">No limit defined</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}