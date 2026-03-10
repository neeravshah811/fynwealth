
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
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-headline">Spending by Category</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
              dx={-10}
              tickFormatter={(value) => `${currency.symbol}${value}`}
            />
            <Tooltip 
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
              contentStyle={{ 
                borderRadius: '8px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                backgroundColor: 'hsl(var(--card))',
                fontSize: '11px',
                padding: '10px 14px'
              }}
              formatter={(value: number) => {
                const pSpent = totalSpent > 0 ? ((value / totalSpent) * 100).toFixed(1) : "0";
                const pBudget = totalBudget > 0 ? ((value / totalBudget) * 100).toFixed(1) : "0";
                return [
                  <div className="flex flex-col gap-1" key="tooltip-content">
                    <span className="font-bold text-foreground">{currency.symbol}{value.toLocaleString()}</span>
                    <span className="text-muted-foreground">{pSpent}% of total spent</span>
                    {totalBudget > 0 && <span className="text-muted-foreground">{pBudget}% of total budget</span>}
                  </div>,
                  null
                ];
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
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
