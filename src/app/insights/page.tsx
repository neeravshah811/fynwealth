
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

  const loadInsights = useCallback(async (isManual = false) => {
    if (expenses.length === 0) {
      setLoading(false);
      return;
    }

    // Don't auto-run if we already have insights, unless requested manually
    if (!isManual && insights.predictions && insights.unnecessary) {
      return;
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
          description: "Analysis completed successfully.",
        });
      }
    } catch (err: any) {
      console.error("Failed to load insights", err);
      if (err.message?.includes("429") || err.message?.includes("Quota")) {
        setError("The AI is currently receiving too many requests. Please wait a few seconds and try again.");
      } else {
        setError("We encountered an issue while analyzing your data. Please try again.");
      }
      toast({
        variant: "destructive",
        title: "AI Analysis Error",
        description: "Could not complete spending analysis due to high demand.",
      });
    } finally {
      setLoading(false);
    }
  }, [expenses, insights.predictions, insights.unnecessary, setInsights]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const formatAmount = (amount: number) => {
    return Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const hasData = insights.predictions || insights.unnecessary;

  if (loading && !hasData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-primary animate-spin" />
          <Sparkles className="w-6 h-6 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-headline font-bold text-primary animate-pulse">Analyzing spending patterns...</p>
          <p className="text-sm text-muted-foreground">This can take up to 30 seconds for deep analysis.</p>
        </div>
      </div>
    );
  }

  if (error && !hasData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center max-w-md mx-auto">
        <div className="p-4 bg-amber-50 rounded-full dark:bg-amber-900/20">
          <AlertCircle className="w-12 h-12 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-headline">AI Analysis Paused</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
        <Button onClick={() => loadInsights(true)} className="bg-primary hover:bg-primary/90 h-12 px-8">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Analysis
        </Button>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center max-w-md mx-auto">
        <div className="p-4 bg-primary/5 rounded-full">
          <Sparkles className="w-12 h-12 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-headline">No data to analyze</h2>
          <p className="text-muted-foreground">Add some expenses first so FynWealth AI can find patterns and saving opportunities for you.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold font-headline mb-2 text-primary flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-accent shrink-0" />
            AI Insights
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {insights.lastGenerated ? (
              <>
                <Clock className="w-3.5 h-3.5" />
                <span>Last updated {formatDistanceToNow(new Date(insights.lastGenerated))} ago</span>
              </>
            ) : (
              <span>Smart financial analysis powered by FynWealth AI.</span>
            )}
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => loadInsights(true)} 
          className="h-11 px-6 font-bold shadow-sm"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          {loading ? "Analyzing..." : "Refresh Insights"}
        </Button>
      </div>

      {!hasData && !loading ? (
        <Card className="border-none shadow-sm bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-20 space-y-4">
            <Sparkles className="w-12 h-12 text-primary opacity-20" />
            <p className="text-muted-foreground font-medium text-center max-w-sm">
              Generate your first AI analysis to identify saving opportunities and spending spikes.
            </p>
            <Button onClick={() => loadInsights(true)} className="h-12 px-8 bg-primary">
              Generate Insights
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-none shadow-lg bg-card overflow-hidden">
            <CardHeader className="bg-primary/5 pb-6">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-6 h-6 text-primary" />
                <CardTitle className="text-xl font-headline">Heavy Spending Forecast</CardTitle>
              </div>
              <CardDescription className="text-sm">{insights.predictions?.summary || "Analyzing historical trends..."}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {insights.predictions?.predictions.map((p: any, i: number) => (
                  <div key={i} className="flex gap-4 p-4 rounded-xl bg-muted/30 border border-muted transition-all hover:bg-muted/50">
                    <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-lg p-2 min-w-[70px] shadow-sm">
                      <span className="text-[11px] uppercase font-bold text-muted-foreground">{p.year}</span>
                      <span className="text-base font-bold text-primary">{p.month.substring(0, 3)}</span>
                    </div>
                    <div>
                      <h4 className="font-headline font-bold text-primary text-sm mb-1">Predicted Spike</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{p.reason}</p>
                    </div>
                  </div>
                ))}
                {insights.predictions?.predictions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm italic">No major spending spikes predicted soon.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-card overflow-hidden">
            <CardHeader className="bg-accent/5 pb-6">
              <div className="flex items-center gap-3 mb-2">
                <Trash2 className="w-6 h-6 text-accent" />
                <CardTitle className="text-xl font-headline">Saving Opportunities</CardTitle>
              </div>
              <CardDescription className="text-sm">{insights.unnecessary?.summary || "Looking for redundant expenses..."}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {insights.unnecessary?.unnecessaryExpenses.map((exp: any, i: number) => (
                  <div key={i} className="group relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-accent" />
                        <span className="font-headline font-bold text-sm">{exp.description}</span>
                      </div>
                      <span className="font-bold text-accent text-sm">{currency.symbol}{formatAmount(exp.amount)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground bg-accent/5 p-4 rounded-xl border border-accent/10 leading-relaxed">
                      {exp.reason}
                    </p>
                  </div>
                ))}
                {insights.unnecessary?.unnecessaryExpenses.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm italic">No redundant expenses identified. Good job!</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {hasData && (
        <Card className="border-none shadow-sm bg-primary text-primary-foreground overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10">
            <Lightbulb className="w-64 h-64 -mr-12 -mt-12" />
          </div>
          <CardContent className="p-8 relative z-10">
            <h3 className="text-2xl font-headline font-bold mb-4">Optimization Tip</h3>
            <p className="text-primary-foreground/90 max-w-2xl text-lg mb-8 leading-relaxed">
              Based on your spending, optimizing your recurring subscriptions and utility management could significantly increase your monthly savings.
            </p>
            <Button className="bg-white text-primary hover:bg-white/90 h-12 px-8 font-bold rounded-xl">
              View Optimization Plan
              <ArrowUpRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
