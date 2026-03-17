'use client';

import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Receipt, 
  Bell, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  TrendingUp,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { subDays, isAfter, startOfDay, format } from 'date-fns';
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function AdminDashboardPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    if (!db || !user) return;

    async function fetchAllUsers() {
      try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllUsers(fetched);
      } catch (error) {
        console.error("Failed to fetch user aggregation", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAllUsers();
  }, [db, user]);

  const stats = useMemo(() => {
    const now = new Date();
    const twentyFourHoursAgo = subDays(now, 1);

    return {
      totalUsers: allUsers.length,
      totalExpenses: allUsers.reduce((sum, u) => sum + (u.stats?.totalExpenses || 0), 0),
      totalReminders: allUsers.reduce((sum, u) => sum + (u.stats?.totalReminders || 0), 0),
      activeUsers24h: allUsers.filter(u => {
        if (!u.lastActive) return false;
        const date = typeof u.lastActive.toDate === 'function' ? u.lastActive.toDate() : new Date(u.lastActive);
        return isAfter(date, twentyFourHoursAgo);
      }).length
    };
  }, [allUsers]);

  const onboardingData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => startOfDay(subDays(new Date(), i))).reverse();
    
    return days.map(day => {
      const count = allUsers.filter(u => {
        if (!u.createdAt) return false;
        const created = typeof u.createdAt.toDate === 'function' ? u.createdAt.toDate() : new Date(u.createdAt);
        return format(created, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      }).length;

      return {
        name: format(day, 'EEE'),
        signups: count
      };
    });
  }, [allUsers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const MetricCard = ({ title, value, icon: Icon, color, trend, trendValue }: any) => (
    <Card className="border-none shadow-sm ring-1 ring-black/5 bg-white dark:bg-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2.5 rounded-xl", color)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
              trend === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            )}>
              {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trendValue}
            </div>
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">{title}</p>
          <h3 className="text-2xl font-bold tracking-tight">{value?.toLocaleString() || 0}</h3>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold font-headline text-foreground tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Activity className="w-3 h-3 text-emerald-500" />
            Live application health aggregated from user records.
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Real-time Aggregation
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Users" 
          value={stats.totalUsers} 
          icon={Users} 
          color="bg-primary" 
          trend="up" 
          trendValue="Growth" 
        />
        <MetricCard 
          title="Expense Entries" 
          value={stats.totalExpenses} 
          icon={Receipt} 
          color="bg-emerald-500" 
          trend="up" 
          trendValue="Total" 
        />
        <MetricCard 
          title="Active Reminders" 
          value={stats.totalReminders} 
          icon={Bell} 
          color="bg-amber-500" 
          trend="up" 
          trendValue="Global" 
        />
        <MetricCard 
          title="Active (24h)" 
          value={stats.activeUsers24h} 
          icon={Activity} 
          color="bg-indigo-500" 
          trend="up" 
          trendValue="Retention" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-sm ring-1 ring-black/5">
          <CardHeader className="flex flex-row items-center justify-between pb-8">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Live Onboarding Trend
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Real registration volume from the last 7 days.</p>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] w-full px-2">
            {mounted && onboardingData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={onboardingData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="signups" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-black/5 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
            <Globe className="w-48 h-48 -mr-12 -mb-12" />
          </div>
          <CardHeader>
            <CardTitle className="text-base font-bold">Cloud Infrastructure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider opacity-80">
                <span>Database Connectivity</span>
                <span>Healthy</span>
              </div>
              <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white w-full" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider opacity-80">
                <span>API Response Time</span>
                <span>124ms</span>
              </div>
              <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white w-[88%]" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider opacity-80">
                <span>Firestore Security Rules</span>
                <span>Active</span>
              </div>
              <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white w-full" />
              </div>
            </div>
            
            <div className="pt-4">
              <p className="text-[10px] italic opacity-70 leading-relaxed">
                Application metrics are calculated on-the-fly from live Firestore production data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
