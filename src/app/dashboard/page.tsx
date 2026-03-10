
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { useFynWealthStore, Expense } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { 
  FileText, 
  CalendarRange, 
  RefreshCcw, 
  Calendar as CalendarIcon, 
  Loader2,
  Sparkles,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

// Lazy load heavy chart components to improve initial dashboard TTI
const SpendingChart = dynamic(() => import("@/components/dashboard/SpendingChart").then(mod => mod.SpendingChart), {
  loading: () => <Card className="h-[250px] animate-pulse bg-muted/20" />
});

const CategoryPieChart = dynamic(() => import("@/components/dashboard/CategoryPieChart").then(mod => mod.CategoryPieChart), {
  loading: () => <Card className="h-[250px] animate-pulse bg-muted/20" />
});

export default function DashboardPage() {
  const { expenses, currency, viewMonth, viewYear, setViewDate, rolloverRecurring, insights } = useFynWealthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const filteredByView = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
  });

  // Recent/Paid: Today or Past
  const recentExpenses = [...filteredByView]
    .filter(e => e.date <= todayStr)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  // Upcoming/Pending: Strictly Future
  const upcomingExpenses = [...filteredByView]
    .filter(e => e.date > todayStr)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const formatAmount = (amount: number) => {
    return Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleRollover = () => {
    rolloverRecurring();
    toast({
      title: "Recurring Expenses Rolled Over",
      description: "Copied active recurring items from previous months.",
    });
  };

  const ExpenseRow = ({ expense }: { expense: Expense }) => (
    <div key={expense.id} className="flex items-center justify-between p-3 hover:bg-primary/5 transition-colors group min-w-0 border-b border-muted/30 last:border-0">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shrink-0 uppercase">
          {expense.category[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold truncate text-foreground leading-none" title={expense.description}>{expense.description}</p>
          <p className="text-[9px] text-muted-foreground truncate uppercase tracking-tight mt-1">
            {expense.category} • {format(new Date(expense.date), 'MMM dd')}
          </p>
        </div>
      </div>
      <div className="text-[11px] font-bold text-destructive shrink-0 whitespace-nowrap ml-2">
        {currency.symbol}{formatAmount(expense.amount)}
      </div>
    </div>
  );

  const months = Array.from({ length: 12 }, (_, i) => i);
  const years = Array.from({ length: 11 }, (_, i) => 2020 + i);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-bold font-headline text-primary tracking-tight">Dashboard</h1>
          <p className="text-[10px] text-muted-foreground">{format(new Date(viewYear, viewMonth), 'MMMM yyyy')}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={viewMonth.toString()} onValueChange={(v) => setViewDate(parseInt(v), viewYear)}>
            <SelectTrigger className="w-32 h-9 text-[10px] rounded-lg">
              <CalendarIcon className="w-3 h-3 mr-1.5 text-primary" />
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m} value={m.toString()} className="text-[10px]">
                  {format(new Date(0, m), 'MMMM')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={viewYear.toString()} onValueChange={(v) => setViewDate(viewMonth, parseInt(v))}>
            <SelectTrigger className="w-24 h-9 text-[10px] rounded-lg">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y.toString()} className="text-[10px]">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <OverviewCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SpendingChart />
        </div>
        <div className="lg:col-span-1">
          <CategoryPieChart />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Recent Expenses - Includes Today */}
        <Card className="border-none shadow-sm bg-card/80 backdrop-blur ring-1 ring-primary/5">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 border-b border-muted/50">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <CardTitle className="text-xs font-headline font-bold uppercase tracking-wider">Recent</CardTitle>
            </div>
            <Link href="/expenses" className="text-[10px] font-bold text-primary hover:underline">
              All
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="min-h-[160px]">
              {recentExpenses.map((expense) => (
                <ExpenseRow key={expense.id} expense={expense} />
              ))}
              {recentExpenses.length === 0 && (
                <div className="text-[10px] text-center text-muted-foreground py-12 italic">
                  No recent activity.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming - Strictly Future */}
        <Card className="border-none shadow-sm bg-card/80 backdrop-blur ring-1 ring-accent/10">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 border-b border-muted/50">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-accent" />
              <CardTitle className="text-xs font-headline font-bold uppercase tracking-wider">Upcoming</CardTitle>
            </div>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[9px] font-bold text-accent" onClick={handleRollover}>
              <RefreshCcw className="w-3 h-3 mr-1" />
              Rollover
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="min-h-[160px]">
              {upcomingExpenses.map((expense) => (
                <ExpenseRow key={expense.id} expense={expense} />
              ))}
              {upcomingExpenses.length === 0 && (
                <div className="text-[10px] text-center text-muted-foreground py-12 italic">
                  Nothing scheduled.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Insights Summary */}
        <Card className="border-none shadow-sm bg-primary/5 ring-1 ring-primary/10">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 border-b border-primary/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <CardTitle className="text-xs font-headline font-bold uppercase tracking-wider text-primary">AI Insights</CardTitle>
            </div>
            <Link href="/insights" className="text-[10px] font-bold text-primary hover:underline">
              More
            </Link>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-3">
              {insights.predictions?.predictions?.[0] ? (
                <div className="p-2 bg-card rounded-lg border border-primary/5">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-bold text-primary uppercase">Forecast</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">
                    Expect heavy spend in {insights.predictions.predictions[0].month} due to {insights.predictions.predictions[0].reason}.
                  </p>
                </div>
              ) : (
                <div className="text-[10px] text-center text-muted-foreground py-2 italic">
                  Add more data for predictions.
                </div>
              )}
              
              {insights.unnecessary?.unnecessaryExpenses?.[0] ? (
                <div className="p-2 bg-accent/5 rounded-lg border border-accent/10">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-3 h-3 text-accent" />
                    <span className="text-[10px] font-bold text-accent uppercase">Saving Tip</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">
                    Review {insights.unnecessary.unnecessaryExpenses[0].description}: {insights.unnecessary.unnecessaryExpenses[0].reason}
                  </p>
                </div>
              ) : (
                <div className="p-2 bg-muted/20 rounded-lg text-center">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight">Daily Tip</p>
                  <p className="text-[10px] italic mt-1 leading-tight">Review weekly subscriptions to save on recurring fees.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
