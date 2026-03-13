
"use client";

import { useState } from "react";
import { useFynWealthStore, Frequency, SYSTEM_CATEGORIES } from "@/lib/store";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, deleteDoc, updateDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X,
  CreditCard,
  History,
  CalendarDays,
  Loader2,
  HelpCircle,
  Calendar as CalendarIcon
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { TutorialDialog } from "@/components/TutorialDialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export default function BillsPage() {
  const { currency, viewMonth, viewYear, setViewDate } = useFynWealthStore();
  const { user } = useUser();
  const db = useFirestore();
  
  const [showForm, setShowForm] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    dueTime: '09:00',
    frequency: 'Monthly' as Frequency,
    category: 'Miscellaneous',
  });

  // Firestore Bills Query
  const billsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'users', user.uid, 'bills'),
      orderBy('dueDate', 'asc')
    );
  }, [db, user?.uid]);

  const { data: bills, isLoading } = useCollection(billsQuery);

  const categoriesList = Object.keys(SYSTEM_CATEGORIES);

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setViewDate(date.getMonth(), date.getFullYear());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount || !db || !user?.uid) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'bills'), {
        ...formData,
        userId: user.uid,
        amount: Math.abs(parseFloat(formData.amount)),
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setFormData({
        name: '',
        amount: '',
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        dueTime: '09:00',
        frequency: 'Monthly',
        category: 'Miscellaneous',
      });
      setShowForm(false);
      toast({ title: "Reminder Set", description: "Saved to cloud vault." });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Could not sync bill." });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    if (!db || !user?.uid) return;
    await updateDoc(doc(db, 'users', user.uid, 'bills', id), { status: 'paid' });
    toast({ title: "Settled", description: "Bill marked as paid across devices." });
  };

  const handleDelete = async (id: string) => {
    if (!db || !user?.uid) return;
    await deleteDoc(doc(db, 'users', user.uid, 'bills', id));
  };

  const pendingReminders = (bills || []).filter(b => b.status === 'pending');
  const paidReminders = (bills || []).filter(b => b.status === 'paid');

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-5xl mx-auto pb-24">
      <TutorialDialog open={showTutorial} onOpenChange={setShowTutorial} />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold font-headline text-primary tracking-tight">Cloud Reminders</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase">{format(new Date(viewYear, viewMonth), 'MMMM yyyy')}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setShowTutorial(true)}><HelpCircle className="w-5 h-5" /></Button>
          <Popover>
            <PopoverTrigger asChild><Button variant="outline" size="icon"><CalendarIcon className="w-5 h-5" /></Button></PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-2xl overflow-hidden mt-2" align="end">
              <Calendar mode="single" selected={new Date(viewYear, viewMonth)} onSelect={handleCalendarSelect} />
            </PopoverContent>
          </Popover>
          <Button onClick={() => setShowForm(!showForm)} className="rounded-xl h-11 px-6 shadow-lg">
            {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showForm ? "Cancel" : "New Reminder"}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="border-none shadow-xl overflow-hidden animate-in slide-in-from-top-4">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-xl font-headline flex items-center gap-3 font-bold text-primary">
              <CreditCard className="w-6 h-6" /> Configure Reminder
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Amount</Label>
                  <Input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required className="h-12 rounded-xl font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Due Date</Label>
                  <Input type="date" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} required className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Frequency</Label>
                  <Select value={formData.frequency} onValueChange={(v) => setFormData({...formData, frequency: v as Frequency})}>
                    <SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['One-time', 'Weekly', 'Monthly', 'Quarterly', 'Annually'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                    <SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categoriesList.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-14 font-bold rounded-xl shadow-lg">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Cloud Reminder"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-1">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-headline font-bold">Upcoming</h2>
          </div>
          {isLoading ? (
            <div className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" /></div>
          ) : pendingReminders.map((bill) => {
            const date = new Date(bill.dueDate);
            const isOverdue = isPast(date) && !isToday(date);
            return (
              <Card key={bill.id} className={cn("border-none shadow-sm ring-1 ring-primary/5", isOverdue && "ring-destructive/30 bg-destructive/5")}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="font-bold text-lg">{bill.name}</h4>
                      <Badge variant="secondary" className="text-[10px] mt-1">{bill.category}</Badge>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xl text-primary">{currency.symbol}{bill.amount.toLocaleString()}</div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">{format(date, 'MMM dd')}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleMarkPaid(bill.id)} className="flex-1 rounded-xl bg-emerald-600">Paid</Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(bill.id)} className="text-muted-foreground"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2 px-1">
            <History className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-headline font-bold">History</h2>
          </div>
          {paidReminders.slice(0, 5).map((bill) => (
            <Card key={bill.id} className="border-none shadow-sm opacity-70">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-sm">{bill.name}</span>
                </div>
                <span className="font-bold text-sm">{currency.symbol}{bill.amount.toLocaleString()}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
