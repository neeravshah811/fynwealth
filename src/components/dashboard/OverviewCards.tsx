
"use client";

import { useEffect, useState, useMemo } from "react";
import { useFynWealthStore } from "@/lib/store";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, PieChart, Clock, Coins, Loader2 } from "lucide-react";
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

  const stats = useMemo(() => {
    if (!expenses && !budgets) return { paidSpend: 0, pendingBills: 0, totalBudgetAmount: 0, totalBalance: 0 };
    
    const paid = (expenses || [])
      .filter(e => e.status === 'paid' || !e.status)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const pending = (expenses || [])
      .filter(e => e.status === 'unpaid')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const budget = (budgets || []).reduce((sum, b) => sum + (Number(b.limit) || 0), 0);
    const balance = budget - (paid + pending);

    return { paidSpend: paid, pendingBills: pending, totalBudgetAmount: budget, totalBalance: balance };
  }, [expenses, budgets]);

  if (!mounted || budgetsLoading || expensesLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted/50 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  const formatAmount = (amount: number) => {
    return Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const MetricCard = ({ title, amount, icon: Icon, colorClass, subtext }: any) => (
    <Card className="shadow-sm border-none bg-card/80 backdrop-blur ring-1 ring-muted/20">
      <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
        <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase">{title}</CardTitle>
        <Icon className={cn("w-3.5 h-3.5", colorClass)} />
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className={cn("text-lg font-bold font-headline truncate", privacyMode && "blur-md select-none", colorClass)}>
          {currency.symbol}{formatAmount(amount)}
        </div>
        <p className="text-[9px] text-muted-foreground mt-1 uppercase font-bold tracking-tight">
          {subtext}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      <MetricCard title="Spent" amount={stats.paidSpend} icon={Wallet} colorClass="text-primary" subtext="Month Total" />
      <MetricCard title="Pending" amount={stats.pendingBills} icon={Clock} colorClass="text-accent" subtext="Upcoming" />
      <MetricCard title="Budget" amount={stats.totalBudgetAmount} icon={PieChart} colorClass="text-emerald-500" subtext="Target" />
      <MetricCard title="Balance" amount={stats.totalBalance} icon={Coins} colorClass={stats.totalBalance < 0 ? "text-destructive" : "text-primary"} subtext="Remaining" />
    </div>
  );
}
