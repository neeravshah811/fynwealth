"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { useFynWealthStore } from "@/lib/store";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { 
  FileText, 
  CalendarRange, 
  Calendar as CalendarIcon, 
  Loader2,
  Sparkles,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Tag
} from "lucide-react";
import Link from "next/link";
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
  const { currency, viewMonth, viewYear, setViewDate, insights } = useFynWealthStore();
  const { user } = useUser();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    const startDate = format(new Date(viewYear, viewMonth, 1), 'yyyy-MM-dd');
    const endDate = format(new Date(viewYear, viewMonth + 1, 0), 'yyyy-MM-dd');
    
    return query(
      collection(db, 'users', user.uid, 'expenses'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
  }, [db, user?.uid, viewMonth, viewYear]);

  const { data: expensesData, isLoading: expensesLoading } = useCollection(expensesQuery);
  const expenses = expensesData || [];

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const recentExpenses = [...expenses]
    .filter(e => e.date <= todayStr)
    .slice(0, 3);

  const upcomingExpenses = [...expenses]
    .filter(e => e.date > todayStr)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const formatAmount = (amount: number) => {
    return Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setViewDate(date.getMonth(), date.getFullYear());
    }
  };

  const ExpenseRow = ({ expense }: { expense: any }) => (
    <div key={expense.id} className="flex items-center justify-between p-4 hover:bg-primary/5 transition-colors group min-w-0 border-b border-muted/30 last:border-0">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground shrink-0 transition-colors group-hover:text-primary">
          <Tag className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate text-foreground leading-none mb-1.5" title={expense.description || expense.note}>{expense.description || expense.note || "No description"}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-muted-foreground truncate uppercase tracking-tight font-bold">
              {format(new Date(expense.date), 'MMM dd')}
            </span>
            <span className="text-[8px] text-muted-foreground/30">•</span>
            <Badge variant="secondary" className="bg-primary/5 text-primary text-[8px] px-2 py-0.5 h-auto border-none font-bold uppercase inline-flex items-center text-center">
              {expense.categoryName || expense.category || "General"}
            </Badge>
          </div>
        </div>
      </div>
      <div className="text-sm font-bold text-foreground shrink-0 whitespace-nowrap ml-4">
        {currency.symbol}{formatAmount(expense.amount)}
      </div>
    </div>
  );

  const months = Array.from({ length: 12 }, (_, i) => i);
  const years = Array.from({ length: 16 }, (_, i) => 2020 + i);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20 max-w-7xl mx-auto">
      <TutorialDialog open={showTutorial} onOpenChange={setShowTutorial} />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-bold font-headline text-primary tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">{format(new Date(viewYear, viewMonth), 'MMMM yyyy')}</p>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-11 w-11 rounded-xl shadow-sm border-primary/20 text-primary hover:bg-primary/5 transition-all"
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
                  className="h-11 w-11 rounded-xl shadow-sm border-primary/20 text-primary hover:bg-primary/5 transition-all"
                  title="Select Date"
                >
                  <CalendarIcon className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-[20px] overflow-hidden mt-4" align="end">
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
              <SelectTrigger className="w-36 md:w-44 h-11 text-sm rounded-xl font-bold">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {months.map(m => (
                  <SelectItem key={m} value={m.toString()} className="text-sm">
                    {format(new Date(0, m), 'MMMM')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={viewYear.toString()} onValueChange={(v) => setViewDate(viewMonth, parseInt(v))}>
              <SelectTrigger className="w-28 md:w-32 h-11 text-sm rounded-xl font-bold">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()} className="text-sm">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="border-none bg-card shadow-sm ring-1 ring-black/5">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-3 border-b border-muted/50">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary" />
              <CardTitle className="text-xs md:text-sm font-headline font-bold uppercase tracking-widest text-muted-foreground">Recent</CardTitle>
            </div>
            <Link href="/expenses" className="text-xs font-bold text-primary hover:underline uppercase tracking-tight">
              All
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="min-h-[200px]">
              {expensesLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary/30" /></div>
              ) : recentExpenses.map((expense) => (
                <ExpenseRow key={expense.id} expense={expense} />
              ))}
              {!expensesLoading && recentExpenses.length === 0 && (
                <div className="text-xs text-center text-muted-foreground py-16 italic">
                  No recent activity.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-card shadow-sm ring-1 ring-black/5">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-3 border-b border-muted/50">
            <div className="flex items-center gap-3">
              <CalendarRange className="w-5 h-5 text-accent" />
              <CardTitle className="text-xs md:text-sm font-headline font-bold uppercase tracking-widest text-muted-foreground">Upcoming</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="min-h-[200px]">
              {expensesLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-accent/30" /></div>
              ) : upcomingExpenses.map((expense) => (
                <ExpenseRow key={expense.id} expense={expense} />
              ))}
              {!expensesLoading && upcomingExpenses.length === 0 && (
                <div className="text-xs text-center text-muted-foreground py-16 italic">
                  Nothing scheduled.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-primary/5 ring-1 ring-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-3 border-b border-primary/10">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <CardTitle className="text-xs md:text-sm font-headline font-bold uppercase tracking-widest text-primary">AI Insights</CardTitle>
            </div>
            <Link href="/insights" className="text-xs font-bold text-primary hover:underline uppercase tracking-tight">
              More
            </Link>
          </CardHeader>
          <CardContent className="p-5">
            <div className="space-y-4">
              {insights.predictions?.predictions?.[0] ? (
                <div className="p-4 bg-card rounded-2xl border border-primary/5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-tight">Forecast</span>
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
                <div className="p-4 bg-accent/5 rounded-2xl border border-accent/10">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-accent" />
                    <span className="text-xs font-bold text-accent uppercase tracking-tight">Saving Tip</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Review {(insights.unnecessary.unnecessaryExpenses[0].description || insights.unnecessary.unnecessaryExpenses[0].note)}: {insights.unnecessary.unnecessaryExpenses[0].reason}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-muted/20 rounded-2xl text-center">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-1">Daily Tip</p>
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
