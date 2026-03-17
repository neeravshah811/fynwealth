'use client';

import { useFirestore } from '@/firebase';
import { doc, getDoc, collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { useEffect, useState, use, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  Calendar, 
  Mail, 
  Fingerprint, 
  Clock, 
  Receipt, 
  CreditCard,
  Loader2,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { format, isValid } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function UserDetailPage({ params }: { params: Promise<{ uid: string }> }) {
  const resolvedParams = use(params);
  const uid = resolvedParams.uid;
  const db = useFirestore();
  const [user, setUser] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [billsCount, setBillsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Fetch User Profile
        const userDocRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUser({ id: userDoc.id, ...userDoc.data() });
        }

        // 2. Fetch Expenses (Limit 100 for overview)
        const expensesRef = collection(db, 'users', uid, 'expenses');
        const q = query(expensesRef, orderBy('date', 'desc'), limit(100));
        const expSnapshot = await getDocs(q);
        setExpenses(expSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // 3. Fetch Bills/Reminders Count
        const billsRef = collection(db, 'users', uid, 'bills');
        const billsSnapshot = await getDocs(billsRef);
        setBillsCount(billsSnapshot.size);

      } catch (error: any) {
        const permissionError = new FirestorePermissionError({
          path: `users/${uid}`,
          operation: 'get',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [db, uid]);

  const totalSpent = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [expenses]);

  const safeFormatDate = (dateValue: any, formatStr: string = 'MMM dd, yyyy') => {
    if (!dateValue) return 'N/A';
    
    let date: Date;
    if (typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    } else {
      date = new Date(dateValue);
    }

    return isValid(date) ? format(date, formatStr) : 'N/A';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold">User Not Found</h2>
        <Button asChild className="mt-4"><Link href="/admin-dashboard/users">Back to List</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="rounded-xl border-black/5 shadow-sm" asChild>
          <Link href="/admin-dashboard/users"><ChevronLeft className="w-5 h-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight">User Details</h1>
          <p className="text-sm text-muted-foreground">Deep inspection of user account and activity.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-sm ring-1 ring-black/5">
            <CardHeader className="text-center border-b border-black/5 bg-muted/10 pb-8 pt-10 rounded-t-xl">
              <div className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center text-3xl font-bold shadow-lg mx-auto mb-4 uppercase">
                {user.name?.[0] || user.email?.[0]}
              </div>
              <CardTitle className="text-xl">{user.name || 'N/A'}</CardTitle>
              <p className="text-xs font-medium text-muted-foreground mt-1">{user.email}</p>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Fingerprint className="w-4 h-4" />
                  <span>UID</span>
                </div>
                <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{user.id}</code>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Joined</span>
                </div>
                <span className="font-bold">{safeFormatDate(user.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Last Active</span>
                </div>
                <span className="font-bold">{safeFormatDate(user.lastActive, 'MMM dd, HH:mm')}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm ring-1 ring-black/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Activity Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-center">
                  <Receipt className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-lg font-bold text-primary">{expenses.length}</p>
                  <p className="text-[9px] uppercase font-bold text-muted-foreground">Total Expenses</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                  <CreditCard className="w-5 h-5 text-amber-600 mx-auto mb-2" />
                  <p className="text-lg font-bold text-amber-600">{billsCount}</p>
                  <p className="text-[9px] uppercase font-bold text-muted-foreground">Total Reminders</p>
                </div>
              </div>
              
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/50">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800">Total Volume</span>
                </div>
                <p className="text-base font-bold text-emerald-700">${totalSpent.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="border-none shadow-sm ring-1 ring-black/5 h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b border-black/5 pb-4">
              <div>
                <CardTitle className="text-base font-bold">Recent Financial Records</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Transaction history from this user's vault (Last 100).</p>
              </div>
              <Badge variant="outline" className="bg-muted/50 border-black/5 text-[10px] font-bold py-1">
                {expenses.length} Records
              </Badge>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader className="bg-muted/20 sticky top-0 z-10">
                    <TableRow className="border-none">
                      <TableHead className="text-[10px] uppercase font-bold tracking-widest pl-6">Date</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold tracking-widest">Category</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold tracking-widest">Note</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold tracking-widest text-right pr-6">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((exp) => {
                      const displayDescription = exp.description || exp.note || (
                        exp.subcategoryName && exp.subcategoryName !== 'Others' 
                          ? `${exp.categoryName} - ${exp.subcategoryName}` 
                          : exp.categoryName
                      );

                      return (
                        <TableRow key={exp.id} className="hover:bg-muted/10 border-b border-black/5">
                          <TableCell className="pl-6 text-xs font-medium">
                            {safeFormatDate(exp.date)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[9px] font-bold uppercase py-0 px-1.5 h-5">
                              {exp.categoryName || exp.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                            {displayDescription}
                          </TableCell>
                          <TableCell className="text-right pr-6 font-bold text-sm">
                            ${exp.amount?.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {expenses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic text-sm">
                          No expense history found for this user.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
