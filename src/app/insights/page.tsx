
"use client";

import { useState, useEffect, useCallback } from "react";
import { useFynWealthStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Calendar, 
  Trash2, 
  ArrowUpRight, 
  Lightbulb, 
  Loader2,
  AlertCircle,
  RefreshCw,
  Clock
} from "lucide-react";
import { predictHeavySpendingMonths } from "@/ai/flows/heavy-spending-month-prediction";
import { identifyUnnecessaryExpenses } from "@/ai/flows/unnecessary-expense-identification";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export default function InsightsPage() {
  const { expenses, currency, insights, setInsights } = useFynWealthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadInsights = useCallback(async (isManual = false) => {
    if (expenses.length === 0) return;

    // Throttle: Don't auto-run if we have data generated in the last 6 hours
    if (!isManual && insights.lastGenerated) {
      const lastGen = new Date(insights.lastGenerated).getTime();
      const sixHours = 6 * 60 * 60 * 1000;
      if (Date.now() - lastGen < sixHours && insights.predictions && insights.unnecessary) {
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const expenseData = expenses.map(e => ({ 
        date: e.date, 
        amount: Math.abs(e.amount), 
        description: e.description, 
        category: e.category 
      }));
      
      const pResult = await predictHeavySpendingMonths({ 
        expenses: expenseData.map(e => ({ date: e.date, amount: e.amount })) 
      });
      
      const uResult = await identifyUnnecessaryExpenses({ 
        expenses: expenseData 
      });

      setInsights({
        predictions: pResult,
        unnecessary: uResult
      });
      
      if (isManual) {
        toast({
          title: "Insights Updated",
          description: "Deep analysis completed successfully.",
        });
      }
    } catch (err: any) {
      console.error("Failed to load insights", err);
      if (err.message?.includes("429") || err.message?.includes("Quota")) {
        setError("High demand on AI services. Please try again in a few moments.");
      } else {
        setError("Issue analyzing your data. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  }, [expenses, insights, setInsights]);

  useEffect(() => {
    if (mounted) {
      loadInsights();
    }
  }, [mounted, loadInsights]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const formatAmount = (amount: number) => {
    return Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const hasData = !!(insights.predictions || insights.unnecessary);

  if (loading && !hasData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-primary animate-spin" />
          <Sparkles className="w-6 h-6 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-headline font-bold text-primary animate-pulse tracking-tight">FynWealth AI is thinking...</p>
          <p className="text-xs text-muted-foreground">Identifying saving patterns and future spikes.</p>
        </div>
      </div>
    );
  }

  if (error && !hasData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center max-w-sm mx-auto px-4">
        <div className="p-4 bg-amber-50 rounded-full dark:bg-amber-900/20">
          <AlertCircle className="w-10 h-10 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold font-headline">Analysis Paused</h2>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
        <Button onClick={() => loadInsights(true)} className="h-11 px-8 rounded-xl font-bold shadow-md">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Now
        </Button>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center max-w-sm mx-auto px-4">
        <div className="p-5 bg-primary/5 rounded-2xl">
          <Sparkles className="w-12 h-12 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold font-headline">Unlock AI Insights</h2>
          <p className="text-xs text-muted-foreground">Add your first few transactions to see spending patterns and saving tips from our AI.</p>
        </div>
        <Button asChild className="rounded-xl h-11 px-8 font-bold">
          <Link href="/expenses">Record Expense</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary flex items-center justify-center md:justify-start gap-3">
            <Sparkles className="w-8 h-8 text-accent shrink-0" />
            AI Insights
          </h1>
          <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-muted-foreground mt-1">
            {insights.lastGenerated ? (
              <>
                <Clock className="w-3.5 h-3.5" />
                <span>Last updated {formatDistanceToNow(new Date(insights.lastGenerated))} ago</span>
              </>
            ) : (
              <span>Automated financial intelligence.</span>
            )}
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => loadInsights(true)} 
          className="h-11 px-6 font-bold shadow-sm rounded-xl border-primary/20 text-primary hover:bg-primary/5"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          {loading ? "Analyzing..." : "Refresh Now"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm bg-card overflow-hidden ring-1 ring-primary/5">
          <CardHeader className="bg-primary/5 pb-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg font-headline">Spending Forecast</CardTitle>
            </div>
            <CardDescription className="text-xs line-clamp-2">
              {insights.predictions?.summary || "Analyzing trends to predict upcoming heavy spending..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {insights.predictions?.predictions.map((p: any, i: number) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl bg-muted/20 border border-muted/50 transition-all hover:bg-muted/30">
                  <div className="flex flex-col items-center justify-center bg-background rounded-lg p-2 min-w-[64px] h-16 shadow-sm ring-1 ring-primary/5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">{p.year}</span>
                    <span className="text-sm font-bold text-primary">{p.month.substring(0, 3)}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-foreground mb-1 uppercase tracking-wider">Expected Spike</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{p.reason}</p>
                  </div>
                </div>
              ))}
              {(!insights.predictions || insights.predictions.predictions.length === 0) && (
                <div className="text-center py-10 text-muted-foreground text-xs italic">No upcoming spikes detected.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card overflow-hidden ring-1 ring-accent/10">
          <CardHeader className="bg-accent/5 pb-6">
            <div className="flex items-center gap-3 mb-2">
              <Trash2 className="w-5 h-5 text-accent" />
              <CardTitle className="text-lg font-headline">Saving Tips</CardTitle>
            </div>
            <CardDescription className="text-xs line-clamp-2">
              {insights.unnecessary?.summary || "Searching for redundant or optimizeable expenses..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {insights.unnecessary?.unnecessaryExpenses.map((exp: any, i: number) => (
                <div key={i} className="p-4 rounded-xl border border-accent/10 bg-accent/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-accent" />
                      {exp.description}
                    </span>
                    <span className="font-bold text-xs text-accent">{currency.symbol}{formatAmount(exp.amount)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {exp.reason}
                  </p>
                </div>
              ))}
              {(!insights.unnecessary || insights.unnecessary.unnecessaryExpenses.length === 0) && (
                <div className="text-center py-10 text-muted-foreground text-xs italic">All expenses look optimal!</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {hasData && (
        <Card className="border-none shadow-md bg-primary text-primary-foreground relative overflow-hidden rounded-2xl">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
            <Lightbulb className="w-64 h-64 -mr-16 -mt-16" />
          </div>
          <CardContent className="p-8 relative z-10 text-center md:text-left">
            <h3 className="text-xl font-headline font-bold mb-3">Optimization Ready</h3>
            <p className="text-primary-foreground/80 max-w-xl text-sm mb-6 leading-relaxed">
              We've identified several ways to improve your savings rate. Click below to view your personalized financial optimization plan.
            </p>
            <Button className="bg-white text-primary hover:bg-white/90 h-11 px-8 font-bold rounded-xl shadow-lg">
              Explore Optimization
              <ArrowUpRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
