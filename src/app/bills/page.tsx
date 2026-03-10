
"use client";

import { useState, useRef } from "react";
import { useFynWealthStore, Frequency, SYSTEM_CATEGORIES } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  Upload,
  FileText,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";

const REMINDER_FREQUENCIES: Frequency[] = ['One-time', 'Weekly', 'Monthly', 'Quarterly', 'Half-yearly', 'Annually'];

export default function BillsPage() {
  const { bills, addBill, deleteBill, markBillPaid, currency, customCategories } = useFynWealthStore();
  const [showForm, setShowForm] = useState(false);
  const [billDoc, setBillDoc] = useState<{ data: string; type: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    dueTime: '09:00',
    frequency: 'Monthly' as Frequency,
    category: 'Miscellaneous',
    subCategory: '',
    notes: ''
  });

  const allCategories = { ...SYSTEM_CATEGORIES, ...customCategories };
  const categoriesList = Object.keys(allCategories);

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setBillDoc({
        data: reader.result as string,
        type: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount || !formData.dueDate) return;

    addBill({
      name: formData.name,
      amount: Math.abs(parseFloat(formData.amount)),
      dueDate: formData.dueDate,
      dueTime: formData.dueTime,
      frequency: formData.frequency,
      category: formData.category,
      subCategory: formData.subCategory,
      notes: formData.notes,
      billImageData: billDoc?.data
    });

    setFormData({
      name: '',
      amount: '',
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      dueTime: '09:00',
      frequency: 'Monthly',
      category: 'Miscellaneous',
      subCategory: '',
      notes: ''
    });
    setBillDoc(null);
    setShowForm(false);
    toast({ title: "Reminder Set", description: `We'll remind you about ${formData.name}.` });
  };

  const pendingReminders = bills.filter(b => b.status === 'pending');
  const paidReminders = bills.filter(b => b.status === 'paid');

  const formatCurrency = (val: number) => {
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline mb-2 text-primary">Custom Reminders</h1>
          <p className="text-sm text-muted-foreground">Manage your upcoming payments and subscriptions in one place.</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)} 
          className="rounded-xl h-11 px-6 shadow-lg shadow-primary/20 text-sm font-bold"
        >
          {showForm ? <X className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
          {showForm ? "Cancel" : "Add New Reminder"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-none shadow-xl ring-1 ring-primary/10 overflow-hidden animate-in slide-in-from-top-4 duration-300">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-xl font-headline flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary" />
              Configure Payment Reminder
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Expense Name</Label>
                  <Input 
                    placeholder="e.g. Home Loan EMI" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="h-12 rounded-xl text-sm"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Amount ({currency.symbol})</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={formData.amount} 
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="h-12 rounded-xl font-bold text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Reminder Date</Label>
                  <Input 
                    type="date" 
                    value={formData.dueDate} 
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    className="h-12 rounded-xl text-sm"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Reminder Time</Label>
                  <Input 
                    type="time" 
                    value={formData.dueTime} 
                    onChange={(e) => setFormData({...formData, dueTime: e.target.value})}
                    className="h-12 rounded-xl text-sm"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Frequency</Label>
                  <Select value={formData.frequency} onValueChange={(v) => setFormData({...formData, frequency: v as Frequency})}>
                    <SelectTrigger className="h-12 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {REMINDER_FREQUENCIES.map(f => <SelectItem key={f} value={f} className="text-sm">{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                    <SelectTrigger className="h-12 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[300px] rounded-xl">
                      {categoriesList.map(cat => <SelectItem key={cat} value={cat} className="text-sm">{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Attach Bill/Invoice (Optional)</Label>
                <div className="flex flex-col gap-3">
                  {!billDoc ? (
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="h-12 w-full rounded-xl border-dashed border-primary/30 text-muted-foreground text-sm font-medium"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                    </Button>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/20">
                      <div className="flex items-center gap-3 min-w-0">
                        {billDoc.type === 'application/pdf' ? <FileText className="w-5 h-5 text-primary" /> : <ImageIcon className="w-5 h-5 text-primary" />}
                        <span className="text-xs font-bold truncate text-foreground">{billDoc.name}</span>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                        onClick={() => setBillDoc(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,application/pdf" 
                    onChange={handleDocUpload} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Notes (Optional)</Label>
                <Textarea 
                  placeholder="Payment details, account numbers, etc." 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="rounded-xl min-h-[100px] text-sm"
                />
              </div>

              <Button type="submit" className="w-full h-14 font-bold rounded-xl shadow-lg shadow-primary/10 text-base">
                Create Reminder
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-headline font-bold">Upcoming & Pending</h2>
            <Badge className="bg-primary/10 text-primary border-none">{pendingReminders.length}</Badge>
          </div>

          <div className="space-y-4">
            {pendingReminders.map((bill) => {
              const date = new Date(bill.dueDate);
              const isOverdue = isPast(date) && !isToday(date);
              
              return (
                <Card key={bill.id} className={cn(
                  "border-none shadow-sm ring-1 transition-all hover:shadow-md group relative overflow-hidden",
                  isOverdue ? "ring-destructive/30 bg-destructive/5" : "ring-primary/5 bg-card"
                )}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="space-y-1.5 min-w-0 flex-1 pr-4">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-lg truncate">{bill.name}</h4>
                          {isOverdue && <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs uppercase font-bold py-0 h-6 border-muted-foreground/20 text-muted-foreground">
                            {bill.frequency}
                          </Badge>
                          <Badge variant="secondary" className="text-xs uppercase font-bold py-0 h-6 bg-primary/5 text-primary border-none">
                            {bill.category}
                          </Badge>
                          {bill.billImageData && (
                            <Badge variant="outline" className="text-[10px] h-6 border-emerald-500/20 text-emerald-600 bg-emerald-50/50">
                              <FileText className="w-3 h-3 mr-1" /> DOC
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-2xl text-primary">{currency.symbol}{formatCurrency(bill.amount)}</div>
                        <div className={cn("text-xs font-bold uppercase mt-1 flex items-center justify-end gap-1.5", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                          <CalendarDays className="w-3.5 h-3.5" />
                          {isOverdue ? "Overdue" : "Remind"} {format(date, 'MMM dd')} @ {bill.dueTime}
                        </div>
                      </div>
                    </div>

                    {bill.notes && (
                      <p className="text-sm text-muted-foreground mb-6 bg-muted/30 p-4 rounded-xl border border-muted italic">
                        "{bill.notes}"
                      </p>
                    )}

                    <div className="flex items-center gap-3">
                      <Button 
                        className="flex-1 rounded-xl h-11 font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/10 text-sm"
                        onClick={() => markBillPaid(bill.id)}
                      >
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Mark as Paid
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-11 w-11 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                        onClick={() => deleteBill(bill.id)}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {pendingReminders.length === 0 && (
              <div className="text-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed border-muted text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-4 opacity-20" />
                <p className="text-sm font-medium text-xs">No upcoming bills. You're all caught up!</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <History className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-headline font-bold">Payment History</h2>
          </div>

          <div className="space-y-4">
            {paidReminders.map((bill) => (
              <Card key={bill.id} className="border-none shadow-sm bg-muted/10 opacity-70 grayscale hover:opacity-100 hover:grayscale-0 transition-all overflow-hidden">
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="p-2.5 rounded-full bg-emerald-100 text-emerald-600 shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm truncate">{bill.name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider font-bold">
                        Settled on {format(new Date(bill.dueDate), 'MMM dd')} at {bill.dueTime}
                      </p>
                    </div>
                  </div>
                  <div className="text-base font-bold whitespace-nowrap text-emerald-700">
                    {currency.symbol}{formatCurrency(bill.amount)}
                  </div>
                </CardContent>
              </Card>
            ))}
            {paidReminders.length === 0 && (
              <p className="text-center py-16 text-muted-foreground text-sm italic text-xs">No payment history yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
