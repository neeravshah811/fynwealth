
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  PieChart
} from "lucide-react";
import { predictHeavySpendingMonths } from "@/ai/flows/heavy-spending-month-prediction";
import { identifyUnnecessaryExpenses } from "@/ai/flows/unnecessary-expense-identification";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default function InsightsPage() {
  const { currency, insights, setInsights } = useFynWealthStore();
  const { user } = useUser();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const fetchingRef = useRef(false);

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'users', user.uid, 'expenses'),
      orderBy('date', 'desc')
    );
  }, [db, user?.uid]);

  const { data: expensesData, isLoading: expensesLoading } = useCollection(expensesQuery);
  const expenses = expensesData || [];

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadInsights = useCallback(async (isManual = false) => {
    if (expenses.length === 0 || fetchingRef.current) return;

    setLoading(true);
    setError(null);
    fetchingRef.current = true;

    try {
      const expenseData = expenses.map(e => ({ 
        date: e.date, 
        amount: Math.abs(e.amount), 
        description: e.description || e.note || "Expense", 
        category: e.categoryName || e.category || "General" 
      }));
      
      // Parallelize AI calls for significantly faster performance
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
        toast({ title: "Insights Updated", description: "Deep analysis completed successfully." });
      }
    } catch (err: any) {
      console.error("Failed to load insights", err);
      setError("AI analysis paused. Check your connection and try refreshing.");
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

  if (!mounted) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-10 h-10 text-primary/30 animate-spin" /></div>;

  const formatAmount = (amount: number) => Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const hasData = !!(insights.predictions || insights.unnecessary);

  if (loading && !hasData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10 shadow-inner">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </div>
          <Sparkles className="w-8 h-8 text-accent absolute -top-2 -right-2 animate-bounce" />
        </div>
        <div className="text-center space-y-3">
          <p className="text-xl font-headline font-bold text-primary animate-pulse tracking-tight">FynWealth AI is analyzing categories...</p>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Aggregating spend and forecasting trends</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-5xl mx-auto pb-24">
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
                <span>Refreshed {formatDistanceToNow(new Date(insights.lastGenerated))} ago</span>
              </>
            ) : (
              <span>Automated category-level analysis</span>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={() => loadInsights(true)} className="h-11 px-8 font-bold shadow-sm rounded-xl border-primary/20 text-primary hover:bg-primary/5 transition-all" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-3" />}
          Refresh Trends
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm bg-card overflow-hidden transition-all hover:shadow-md">
          <CardHeader className="bg-primary/5 pb-8 p-8 border-b border-muted/50">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-sm">
                <Calendar className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-headline font-bold">Predictive Forecast</CardTitle>
            </div>
            <CardDescription className="text-sm font-medium leading-relaxed">
              {insights.predictions?.summary || "Analyzing historical comparisons to predict next month's volume..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {insights.predictions?.predictedNextMonthTotal && (
              <div className="p-6 rounded-[20px] bg-primary/5 border border-primary/10 text-center mb-4">
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-widest">Predicted Next Month</p>
                <p className="text-3xl font-bold text-primary tracking-tight">{currency.symbol}{formatAmount(insights.predictions.predictedNextMonthTotal)}</p>
              </div>
            )}
            
            <div className="space-y-5">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Trend Comparison</h4>
              <p className="text-sm text-muted-foreground leading-relaxed italic">{insights.predictions?.historicalComparison}</p>
              
              <div className="h-px bg-muted/50 my-4" />
              
              {insights.predictions?.futureSpikes?.map((p: any, i: number) => (
                <div key={i} className="flex gap-5 p-5 rounded-[20px] bg-muted/20 border border-muted/50 transition-all hover:bg-muted/30 group">
                  <div className="flex flex-col items-center justify-center bg-background rounded-2xl p-3 min-w-[72px] h-20 shadow-sm ring-1 ring-primary/5 transition-all group-hover:ring-primary/20 group-hover:shadow-md">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{p.year}</span>
                    <span className="text-lg font-bold text-primary leading-none mt-1">{p.month.substring(0, 3)}</span>
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <h4 className="font-bold text-[11px] text-foreground uppercase tracking-[0.15em] mb-1">Forecasted Spike</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">{p.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card overflow-hidden transition-all hover:shadow-md">
          <CardHeader className="bg-accent/5 pb-8 p-8 border-b border-muted/50">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-2.5 rounded-xl bg-accent/10 text-accent shadow-sm">
                <PieChart className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-headline font-bold">Category Savings</CardTitle>
            </div>
            <CardDescription className="text-sm font-medium leading-relaxed">
              {insights.unnecessary?.summary || "Focusing on categories where the volume of spending is highest..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-5">
              {insights.unnecessary?.highSpendCategories?.map((cat: any, i: number) => (
                <div key={i} className="p-5 rounded-[20px] border border-accent/10 bg-accent/5 space-y-3 transition-all hover:shadow-md hover:bg-accent/[0.08]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-sm flex items-center gap-3 text-foreground truncate">
                      <AlertCircle className="w-4 h-4 text-accent shrink-0" />
                      {cat.categoryName}
                    </span>
                    <span className="font-bold text-base text-accent tracking-tight shrink-0">{currency.symbol}{formatAmount(cat.totalSpent)}</span>
                  </div>
                  <div className="pl-7 border-l-2 border-accent/20 ml-2 space-y-2">
                    <p className="text-xs text-foreground font-bold">{cat.savingTip}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed italic">{cat.reason}</p>
                  </div>
                </div>
              ))}
              {(!insights.unnecessary || insights.unnecessary.highSpendCategories?.length === 0) && (
                <div className="text-center py-16 text-muted-foreground font-medium italic text-sm">Category spending looks optimal. Add more data for a deeper audit.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {hasData && (
        <Card className="border-none shadow-xl bg-primary text-primary-foreground relative overflow-hidden rounded-[32px]">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none transition-transform duration-700 hover:scale-110">
            <Lightbulb className="w-80 h-80 -mr-20 -mt-20" />
          </div>
          <CardContent className="p-10 relative z-10 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="space-y-4 max-w-xl">
              <h3 className="text-2xl md:text-3xl font-headline font-bold tracking-tight">Strategy Generated</h3>
              <p className="text-primary-foreground/80 text-base md:text-lg leading-relaxed font-medium">
                Our AI identified high-spend categories. Focus on the actionable tips above to significantly improve your monthly balance.
              </p>
            </div>
            <Button asChild className="bg-white text-primary hover:bg-white/90 h-14 px-10 font-bold rounded-2xl shadow-2xl transition-all active:scale-95 text-base shrink-0 group">
              <Link href="/budgets">
                Manage Limits
                <TrendingUp className="w-5 h-5 ml-3 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
