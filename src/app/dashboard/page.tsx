"use client";

import { useEffect, useState } from "react";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { SpendingChart } from "@/components/dashboard/SpendingChart";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { useFynWealthStore, SUPPORTED_CURRENCIES, Expense } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Coins, ChevronRight, FileText, CalendarRange, RefreshCcw, Calendar as CalendarIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const { expenses, currency, setCurrency, viewMonth, viewYear, setViewDate, rolloverRecurring } = useFynWealthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const filteredByView = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
  });

  const recentExpenses = [...filteredByView]
    .filter(e => e.date <= todayStr)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const upcomingExpenses = [...filteredByView]
    .filter(e => e.date > todayStr)
    .sort((a, b) => new Date(a.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

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
    <div key={expense.id} className="flex items-center justify-between p-4 hover:bg-primary/5 transition-colors group min-w-0">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 uppercase">
          {expense.category[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate text-foreground" title={expense.description}>{expense.description}</p>
          <p className="text-xs text-muted-foreground truncate uppercase tracking-wider mt-1">
            {expense.category} {expense.subCategory ? `• ${expense.subCategory}` : ''} • {format(new Date(expense.date), 'MMM dd, yyyy')}
          </p>
        </div>
      </div>
      <div className="text-sm font-bold text-destructive shrink-0 whitespace-nowrap ml-4">
        {currency.symbol}{formatAmount(expense.amount)}
      </div>
    </div>
  );

  const months = Array.from({ length: 12 }, (_, i) => i);
  const years = Array.from({ length: 11 }, (_, i) => 2020 + i);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold font-headline text-primary tracking-tight">Financial Dashboard</h1>
          <p className="text-sm text-muted-foreground">Reviewing finances for {format(new Date(viewYear, viewMonth), 'MMMM yyyy')}.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={viewMonth.toString()} onValueChange={(v) => setViewDate(parseInt(v), viewYear)}>
            <SelectTrigger className="w-40 h-11 text-sm">
              <CalendarIcon className="w-4 h-4 mr-2 text-primary" />
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m} value={m.toString()} className="text-sm">
                  {format(new Date(0, m), 'MMMM')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={viewYear.toString()} onValueChange={(v) => setViewDate(viewMonth, parseInt(v))}>
            <SelectTrigger className="w-28 h-11 text-sm">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y.toString()} className="text-sm">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <OverviewCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <SpendingChart />
        </div>
        <div className="lg:col-span-1">
          <CategoryPieChart />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Expenses */}
        <Card className="border-none shadow-sm bg-card/80 backdrop-blur flex flex-col overflow-hidden ring-1 ring-primary/5">
          <CardHeader className="flex flex-row items-center justify-between shrink-0 border-b border-muted/50 pb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg font-headline">Recent Expenses</CardTitle>
            </div>
            <Link href="/expenses" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-muted/50">
              {recentExpenses.map((expense) => (
                <ExpenseRow key={expense.id} expense={expense} />
              ))}
              {recentExpenses.length === 0 && (
                <div className="text-sm text-center text-muted-foreground py-16">
                  No recent expenses recorded for this month.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Expenses */}
        <Card className="border-none shadow-sm bg-card/80 backdrop-blur flex flex-col overflow-hidden ring-1 ring-accent/10">
          <CardHeader className="flex flex-row items-center justify-between shrink-0 border-b border-muted/50 pb-4">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-accent" />
              <CardTitle className="text-lg font-headline">Upcoming & Recurring</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 text-xs font-bold text-accent border-accent/30 hover:bg-accent/5"
                onClick={handleRollover}
              >
                <RefreshCcw className="w-3.5 h-3.5 mr-2" />
                Rollover
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-muted/50">
              {upcomingExpenses.map((expense) => (
                <ExpenseRow key={expense.id} expense={expense} />
              ))}
              {upcomingExpenses.length === 0 && (
                <div className="text-sm text-center text-muted-foreground py-16">
                  No upcoming scheduled expenses.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-card/80 backdrop-blur ring-1 ring-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg font-headline">Currency Preference</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground leading-relaxed">Change the default currency used across the entire application. All past data will be updated to display with this symbol.</p>
            </div>
            <div className="w-full md:w-72 space-y-2">
              <Label htmlFor="currency-select" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Current Currency</Label>
              <Select value={currency.code} onValueChange={setCurrency}>
                <SelectTrigger id="currency-select" className="w-full h-12 text-sm">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code} className="text-sm">
                      {c.name} ({c.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
