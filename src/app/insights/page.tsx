"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useFynWealthStore } from "@/lib/store";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, where } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Loader2, 
  RefreshCw,
  Clock,
  PieChart,
  Target,
  Search,
  AlertCircle,
  TrendingUp,
  Zap,
  ArrowRight
} from "lucide-react";
import { identifyUnnecessaryExpenses } from "@/ai/flows/unnecessary-expense-identification";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow, format, startOfMonth, endOfMonth, subMonths, isWeekend } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";

export default function InsightsPage() {
  const { currency, insights, setInsights, viewMonth, viewYear } = useFynWealthStore();
  const { user } = useUser();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const fetchingRef = useRef(false);
  const lastAnalyzedPeriod = useRef<string>("");

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'users', user.uid, 'expenses'),
      orderBy('date', 'desc')
    );
  }, [db, user?.uid]);

  const budgetsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return collection(db, 'users', user.uid, 'budgets');
  }, [db, user?.uid]);

  const { data: expensesData, isLoading: expensesLoading } = useCollection(expensesQuery);
  const { data: budgetsData } = useCollection(budgetsQuery);
  
  const expenses = expensesData || [];
  const budgets = budgetsData || [];

  const toNum = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    let cleaned = String(val).trim();
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.slice(1, -1);
    }
    cleaned = cleaned.replace(/[^0-9.-]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  };

  const dynamicInsights = useMemo(() => {
    if (!mounted || expenses.length === 0) return [];
    
    const results = [];
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    // 1. Today's Spend Insight
    const todayExpenses = expenses.filter(e => e.date === todayStr && e.status === 'paid');
    if (todayExpenses.length > 0) {
      const catTotals: Record<string, number> = {};
      todayExpenses.forEach(e => {
        let cat = e.categoryName || e.category || "General";
        if (cat === "Financial Commitments") cat = "Financial Commit";
        catTotals[cat] = (catTotals[cat] || 0) + toNum(e.amount);
      });
      const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
      results.push({
        text: `You spent total ${formatCurrency(topCat[1], currency.symbol, true)} on ${topCat[0].toLowerCase()} today.`,
        icon: Zap,
        color: "text-amber-500"
      });
    }

    // 2. Budget Utilization Insight
    const targetDate = new Date(viewYear, viewMonth);
    const startStr = format(startOfMonth(targetDate), 'yyyy-MM-dd');
    const endStr = format(endOfMonth(targetDate), 'yyyy-MM-dd');
    const monthExpenses = expenses.filter(e => e.date >= startStr && e.date <= endStr && e.status === 'paid');
    const monthTotal = monthExpenses.reduce((s, e) => s + toNum(e.amount), 0);
    const totalBudgetLimit = budgets.reduce((s, b) => s + toNum(b.limit), 0);
    
    if (totalBudgetLimit > 0) {
      const percent = Math.min(100, Math.round((monthTotal / totalBudgetLimit) * 100));
      results.push({
        text: `You already used ${percent}% of your monthly budget.`,
        icon: Target,
        color: percent > 80 ? "text-rose-500" : "text-emerald-500"
      });
    }

    // 3. Weekend Trend Insight
    const weekendSpends: number[] = [];
    const weekdaySpends: number[] = [];
    expenses.slice(0, 50).filter(e => e.status === 'paid').forEach(e => {
      const d = new Date(e.date);
      if (isWeekend(d)) weekendSpends.push(toNum(e.amount));
      else weekdaySpends.push(toNum(e.amount));
    });

    if (weekendSpends.length > 2 && weekdaySpends.length > 2) {
      const avgWeekend = weekendSpends.reduce((a, b) => a + b, 0) / weekendSpends.length;
      const avgWeekday = weekdaySpends.reduce((a, b) => a + b, 0) / weekdaySpends.length;
      
      if (avgWeekend > avgWeekday * 1.1) {
        results.push({
          text: "Weekend spending is higher than weekdays.",
          icon: TrendingUp,
          color: "text-primary"
        });
      }
    }

    return results;
  }, [mounted, expenses, budgets, currency, viewMonth, viewYear]);

  const discoveries = useMemo(() => {
    const targetDate = new Date(viewYear, viewMonth);
    const currentStartStr = format(startOfMonth(targetDate), 'yyyy-MM-dd');
    const currentEndStr = format(endOfMonth(targetDate), 'yyyy-MM-dd');
    
    const lastMonthDate = subMonths(targetDate, 1);
    const lastStartStr = format(startOfMonth(lastMonthDate), 'yyyy-MM-dd');
    const lastEndStr = format(endOfMonth(lastMonthDate), 'yyyy-MM-dd');

    const filterAndSort = (arr: any[], direction: 'asc' | 'desc') => [...arr]
      .filter(e => toNum(e.amount) > 0 && e.status === 'paid')
      .sort((a, b) => {
        const valA = toNum(a.amount);
        const valB = toNum(b.amount);
        return direction === 'desc' ? valB - valA : valA - valB;
      });

    const currentTxns = expenses.filter(e => e.date >= currentStartStr && e.date <= currentEndStr);
    const lastTxns = expenses.filter(e => e.date >= lastStartStr && e.date <= lastEndStr);

    return {
      current: {
        highest: filterAndSort(currentTxns, 'desc').slice(0, 3),
        lowest: filterAndSort(currentTxns, 'asc').slice(0, 3)
      },
      last: {
        highest: filterAndSort(lastTxns, 'desc').slice(0, 3),
        lowest: filterAndSort(lastTxns, 'asc').slice(0, 3)
      }
    };
  }, [expenses, viewMonth, viewYear]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadInsights = useCallback(async (isManual = false) => {
    if (fetchingRef.current) return;

    setLoading(true);
    setError(null);
    fetchingRef.current = true;

    try {
      const uResult = await identifyUnnecessaryExpenses({ userId: user?.uid });

      setInsights({
        unnecessary: uResult
      });
      
      lastAnalyzedPeriod.current = `${viewYear}-${viewMonth}`;
      if (isManual) toast({ title: "Strategies Refreshed", description: "Behavioral audit updated." });
    } catch (err: any) {
      console.error("Failed to load insights", err);
      setError("AI analysis paused. Ensure vault data is available.");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [setInsights, viewMonth, viewYear, user?.uid]);

  useEffect(() => {
    if (mounted && !error && !loading) {
      const currentPeriod = `${viewYear}-${viewMonth}`;
      if (!insights.unnecessary || lastAnalyzedPeriod.current !== currentPeriod) {
        loadInsights();
      }
    }
  }, [mounted, loadInsights, insights.unnecessary, error, loading, viewMonth, viewYear]);

  if (!mounted) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 text-primary/30 animate-spin" />
    </div>
  );

  const getDisplayName = (e: any) => {
    let name = e.description || e.note || e.categoryName || e.category || "Expense";
    if (name === "Financial Commitments") return "Financial Commit";
    return name;
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

      {/* Dynamic Smart Briefing */}
      {dynamicInsights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-700">
          {dynamicInsights.map((insight, idx) => (
            <Card key={idx} className="border-none bg-primary/5 ring-1 ring-primary/10 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-6 flex items-start gap-4">
                <div className={cn("p-2 rounded-xl bg-white shadow-sm shrink-0", insight.color)}>
                  <insight.icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-foreground leading-snug">{insight.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-sm ring-1 ring-black/5 overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
                  <Search className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl font-headline font-bold">Spend Discoveries</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-4 space-y-10">
              <div className="space-y-6">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary px-3 py-1 bg-primary/5 rounded-full inline-block">Current Month ({format(new Date(viewYear, viewMonth), 'MMM')})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <h5 className="text-[9px] font-bold uppercase tracking-widest text-rose-600 flex items-center gap-2">Top 3 Highest</h5>
                    {discoveries.current.highest.length > 0 ? discoveries.current.highest.map((e) => (
                      <div key={e.id} className="p-4 rounded-xl bg-rose-50/30 border border-rose-100 flex items-center justify-between">
                        <span className="text-xs font-bold truncate max-w-[150px]">{getDisplayName(e)}</span>
                        <span className="text-xs font-bold text-rose-700">{formatCurrency(toNum(e.amount), currency.symbol)}</span>
                      </div>
                    )) : (
                      <div className="p-4 text-xs italic text-muted-foreground border border-dashed rounded-xl">No records identified.</div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <h5 className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-2">Top 3 Lowest</h5>
                    {discoveries.current.lowest.length > 0 ? discoveries.current.lowest.map((e) => (
                      <div key={e.id} className="p-4 rounded-xl bg-emerald-50/30 border border-emerald-100 flex items-center justify-between">
                        <span className="text-xs font-bold truncate max-w-[150px]">{getDisplayName(e)}</span>
                        <span className="text-xs font-bold text-emerald-700">{formatCurrency(toNum(e.amount), currency.symbol)}</span>
                      </div>
                    )) : (
                      <div className="p-4 text-xs italic text-muted-foreground border border-dashed rounded-xl">No records identified.</div>
                    )}
                  </div>
                </div>
              </div>

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
                          <span className="text-xs font-bold">{formatCurrency(toNum(e.amount), currency.symbol)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <h5 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Top 3 Lowest</h5>
                      {discoveries.last.lowest.map((e) => (
                        <div key={e.id} className="p-4 rounded-xl bg-muted/10 border border-muted/20 flex items-center justify-between opacity-70">
                          <span className="text-xs font-bold truncate max-w-[150px]">{getDisplayName(e)}</span>
                          <span className="text-xs font-bold">{formatCurrency(toNum(e.amount), currency.symbol)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="border-none shadow-sm ring-1 ring-black/5 overflow-hidden h-full">
            <CardHeader className="bg-accent/5 p-8 border-b">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-accent/10 text-accent">
                  <PieChart className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl font-headline font-bold">Savings Strategies</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Auditing Habits...</p>
                </div>
              ) : insights.unnecessary?.behavioralTips ? (
                <div className="space-y-8">
                  {insights.unnecessary.behavioralTips.map((tip: any, i: number) => (
                    <div key={i} className="p-6 rounded-[24px] border border-accent/10 bg-accent/5 space-y-4 transition-all hover:bg-accent/10">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-bold text-sm text-foreground truncate">{tip.title}</span>
                        <Badge variant="secondary" className="bg-accent/10 text-accent text-[8px] font-bold uppercase px-2 py-0.5 border-none">Behavioral Pattern</Badge>
                      </div>
                      
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {tip.description}
                      </p>

                      {tip.examples && (
                        <div className="p-3 bg-muted/20 rounded-xl space-y-2">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Examples</p>
                          <p className="text-[11px] font-medium leading-relaxed italic text-foreground/80">{tip.examples}</p>
                        </div>
                      )}

                      <div className="pt-2">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Target className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Solution</span>
                        </div>
                        <p className="text-xs font-bold text-foreground leading-relaxed">
                          {tip.solution}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground font-medium italic text-sm flex flex-col items-center gap-4">
                  <AlertCircle className="w-10 h-10 opacity-20" />
                  <p>AI savings audit will appear here as you log expenses.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
