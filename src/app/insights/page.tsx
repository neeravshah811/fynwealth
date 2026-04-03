
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useFynWealthStore } from "@/lib/store";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  TrendingUp, 
  Loader2, 
  RefreshCw,
  Clock,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Search,
} from "lucide-react";
import { predictHeavySpendingMonths } from "@/ai/flows/heavy-spending-month-prediction";
import { identifyUnnecessaryExpenses } from "@/ai/flows/unnecessary-expense-identification";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow, format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

export default function InsightsPage() {
  const { currency, insights, setInsights, viewMonth, viewYear } = useFynWealthStore();
  const { user } = useUser();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const fetchingRef = useRef(false);

  // Fetch All Expenses for Analysis
  const expensesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'users', user.uid, 'expenses'),
      orderBy('date', 'desc')
    );
  }, [db, user?.uid]);

  const { data: expensesData, isLoading: expensesLoading } = useCollection(expensesQuery);
  const expenses = expensesData || [];

  // Helper to ensure numeric accuracy regardless of data type
  const toNum = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  };

  // Calculate Discoveries for Current and Last Month
  const discoveries = useMemo(() => {
    const targetDate = new Date(viewYear, viewMonth);
    
    const currentStart = startOfMonth(targetDate);
    const currentEnd = endOfMonth(targetDate);
    
    const lastMonthDate = subMonths(targetDate, 1);
    const lastStart = startOfMonth(lastMonthDate);
    const lastEnd = endOfMonth(lastMonthDate);

    // Robust string-based filtering for YYYY-MM-DD formatted strings
    const filterTxns = (start: Date, end: Date) => {
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');
      return expenses.filter(e => e.date >= startStr && e.date <= endStr);
    };

    // Strict numeric sorting to prevent string-based comparison errors
    const sortDesc = (arr: any[]) => [...arr]
      .filter(e => toNum(e.amount) > 0)
      .sort((a, b) => toNum(b.amount) - toNum(a.amount));

    const sortAsc = (arr: any[]) => [...arr]
      .filter(e => toNum(e.amount) > 0)
      .sort((a, b) => toNum(a.amount) - toNum(b.amount));

    const currentTxns = filterTxns(currentStart, currentEnd);
    const lastTxns = filterTxns(lastStart, lastEnd);

    return {
      current: {
        highest: sortDesc(currentTxns).slice(0, 3),
        lowest: sortAsc(currentTxns).slice(0, 3)
      },
      last: {
        highest: sortDesc(lastTxns).slice(0, 3),
        lowest: sortAsc(lastTxns).slice(0, 3)
      }
    };
  }, [expenses, viewMonth, viewYear]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadInsights = useCallback(async (isManual = false) => {
    if (expenses.length === 0 || fetchingRef.current) return;

    setLoading(true);
    setError(null);
    fetchingRef.current = true;

    try {
      // 1. Aggregate Monthly Totals for Fast/Accurate Forecasting
      // Instead of sending 100s of rows, we send 12-24 monthly summaries
      const monthlyData: Record<string, number> = {};
      expenses.forEach(e => {
        const monthKey = e.date.substring(0, 7); // YYYY-MM
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + Math.abs(toNum(e.amount));
      });
      const aggregatedHistory = Object.entries(monthlyData)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // 2. Pre-aggregate Categories for Savings Strategy (Current Month Only)
      const targetDate = new Date(viewYear, viewMonth);
      const startStr = format(startOfMonth(targetDate), 'yyyy-MM-dd');
      const endStr = format(endOfMonth(targetDate), 'yyyy-MM-dd');
      
      const currentMonthExpenses = expenses.filter(e => e.date >= startStr && e.date <= endStr);

      const categoryTotals: Record<string, number> = {};
      currentMonthExpenses.forEach(e => {
        const cat = e.categoryName || e.category || "General";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(toNum(e.amount));
      });

      const topCategories = Object.entries(categoryTotals)
        .map(([name, total]) => ({ categoryName: name, totalSpent: total }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 4);
      
      // Call AI Flows in Parallel
      const [pResult, uResult] = await Promise.all([
        predictHeavySpendingMonths({ 
          expenses: aggregatedHistory 
        }),
        identifyUnnecessaryExpenses({ 
          categories: topCategories 
        })
      ]);

      setInsights({
        predictions: pResult,
        unnecessary: uResult
      });
      
      if (isManual) {
        toast({ title: "Analysis Refreshed", description: "Report updated with latest vault data." });
      }
    } catch (err: any) {
      console.error("Failed to load insights", err);
      setError("AI analysis paused. Check your vault data.");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [expenses, setInsights, viewMonth, viewYear]);

  useEffect(() => {
    if (mounted && expenses.length > 0 && !expensesLoading && !error && !loading) {
      const lastGen = insights.lastGenerated ? new Date(insights.lastGenerated).getTime() : 0;
      const oneHour = 1 * 60 * 60 * 1000;
      
      if (!insights.predictions || !insights.unnecessary || (Date.now() - lastGen > oneHour)) {
        loadInsights();
      }
    }
  }, [mounted, expenses.length, expensesLoading, loadInsights, insights.predictions, insights.unnecessary, insights.lastGenerated, error, loading, viewMonth, viewYear]);

  if (!mounted) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 text-primary/30 animate-spin" />
    </div>
  );

  const formatAmount = (amount: number) => Math.abs(toNum(amount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const hasData = !!(insights.predictions || insights.unnecessary);

  if (loading && !hasData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-10">
        <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10 shadow-inner">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
        <p className="text-xl font-headline font-bold text-primary animate-pulse">Generating precise analysis...</p>
      </div>
    );
  }

  const getDisplayName = (e: any) => {
    return e.description || e.note || e.categoryName || e.category || "Expense";
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-6xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 px-1">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-headline text-primary flex items-center gap-4">
            <Sparkles className="w-8 h-8 text-accent shrink-0" />
            AI Intelligence
          </h1>
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2">
            {insights.lastGenerated && (
              <>
                <Clock className="w-4 h-4" />
                <span suppressHydrationWarning>Refreshed {formatDistanceToNow(new Date(insights.lastGenerated))} ago</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">{format(new Date(viewYear, viewMonth), 'MMMM yyyy')}</p>
          <Button variant="outline" onClick={() => loadInsights(true)} className="h-11 px-8 font-bold shadow-sm rounded-xl" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-3" />}
            Refresh Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 1. Spending Forecast */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-sm ring-1 ring-black/5 overflow-hidden">
            <CardHeader className="bg-primary/5 p-8 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-xl font-headline font-bold">1. Spending Forecast</CardTitle>
                </div>
                {insights.predictions?.percentageChange !== undefined && (
                  <Badge className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold border-none",
                    insights.predictions.trendDirection === 'down' ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                  )}>
                    {insights.predictions.trendDirection === 'down' ? <ArrowDownRight className="w-3.5 h-3.5 mr-1 inline" /> : <ArrowUpRight className="w-3.5 h-3.5 mr-1 inline" />}
                    {insights.predictions.percentageChange}% {insights.predictions.trendDirection === 'down' ? 'Decrease' : 'Increase'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-[24px] bg-primary/5 border border-primary/10 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2 tracking-widest">Next Month Expected</p>
                  <p className="text-4xl font-bold text-primary tracking-tighter">
                    {currency.symbol}{insights.predictions?.predictedNextMonthTotal ? formatAmount(insights.predictions.predictedNextMonthTotal) : "0.00"}
                  </p>
                </div>
                <div className="p-6 rounded-[24px] bg-muted/20 border border-muted/50 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-3 tracking-widest">Comparison Result</p>
                  <p className="text-sm text-foreground leading-relaxed font-bold italic">
                    {insights.predictions?.historicalComparison || "Analyzing historical data..."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Spend Discoveries */}
          <Card className="border-none shadow-sm ring-1 ring-black/5 overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
                  <Search className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl font-headline font-bold">2. Spend Discoveries</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-4 space-y-10">
              {/* Current Month */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary px-3 py-1 bg-primary/5 rounded-full inline-block">Current Month ({format(new Date(viewYear, viewMonth), 'MMM')})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <h5 className="text-[9px] font-bold uppercase tracking-widest text-rose-600 flex items-center gap-2">Top 3 Highest</h5>
                    {discoveries.current.highest.length > 0 ? discoveries.current.highest.map((e) => (
                      <div key={e.id} className="p-4 rounded-xl bg-rose-50/30 border border-rose-100 flex items-center justify-between">
                        <span className="text-xs font-bold truncate max-w-[150px]">{getDisplayName(e)}</span>
                        <span className="text-xs font-bold text-rose-700">{currency.symbol}{formatAmount(e.amount)}</span>
                      </div>
                    )) : (
                      <div className="p-4 text-xs italic text-muted-foreground">No records found.</div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <h5 className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-2">Top 3 Lowest</h5>
                    {discoveries.current.lowest.length > 0 ? discoveries.current.lowest.map((e) => (
                      <div key={e.id} className="p-4 rounded-xl bg-emerald-50/30 border border-emerald-100 flex items-center justify-between">
                        <span className="text-xs font-bold truncate max-w-[150px]">{getDisplayName(e)}</span>
                        <span className="text-xs font-bold text-emerald-700">{currency.symbol}{formatAmount(e.amount)}</span>
                      </div>
                    )) : (
                      <div className="p-4 text-xs italic text-muted-foreground">No records found.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Last Month */}
              <div className="space-y-6 pt-4 border-t border-muted/50">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-1 bg-muted/20 rounded-full inline-block">Last Month ({format(subMonths(new Date(viewYear, viewMonth), 1), 'MMM')})</h4>
                {discoveries.last.highest.length === 0 && discoveries.last.lowest.length === 0 ? (
                  <div className="py-8 text-center bg-muted/10 rounded-xl border border-dashed border-muted">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest italic">No data from last month</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <h5 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Top 3 Highest</h5>
                      {discoveries.last.highest.map((e) => (
                        <div key={e.id} className="p-4 rounded-xl bg-muted/10 border border-muted/20 flex items-center justify-between opacity-70">
                          <span className="text-xs font-bold truncate max-w-[150px]">{getDisplayName(e)}</span>
                          <span className="text-xs font-bold">{currency.symbol}{formatAmount(e.amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <h5 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Top 3 Lowest</h5>
                      {discoveries.last.lowest.map((e) => (
                        <div key={e.id} className="p-4 rounded-xl bg-muted/10 border border-muted/20 flex items-center justify-between opacity-70">
                          <span className="text-xs font-bold truncate max-w-[150px]">{getDisplayName(e)}</span>
                          <span className="text-xs font-bold">{currency.symbol}{formatAmount(e.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Savings Strategies */}
        <div className="space-y-8">
          <Card className="border-none shadow-sm ring-1 ring-black/5 overflow-hidden h-full">
            <CardHeader className="bg-accent/5 p-8 border-b">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-accent/10 text-accent">
                  <PieChart className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl font-headline font-bold">3. Savings Strategies</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-5">
                {insights.unnecessary?.highSpendCategories?.slice(0, 4).map((cat: any, i: number) => (
                  <div key={i} className="p-6 rounded-[24px] border border-accent/10 bg-accent/5 space-y-4 transition-all">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-bold text-sm text-foreground truncate">{cat.categoryName}</span>
                      <p className="font-bold text-sm text-foreground tracking-tight whitespace-nowrap">{currency.symbol}{formatAmount(cat.totalSpent)}</p>
                    </div>
                    <div className="p-4 bg-card rounded-2xl border border-accent/10 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-3.5 h-3.5 text-accent" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Concise Tip</span>
                      </div>
                      <p className="text-sm font-bold text-foreground leading-snug">
                        {cat.savingTip}
                      </p>
                    </div>
                  </div>
                ))}
                {(!insights.unnecessary || insights.unnecessary.highSpendCategories?.length === 0) && (
                  <div className="text-center py-20 text-muted-foreground font-medium italic text-sm">
                    No high spending identified.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
