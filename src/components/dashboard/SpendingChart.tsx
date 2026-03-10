
"use client";

import { useFynWealthStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const { expenses, budgets, currency, viewMonth, viewYear } = useFynWealthStore();

  const data = expenses
    .filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
    })
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

  const totalSpent = data.reduce((sum, item) => sum + item.value, 0);
  const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);

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
