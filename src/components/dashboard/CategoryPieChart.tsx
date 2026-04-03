
"use client";

import { useMemo } from "react";
import { useFynWealthStore } from "@/lib/store";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart as PieChartIcon } from "lucide-react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend
} from 'recharts';

export function CategoryPieChart() {
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

  const { data: expensesData } = useCollection(expensesQuery);

  const data = useMemo(() => {
    const expenses = (expensesData || []).filter(e => e.status === 'paid' || !e.status);
    return expenses
      .reduce((acc: any[], curr) => {
        let catName = curr.categoryName || curr.category || "General";
        
        // Normalization: Ensure naming consistency for graphs
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
    <Card className="shadow-sm border-none bg-card/80 backdrop-blur lg:col-span-1 h-full flex flex-col">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-[11px] font-headline uppercase font-bold tracking-widest text-muted-foreground">Distribution</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[250px] p-2 flex flex-col">
        {!hasData ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
            <PieChartIcon className="w-10 h-10 text-muted-foreground" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">No data to distribute</p>
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}
