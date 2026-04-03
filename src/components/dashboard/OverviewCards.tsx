"use client";

import { useEffect, useState, useMemo } from "react";
import { useFynWealthStore } from "@/lib/store";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReceiptText, Target, Timer, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export function OverviewCards() {
  const { currency, viewMonth, viewYear, privacyMode } = useFynWealthStore();
  const { user } = useUser();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const budgetsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return collection(db, 'users', user.uid, 'budgets');
  }, [db, user?.uid]);

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    const startDate = format(new Date(viewYear, viewMonth, 1), 'yyyy-MM-dd');
    const endDate = format(new Date(viewYear, viewMonth + 1, 0), 'yyyy-MM-dd');
    
    return query(
      collection(db, 'users', user.uid, 'expenses'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
  }, [db, user?.uid, viewMonth, viewYear]);

  const { data: budgets, isLoading: budgetsLoading } = useCollection(budgetsQuery);
  const { data: expenses, isLoading: expensesLoading } = useCollection(expensesQuery);

  /**
   * Unified number parser to ensure consistency across app
   */
  const toNum = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    let cleaned = String(val).trim();
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.slice(1, -1);
    }
    cleaned = cleaned.replace(/[^0-9.-]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  };

  const stats = useMemo(() => {
    if (!expenses && !budgets) return { paidSpend: 0, pendingBills: 0, totalBudgetAmount: 0, totalBalance: 0 };
    
    const paid = (expenses || [])
      .filter(e => e.status === 'paid' || !e.status)
      .reduce((sum, e) => sum + toNum(e.amount), 0);

    const pending = (expenses || [])
      .filter(e => e.status === 'unpaid')
      .reduce((sum, e) => sum + toNum(e.amount), 0);

    const budget = (budgets || []).reduce((sum, b) => sum + toNum(b.limit), 0);
    const balance = budget - (paid + pending);

    return { paidSpend: paid, pendingBills: pending, totalBudgetAmount: budget, totalBalance: balance };
  }, [expenses, budgets]);

  if (!mounted || budgetsLoading || expensesLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-muted/50 animate-pulse rounded-[20px]" />
        ))}
      </div>
    );
  }

  const formatAmount = (amount: number) => {
    return Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const MetricCard = ({ title, amount, icon: Icon, colorClass, subtext }: any) => {
    const isNegative = amount < 0;
    return (
      <Card className="border-none bg-card shadow-sm transition-all hover:shadow-md ring-1 ring-black/5">
        <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
          <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{title}</CardTitle>
          <div className="p-2 rounded-xl bg-muted/30">
            <Icon className={cn("w-4 h-4", colorClass)} />
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className={cn("text-2xl font-bold font-headline truncate tracking-tight mb-1", privacyMode && "blur-md select-none", colorClass)}>
            {isNegative && "-"}{currency.symbol}{formatAmount(amount)}
          </div>
          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider opacity-70">
            {subtext}
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div id="tour-overview" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <MetricCard 
        title="Spent" 
        amount={stats.paidSpend} 
        icon={ReceiptText} 
        colorClass="text-primary" 
        subtext="Actual Paid" 
      />
      <MetricCard 
        title="Pending" 
        amount={stats.pendingBills} 
        icon={Timer} 
        colorClass="text-accent" 
        subtext="Unpaid Dues" 
      />
      <MetricCard 
        title="Budget" 
        amount={stats.totalBudgetAmount} 
        icon={Target} 
        colorClass="text-emerald-600" 
        subtext="Monthly Goal" 
      />
      <MetricCard 
        title="Balance" 
        amount={stats.totalBalance} 
        icon={Wallet} 
        colorClass={stats.totalBalance < 0 ? "text-destructive" : "text-primary"} 
        subtext="Remaining" 
      />
    </div>
  );
}
