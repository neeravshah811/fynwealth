
"use client";

import { useState, useMemo, useEffect } from "react";
import { useFynWealthStore, SYSTEM_CATEGORIES } from "@/lib/store";
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
import { Edit2, TrendingUp, Target, PieChart, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function BudgetsPage() {
  const { budgets, expenses, updateBudget, currency, customCategories, viewMonth, viewYear } = useFynWealthStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editedLimits, setEditedLimits] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

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
      const budget = budgets.find(b => b.category === cat);
      initialLimits[cat] = budget ? budget.limit.toString() : "0";
    });
    setEditedLimits(initialLimits);
    setIsDialogOpen(true);
  };

  const handleSaveLimits = () => {
    Object.entries(editedLimits).forEach(([category, limit]) => {
      const numLimit = parseFloat(limit);
      if (!isNaN(numLimit)) {
        updateBudget(category, numLimit);
      }
    });
    setIsDialogOpen(false);
    toast({
      title: "Budgets updated",
      description: "Monthly spending limits updated successfully.",
    });
  };

  const totalSpent = allCategoriesList.reduce((sum, cat) => sum + getMonthlySpendByCategory(cat), 0);
  const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);
  const overallRemainingPercent = totalBudget > 0 ? Math.max(0, ((totalBudget - totalSpent) / totalBudget) * 100) : 0;

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline mb-2 text-primary">Budgets</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarIcon className="w-4 h-4" />
            <p>Spending limits for {format(new Date(viewYear, viewMonth), 'MMMM yyyy')}.</p>
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-primary text-primary hover:bg-primary/5" onClick={handleOpenDialog}>
              <Edit2 className="w-4 h-4 mr-2" />
              Adjust Limits
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-headline text-xl">Adjust Monthly Limits</DialogTitle>
              <DialogDescription>Set realistic targets for each category. These limits persist across months.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {allCategoriesList.map((category) => (
                <div key={category} className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor={category} className="text-right text-[10px] font-bold uppercase truncate">
                    {category}
                  </Label>
                  <div className="col-span-3 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">{currency.symbol}</span>
                    <Input 
                      id={category} 
                      type="number" 
                      className="pl-7 h-8 text-[10px]" 
                      value={editedLimits[category] || "0"} 
                      onChange={(e) => setEditedLimits({ ...editedLimits, [category]: e.target.value })} 
                    />
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={handleSaveLimits} className="bg-primary text-[10px]">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="bg-primary/5 border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-primary" />
              <span className="text-xs font-bold font-headline uppercase tracking-wider text-primary">Progress</span>
            </div>
            <div className="text-xl font-bold font-headline mb-1">{overallRemainingPercent.toFixed(0)}%</div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Remaining of Total</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-destructive" />
              <span className="text-xs font-bold font-headline uppercase tracking-wider text-muted-foreground">Total Spent</span>
            </div>
            <div className="text-xl font-bold font-headline mb-1">{currency.symbol}{formatAmount(totalSpent)}</div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Usage for {format(new Date(viewYear, viewMonth), 'MMM')}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-emerald-500" />
              <span className="text-xs font-bold font-headline uppercase tracking-wider text-muted-foreground">Budget Limit</span>
            </div>
            <div className="text-xl font-bold font-headline mb-1">{currency.symbol}{formatAmount(totalBudget)}</div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Global Monthly Target</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {allCategoriesList.map((categoryName) => {
          const budget = budgets.find(b => b.category === categoryName) || { category: categoryName, limit: 0 };
          const spent = getMonthlySpendByCategory(categoryName);
          const percent = budget.limit > 0 ? Math.min((spent / budget.limit) * 100, 100) : 0;
          const isOver = budget.limit > 0 && spent > budget.limit;
          
          return (
            <Card key={categoryName} className="border-none shadow-sm bg-card hover:ring-1 hover:ring-primary/20 transition-all">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-sm font-headline flex items-center gap-2">
                    {categoryName}
                    {isOver && <Badge variant="destructive" className="py-0 h-4 text-[8px] uppercase">Over</Badge>}
                  </CardTitle>
                  <div className="text-[10px] font-bold">
                    {currency.symbol}{formatAmount(spent)} / {currency.symbol}{formatAmount(budget.limit, 0)}
                  </div>
                </div>
                <Progress value={percent} className={`h-1.5 ${isOver ? 'bg-destructive/20' : ''}`} />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-[8px] text-muted-foreground">
                  <span>{percent.toFixed(0)}% used</span>
                  <div className="flex items-center gap-1">
                    {budget.limit > 0 ? (
                       <span className={isOver ? 'text-destructive' : 'text-emerald-500'}>
                       {isOver ? `${currency.symbol}${formatAmount(spent - budget.limit)} over` : `${currency.symbol}${formatAmount(budget.limit - spent)} left`}
                     </span>
                    ) : (
                      <span className="text-muted-foreground italic">No limit set</span>
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
