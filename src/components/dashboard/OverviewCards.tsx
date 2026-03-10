
"use client";

import { useEffect, useState } from "react";
import { useFynWealthStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, PieChart, Wallet, Coins, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function OverviewCards() {
  const { expenses, budgets, currency, viewMonth, viewYear, privacyMode } = useFynWealthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-muted/50 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const currentMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
  });

  const paidSpend = currentMonthExpenses
    .filter(e => e.status === 'paid')
    .reduce((sum, e) => sum + e.amount, 0);

  const pendingBills = currentMonthExpenses
    .filter(e => e.status === 'unpaid')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalBudgetAmount = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalBalance = totalBudgetAmount - (paidSpend + pendingBills);

  const formatAmount = (amount: number) => {
    return Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card className="shadow-sm border-none bg-card/80 backdrop-blur overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-headline">Monthly Spend</CardTitle>
          <Wallet className="w-4 h-4 text-primary shrink-0" />
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold font-headline truncate", privacyMode && "blur-md select-none")}>
            {currency.symbol}{formatAmount(paidSpend)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span className="text-emerald-500 font-medium">Realized transactions</span>
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-none bg-card/80 backdrop-blur overflow-hidden ring-1 ring-accent/10">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-headline">Pending Bills</CardTitle>
          <Clock className="w-4 h-4 text-accent shrink-0" />
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold font-headline truncate text-accent", privacyMode && "blur-md select-none")}>
            {currency.symbol}{formatAmount(pendingBills)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Upcoming commitments
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-none bg-card/80 backdrop-blur overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-headline">Total Budget</CardTitle>
          <PieChart className="w-4 h-4 text-emerald-500 shrink-0" />
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold font-headline truncate", privacyMode && "blur-md select-none")}>
            {currency.symbol}{formatAmount(totalBudgetAmount)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Monthly target
          </p>
        </CardContent>
      </Card>

      <Card className={`shadow-sm border-none bg-card/80 backdrop-blur overflow-hidden ${totalBalance < 0 ? 'ring-1 ring-destructive/20' : ''}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-headline">Total Balance</CardTitle>
          <Coins className={`w-4 h-4 shrink-0 ${totalBalance < 0 ? 'text-destructive' : 'text-primary'}`} />
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold font-headline truncate", totalBalance < 0 && 'text-destructive', privacyMode && "blur-md select-none")}>
            {currency.symbol}{formatAmount(totalBalance)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 truncate">
            {totalBalance < 0 ? 'Budget exceeded' : 'Remaining available'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
