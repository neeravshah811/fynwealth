
"use client";

import { useEffect, useState } from "react";
import { useFynWealthStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, PieChart, Wallet as WalletIcon, Clock, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

export function OverviewCards() {
  const { expenses, budgets, currency, viewMonth, viewYear, privacyMode } = useFynWealthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-muted/50 animate-pulse rounded-xl" />
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

  const MetricCard = ({ title, amount, icon: Icon, colorClass, subtext }: any) => (
    <Card className="shadow-sm border-none bg-card/80 backdrop-blur overflow-hidden ring-1 ring-muted/20 h-auto min-h-[90px] md:min-h-[100px]">
      <CardHeader className="flex flex-row items-center justify-between p-3 pb-1 space-y-0">
        <CardTitle className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
        <Icon className={cn("w-3.5 h-3.5 md:w-4 md:h-4 shrink-0", colorClass)} />
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className={cn("text-lg md:text-xl font-bold font-headline truncate leading-tight", privacyMode && "blur-md select-none", colorClass)}>
          {currency.symbol}{formatAmount(amount)}
        </div>
        <p className="text-[9px] md:text-[10px] text-muted-foreground mt-1 truncate font-medium uppercase tracking-tight">
          {subtext}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      <MetricCard 
        title="Spent" 
        amount={paidSpend} 
        icon={Wallet} 
        colorClass="text-primary" 
        subtext="Realized total" 
      />
      <MetricCard 
        title="Pending" 
        amount={pendingBills} 
        icon={Clock} 
        colorClass="text-accent" 
        subtext="Due commitments" 
      />
      <MetricCard 
        title="Budget" 
        amount={totalBudgetAmount} 
        icon={PieChart} 
        colorClass="text-emerald-500" 
        subtext="Monthly target" 
      />
      <MetricCard 
        title="Balance" 
        amount={totalBalance} 
        icon={Coins} 
        colorClass={totalBalance < 0 ? "text-destructive" : "text-primary"} 
        subtext={totalBalance < 0 ? "Exceeded limit" : "Available left"} 
      />
    </div>
  );
}
