"use client";

import { useFynWealthStore } from "@/lib/store";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
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

  // Fetch Expenses
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

  // Fetch Budgets
  const budgetsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return collection(db, 'users', user.uid, 'budgets');
  }, [db, user?.uid]);

  const { data: expensesData } = useCollection(expensesQuery);
  const { data: budgetsData } = useCollection(budgetsQuery);

  const expenses = expensesData || [];
  const budgets = budgetsData || [];

  const data = expenses
    .reduce((acc: any[], curr) => {
      const existing = acc.find(item => item.name === curr.category);
      if (existing) {
        existing.value += curr.amount;
      } else {
        acc.push({ name: curr.category, value: curr.amount });
      }
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#3b82f6', '#f43f5e', '#8b5cf6'];

  return (
    <Card className="shadow-sm border-none bg-card/80 backdrop-blur lg:col-span-2 h-full flex flex-col">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-[11px] font-headline uppercase font-bold tracking-widest text-muted-foreground">Category Spend</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[250px] p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} 
              dy={5}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} 
              tickFormatter={(value) => `${currency.symbol}${value >= 1000 ? (value/1000).toFixed(0)+'k' : value}`}
            />
            <Tooltip 
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
              contentStyle={{ 
                borderRadius: '8px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                backgroundColor: 'hsl(var(--card))',
                fontSize: '10px',
                padding: '8px 10px'
              }}
              formatter={(value: number) => [
                <span className="font-bold text-foreground" key="val">{currency.symbol}{value.toLocaleString()}</span>,
                null
              ]}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}