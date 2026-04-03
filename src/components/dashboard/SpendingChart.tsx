
"use client";

import { useMemo } from "react";
import { useFynWealthStore } from "@/lib/store";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export function SpendingChart() {
  const { currency, viewMonth, viewYear } = useFynWealthStore();
  const { user } = useUser();
  const db = useFirestore();

  // Fetch Expenses - Only show actualized spend
  const expensesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    const startDate = format(new Date(viewYear, viewMonth, 1), 'yyyy-MM-dd');
    const endDate = format(new Date(viewYear, viewMonth + 1, 0), 'yyyy-MM-dd');
    
    return query(
      collection(db, 'users', user.uid, 'expenses'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
  }, [db, user?.uid, viewMonth, viewYear]);

  const { data: expensesData } = useCollection(expensesQuery);

  const data = useMemo(() => {
    // Filter by status 'paid' or no status to match Dashboard Metrics
    const expenses = (expensesData || []).filter(e => e.status === 'paid' || !e.status);
    return expenses
      .reduce((acc: any[], curr) => {
        let catName = curr.categoryName || curr.category || "General";
        
        // Normalization: Ensure 'Financial Commit' is consistent across graphs
        if (catName === "Financial Commitments" || catName === "Financial Commit") {
          catName = "Financial Commit";
        }
        
        const existing = acc.find(item => item.name === catName);
        if (existing) {
          existing.value += (Number(curr.amount) || 0);
        } else {
          acc.push({ name: catName, value: (Number(curr.amount) || 0) });
        }
        return acc;
      }, [])
      .sort((a, b) => b.value - a.value);
  }, [expensesData]);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#3b82f6', '#f43f5e', '#8b5cf6', '#0ea5e9', '#f97316'];

  const hasData = data.length > 0;

  return (
    <Card className="shadow-sm border-none bg-card/80 backdrop-blur lg:col-span-2 h-full flex flex-col">
      <CardHeader className="p-5 pb-2">
        <CardTitle className="text-[11px] font-headline uppercase font-bold tracking-widest text-muted-foreground">Category Spend</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[400px] md:min-h-[500px] p-4 pt-0 flex flex-col">
        {!hasData ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
            <BarChart3 className="w-12 h-12 text-muted-foreground" />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No expenses recorded to show chart</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              margin={{ top: 20, right: 10, left: -20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 600 }} 
                interval={0}
                height={80}
                angle={-45}
                textAnchor="end"
                dx={-4}
                dy={8}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9, fontWeight: 500 }} 
                tickFormatter={(value) => `${currency.symbol}${value >= 1000 ? (value/1000).toFixed(0)+'k' : value}`}
              />
              <Tooltip 
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  backgroundColor: 'hsl(var(--card))',
                  fontSize: '11px',
                  padding: '10px'
                }}
                formatter={(value: number) => [
                  <span className="font-bold text-foreground" key="val">{currency.symbol}{value.toLocaleString()}</span>,
                  null
                ]}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
