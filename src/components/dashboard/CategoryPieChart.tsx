
"use client";

import { useFynWealthStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend
} from 'recharts';

export function CategoryPieChart() {
  const { expenses, currency, viewMonth, viewYear } = useFynWealthStore();

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
    .sort((a, b) => b.value - a.value);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#3b82f6', '#f43f5e', '#8b5cf6', '#0ea5e9', '#f97316'];

  return (
    <Card className="shadow-sm border-none bg-card/80 backdrop-blur lg:col-span-1 h-full flex flex-col">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-[11px] font-headline uppercase font-bold tracking-widest text-muted-foreground">Distribution</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[250px] p-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="40%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
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
            <Legend 
              verticalAlign="bottom" 
              align="center"
              iconType="circle"
              iconSize={6}
              wrapperStyle={{ 
                fontSize: '9px', 
                paddingTop: '10px',
                lineHeight: '14px'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
