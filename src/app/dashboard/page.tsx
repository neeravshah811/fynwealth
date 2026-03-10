
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
  AlertCircle,
  HelpCircle
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { TutorialDialog } from "@/components/TutorialDialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const SpendingChart = dynamic(() => import("@/components/dashboard/SpendingChart").then(mod => mod.SpendingChart), {
  loading: () => <Card className="h-[250px] animate-pulse bg-muted/20" />
});

const CategoryPieChart = dynamic(() => import("@/components/dashboard/CategoryPieChart").then(mod => mod.CategoryPieChart), {
  loading: () => <Card className="h-[250px] animate-pulse bg-muted/20" />
});

export default function DashboardPage() {
  const { expenses, currency, viewMonth, viewYear, setViewDate, rolloverRecurring, insights } = useFynWealthStore();
  const [mounted, setMounted] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

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

  const recentExpenses = [...filteredByView]
    .filter(e => e.date <= todayStr)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

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

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setViewDate(date.getMonth(), date.getFullYear());
    }
  };

  const ExpenseRow = ({ expense }: { expense: Expense }) => (
    <div key={expense.id} className="flex items-center justify-between p-3.5 hover:bg-primary/5 transition-colors group min-w-0 border-b border-muted/30 last:border-0">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] md:text-xs shrink-0 uppercase">
          {expense.category[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs md:text-sm font-bold truncate text-foreground leading-none mb-1.5" title={expense.description}>{expense.description}</p>
          <p className="text-[10px] md:text-xs text-muted-foreground truncate uppercase tracking-tight">
            {expense.category} • {format(new Date(expense.date), 'MMM dd')}
          </p>
        </div>
      </div>
      <div className="text-xs md:text-sm font-bold text-destructive shrink-0 whitespace-nowrap ml-2">
        {currency.symbol}{formatAmount(expense.amount)}
      </div>
    </div>
  );

  const months = Array.from({ length: 12 }, (_, i) => i);
  const years = Array.from({ length: 11 }, (_, i) => 2020 + i);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20 max-w-7xl mx-auto">
      <TutorialDialog open={showTutorial} onOpenChange={setShowTutorial} />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl md:text-2xl font-bold font-headline text-primary tracking-tight">Dashboard</h1>
          <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-bold tracking-wider">{format(new Date(viewYear, viewMonth), 'MMMM yyyy')}</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 mr-2">
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

          <div className="flex items-center gap-2">
            <Select value={viewMonth.toString()} onValueChange={(v) => setViewDate(parseInt(v), viewYear)}>
              <SelectTrigger className="w-32 md:w-40 h-10 text-xs md:text-sm rounded-lg font-bold">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {months.map(m => (
                  <SelectItem key={m} value={m.toString()} className="text-xs md:text-sm">
                    {format(new Date(0, m), 'MMMM')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={viewYear.toString()} onValueChange={(v) => setViewDate(viewMonth, parseInt(v))}>
              <SelectTrigger className="w-24 md:w-28 h-10 text-xs md:text-sm rounded-lg font-bold">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()} className="text-xs md:text-sm">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <OverviewCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SpendingChart />
        </div>
        <div className="lg:col-span-1">
          <CategoryPieChart />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-card/80 backdrop-blur ring-1 ring-primary/5">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 border-b border-muted/50">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <CardTitle className="text-xs md:text-sm font-headline font-bold uppercase tracking-wider">Recent</CardTitle>
            </div>
            <Link href="/expenses" className="text-xs font-bold text-primary hover:underline uppercase tracking-tight">
              All
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="min-h-[200px]">
              {recentExpenses.map((expense) => (
                <ExpenseRow key={expense.id} expense={expense} />
              ))}
              {recentExpenses.length === 0 && (
                <div className="text-xs text-center text-muted-foreground py-16 italic">
                  No recent activity.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card/80 backdrop-blur ring-1 ring-accent/10">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 border-b border-muted/50">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-accent" />
              <CardTitle className="text-xs md:text-sm font-headline font-bold uppercase tracking-wider">Upcoming</CardTitle>
            </div>
            <Button variant="ghost" size="sm" className="h-8 px-3 text-[10px] md:text-xs font-bold text-accent uppercase tracking-tight" onClick={handleRollover}>
              <RefreshCcw className="w-3 h-3 mr-1.5" />
              Rollover
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="min-h-[200px]">
              {upcomingExpenses.map((expense) => (
                <ExpenseRow key={expense.id} expense={expense} />
              ))}
              {upcomingExpenses.length === 0 && (
                <div className="text-xs text-center text-muted-foreground py-16 italic">
                  Nothing scheduled.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-primary/5 ring-1 ring-primary/10">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 border-b border-primary/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <CardTitle className="text-xs md:text-sm font-headline font-bold uppercase tracking-wider text-primary">AI Insights</CardTitle>
            </div>
            <Link href="/insights" className="text-xs font-bold text-primary hover:underline uppercase tracking-tight">
              More
            </Link>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              {insights.predictions?.predictions?.[0] ? (
                <div className="p-3 bg-card rounded-xl border border-primary/5">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-tight">Forecast</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Expect heavy spend in {insights.predictions.predictions[0].month} due to {insights.predictions.predictions[0].reason}.
                  </p>
                </div>
              ) : (
                <div className="text-xs text-center text-muted-foreground py-4 italic">
                  Add more data for predictions.
                </div>
              )}
              
              {insights.unnecessary?.unnecessaryExpenses?.[0] ? (
                <div className="p-3 bg-accent/5 rounded-xl border border-accent/10">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-accent" />
                    <span className="text-[10px] md:text-xs font-bold text-accent uppercase tracking-tight">Saving Tip</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Review {insights.unnecessary.unnecessaryExpenses[0].description}: {insights.unnecessary.unnecessaryExpenses[0].reason}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-muted/20 rounded-xl text-center">
                  <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-bold tracking-tight mb-1">Daily Tip</p>
                  <p className="text-xs italic leading-tight">Review weekly subscriptions to save on recurring fees.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
