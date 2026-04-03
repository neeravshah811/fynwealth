
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useFynWealthStore } from "@/lib/store";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Calendar, 
  TrendingUp, 
  Lightbulb, 
  Loader2,
  AlertCircle,
  RefreshCw,
  Clock,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Search,
  ChevronDown,
  TrendingDown
} from "lucide-react";
import { predictHeavySpendingMonths } from "@/ai/flows/heavy-spending-month-prediction";
import { identifyUnnecessaryExpenses } from "@/ai/flows/unnecessary-expense-identification";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow, format, startOfMonth, endOfMonth } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function InsightsPage() {
  const { currency, insights, setInsights, viewMonth, viewYear } = useFynWealthStore();
  const { user } = useUser();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const fetchingRef = useRef(false);

  // Fetch All Expenses for AI Analysis
  const expensesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'users', user.uid, 'expenses'),
      orderBy('date', 'desc')
    );
  }, [db, user?.uid]);

  const { data: expensesData, isLoading: expensesLoading } = useCollection(expensesQuery);
  const expenses = expensesData || [];

  // Calculate Top 3 Highest and Lowest for current month view
  const monthlyDiscovery = useMemo(() => {
    const start = startOfMonth(new Date(viewYear, viewMonth));
    const end = endOfMonth(new Date(viewYear, viewMonth));
    
    const monthly = expenses.filter(e => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    });

    const sorted = [...monthly].sort((a, b) => b.amount - a.amount);
    
    return {
      highest: sorted.slice(0, 3),
      lowest: sorted.slice(-3).reverse().filter(e => e.amount > 0)
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
      // Normalize Financial Commit for AI consistency
      const expenseData = expenses.map(e => ({ 
        date: e.date, 
        amount: Math.abs(e.amount), 
        description: e.description || e.note || "Expense", 
        category: (e.categoryName === "Financial Commitments" || e.category === "Financial Commitments") ? "Financial Commit" : (e.categoryName || e.category || "General") 
      }));
      
      // Parallelize AI calls for smoother performance
      const [pResult, uResult] = await Promise.all([
        predictHeavySpendingMonths({ 
          expenses: expenseData.map(e => ({ date: e.date, amount: e.amount })) 
        }),
        identifyUnnecessaryExpenses({ 
          expenses: expenseData 
        })
      ]);

      setInsights({
        predictions: pResult,
        unnecessary: uResult
      });
      
      if (isManual) {
        toast({ title: "Intelligence Refreshed", description: "Strategic trends updated based on latest vault data." });
      }
    } catch (err: any) {
      console.error("Failed to load insights", err);
      setError("AI engine paused. Please check your vault data and try again.");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [expenses, setInsights]);

  useEffect(() => {
    if (mounted && expenses.length > 0 && !expensesLoading && !error && !loading) {
      const lastGen = insights.lastGenerated ? new Date(insights.lastGenerated).getTime() : 0;
      const sixHours = 6 * 60 * 60 * 1000;
      if (!insights.predictions || !insights.unnecessary || (Date.now() - lastGen > sixHours)) {
        loadInsights();
      }
    }
  }, [mounted, expenses.length, expensesLoading, loadInsights, insights.predictions, insights.unnecessary, insights.lastGenerated, error, loading]);

  if (!mounted) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 text-primary/30 animate-spin" />
    </div>
  );

  const formatAmount = (amount: number) => Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const hasData = !!(insights.predictions || insights.unnecessary);

  if (loading && !hasData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-10">
        <div className="relative">
          <div className="w-28 h-28 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10 shadow-inner">
            <Loader2 className="w-14 h-14 text-primary animate-spin" />
          </div>
          <Sparkles className="w-10 h-10 text-accent absolute -top-2 -right-2 animate-bounce" />
        </div>
        <div className="text-center space-y-4 px-6">
          <p className="text-2xl font-headline font-bold text-primary animate-pulse tracking-tight">FynWealth AI is calculating trends...</p>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-[0.2em]">Analyzing category volumes and forecasting spikes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-6xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 px-1">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-headline text-primary flex items-center justify-center md:justify-start gap-4">
            <Sparkles className="w-10 h-10 text-accent shrink-0" />
            AI Intelligence
          </h1>
          <div className="flex items-center justify-center md:justify-start gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-2">
            {insights.lastGenerated ? (
              <>
                <Clock className="w-4 h-4" />
                <span suppressHydrationWarning>Refreshed {formatDistanceToNow(new Date(insights.lastGenerated))} ago</span>
              </>
            ) : (
              <span>Calculated Strategic category analysis</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => loadInsights(true)} className="h-11 px-8 font-bold shadow-sm rounded-xl border-primary/20 text-primary hover:bg-primary/5 transition-all" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-3" />}
            Refresh Trends
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Predictions & Trends */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-sm bg-card overflow-hidden transition-all hover:shadow-md ring-1 ring-black/5">
            <CardHeader className="bg-primary/5 pb-8 p-8 border-b border-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-sm">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-headline font-bold">Spending Forecast</CardTitle>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Predictive Analysis</p>
                  </div>
                </div>
                {insights.predictions?.percentageChange !== undefined && (
                  <Badge className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm border-none",
                    insights.predictions.trendDirection === 'down' ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                  )}>
                    {insights.predictions.trendDirection === 'down' ? <ArrowDownRight className="w-3.5 h-3.5 mr-1 inline" /> : <ArrowUpRight className="w-3.5 h-3.5 mr-1 inline" />}
                    {insights.predictions.percentageChange}% {insights.predictions.trendDirection === 'down' ? 'Drop' : 'Increase'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-[24px] bg-primary/5 border border-primary/10 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2 tracking-widest">Expected Next Month</p>
                  <p className="text-4xl font-bold text-primary tracking-tighter">
                    {currency.symbol}{insights.predictions?.predictedNextMonthTotal ? formatAmount(insights.predictions.predictedNextMonthTotal) : "0.00"}
                  </p>
                </div>
                <div className="p-6 rounded-[24px] bg-muted/20 border border-muted/50 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-3 tracking-widest">History Check</p>
                  <p className="text-sm text-foreground leading-relaxed font-bold italic">
                    "{insights.predictions?.historicalComparison || "Scanning your historical vault for comparisons..."}"
                  </p>
                </div>
              </div>
              
              <div className="space-y-6">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground px-1 border-l-2 border-primary ml-1 pl-3">Forecasted Spikes</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights.predictions?.futureSpikes?.map((p: any, i: number) => (
                    <div key={i} className="flex gap-5 p-5 rounded-[24px] bg-card border ring-1 ring-black/5 transition-all hover:ring-primary/20 hover:shadow-md group">
                      <div className="flex flex-col items-center justify-center bg-muted/30 rounded-2xl p-3 min-w-[72px] h-20 shadow-inner transition-all group-hover:bg-primary/5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{p.year}</span>
                        <span className="text-xl font-bold text-primary leading-none mt-1">{p.month.substring(0, 3)}</span>
                      </div>
                      <div className="space-y-1.5 flex-1 min-w-0 flex flex-col justify-center">
                        <h4 className="font-bold text-[11px] text-foreground uppercase tracking-[0.15em] mb-1">Seasonal Risk</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed font-medium line-clamp-2">{p.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-card overflow-hidden ring-1 ring-black/5">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 shadow-sm">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-headline font-bold">Spend Discoveries</CardTitle>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Highest & Lowest this Month</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h5 className="text-[10px] font-bold uppercase tracking-widest text-rose-600 flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4" /> Top 3 Highest
                  </h5>
                  <div className="space-y-3">
                    {monthlyDiscovery.highest.map((e, i) => (
                      <div key={e.id} className="p-4 rounded-xl bg-rose-50/30 border border-rose-100 flex items-center justify-between">
                        <span className="text-xs font-bold truncate max-w-[150px]">{e.description || e.note}</span>
                        <span className="text-xs font-bold text-rose-700">{currency.symbol}{formatAmount(e.amount)}</span>
                      </div>
                    ))}
                    {monthlyDiscovery.highest.length === 0 && <p className="text-xs text-muted-foreground italic">No expenses recorded for this period.</p>}
                  </div>
                </div>
                <div className="space-y-4">
                  <h5 className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                    <ArrowDownRight className="w-4 h-4" /> Top 3 Lowest
                  </h5>
                  <div className="space-y-3">
                    {monthlyDiscovery.lowest.map((e, i) => (
                      <div key={e.id} className="p-4 rounded-xl bg-emerald-50/30 border border-emerald-100 flex items-center justify-between">
                        <span className="text-xs font-bold truncate max-w-[150px]">{e.description || e.note}</span>
                        <span className="text-xs font-bold text-emerald-700">{currency.symbol}{formatAmount(e.amount)}</span>
                      </div>
                    ))}
                    {monthlyDiscovery.lowest.length === 0 && <p className="text-xs text-muted-foreground italic">No small expenses to list.</p>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Savings & Strategy */}
        <div className="space-y-8">
          <Card className="border-none shadow-sm bg-card overflow-hidden ring-1 ring-black/5">
            <CardHeader className="bg-accent/5 pb-8 p-8 border-b border-muted/50">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-accent/10 text-accent shadow-sm">
                  <PieChart className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-headline font-bold">Savings Strategy</CardTitle>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Category Level Optimization</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-5">
                {insights.unnecessary?.highSpendCategories?.map((cat: any, i: number) => (
                  <div key={i} className="p-6 rounded-[24px] border border-accent/10 bg-accent/5 space-y-4 transition-all hover:shadow-md hover:bg-accent/[0.08] group">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-bold text-sm flex items-center gap-3 text-foreground truncate">
                        <AlertCircle className="w-4 h-4 text-accent shrink-0" />
                        {cat.categoryName}
                      </span>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-muted-foreground opacity-60 leading-none mb-1">Total Spent</p>
                        <p className="font-bold text-sm text-foreground tracking-tight">{currency.symbol}{formatAmount(cat.totalSpent)}</p>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-white rounded-2xl border border-accent/10 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-3.5 h-3.5 text-accent" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Potential Saving</span>
                      </div>
                      <p className="text-sm font-bold text-foreground leading-snug">
                        {cat.savingTip}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Estimated Gain</span>
                        <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-100 text-[10px] font-bold">
                          +{currency.symbol}{cat.potentialSavings || 0}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-[10px] text-muted-foreground leading-relaxed italic border-l-2 border-accent/20 pl-3">
                      {cat.reason}
                    </p>
                  </div>
                ))}
                {(!insights.unnecessary || insights.unnecessary.highSpendCategories?.length === 0) && (
                  <div className="text-center py-20 text-muted-foreground font-medium italic text-sm">
                    Category spending looks optimal. AI is monitoring for savings...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-primary text-primary-foreground relative overflow-hidden rounded-[32px]">
            <div className="absolute right-0 top-0 opacity-10 pointer-events-none transition-transform duration-700 hover:scale-110">
              <Lightbulb className="w-64 h-64 -mr-16 -mt-16" />
            </div>
            <CardContent className="p-10 relative z-10 space-y-8">
              <div className="space-y-4">
                <h3 className="text-2xl font-headline font-bold tracking-tight">Strategy Generated</h3>
                <p className="text-primary-foreground/80 text-sm leading-relaxed font-medium">
                  Our AI identified high-spend categories. Focus on the actionable tips above to significantly improve your monthly balance.
                </p>
              </div>
              <Button asChild className="bg-white text-primary hover:bg-white/90 w-full h-14 font-bold rounded-2xl shadow-2xl transition-all active:scale-95 text-base group">
                <Link href="/budgets">
                  Update Limits
                  <TrendingUp className="w-5 h-5 ml-3 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
