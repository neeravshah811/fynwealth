
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
    <div className="space-y-10 animate-in fade-in duration-500 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-headline mb-2 text-primary tracking-tight">Custom Reminders</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage your upcoming payments and subscriptions in one place.</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)} 
          className="rounded-xl h-12 md:h-14 px-8 shadow-lg shadow-primary/20 text-sm md:text-base font-bold transition-all"
        >
          {showForm ? <X className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
          {showForm ? "Cancel" : "Add New Reminder"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-none shadow-xl ring-1 ring-primary/10 overflow-hidden animate-in slide-in-from-top-4 duration-300 bg-card">
          <CardHeader className="bg-primary/5 p-8">
            <CardTitle className="text-xl md:text-2xl font-headline flex items-center gap-3 font-bold text-primary">
              <CreditCard className="w-7 h-7" />
              Configure Payment Reminder
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Expense Name</Label>
                  <Input 
                    placeholder="e.g. Home Loan EMI" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="h-14 rounded-xl text-sm md:text-base font-bold shadow-sm"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Amount ({currency.symbol})</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={formData.amount} 
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="h-14 rounded-xl text-lg md:text-xl font-bold shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Reminder Date</Label>
                  <Input 
                    type="date" 
                    value={formData.dueDate} 
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    className="h-12 rounded-xl text-sm md:text-base font-medium"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Reminder Time</Label>
                  <Input 
                    type="time" 
                    value={formData.dueTime} 
                    onChange={(e) => setFormData({...formData, dueTime: e.target.value})}
                    className="h-12 rounded-xl text-sm md:text-base font-medium"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Frequency</Label>
                  <Select value={formData.frequency} onValueChange={(v) => setFormData({...formData, frequency: v as Frequency})}>
                    <SelectTrigger className="h-12 rounded-xl text-sm md:text-base font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {REMINDER_FREQUENCIES.map(f => <SelectItem key={f} value={f} className="text-sm md:text-base">{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                    <SelectTrigger className="h-12 rounded-xl text-sm md:text-base font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[300px] rounded-xl">
                      {categoriesList.map(cat => <SelectItem key={cat} value={cat} className="text-sm md:text-base">{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Attach Bill/Invoice (Optional)</Label>
                <div className="flex flex-col gap-3">
                  {!billDoc ? (
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="h-14 w-full rounded-xl border-dashed border-primary/30 text-muted-foreground text-sm md:text-base font-bold shadow-sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-5 h-5 mr-2" />
                      Upload Document
                    </Button>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20 shadow-sm animate-in fade-in">
                      <div className="flex items-center gap-4 min-w-0">
                        {billDoc.type === 'application/pdf' ? <FileText className="w-6 h-6 text-primary" /> : <ImageIcon className="w-6 h-6 text-primary" />}
                        <span className="text-sm md:text-base font-bold truncate text-foreground">{billDoc.name}</span>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 rounded-full text-destructive hover:bg-destructive/10"
                        onClick={() => setBillDoc(null)}
                      >
                        <X className="w-5 h-5" />
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
                <Label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Notes (Optional)</Label>
                <Textarea 
                  placeholder="Payment details, account numbers, etc." 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="rounded-xl min-h-[120px] text-sm md:text-base font-medium shadow-sm"
                />
              </div>

              <Button type="submit" className="w-full h-16 font-bold rounded-xl shadow-xl shadow-primary/20 text-lg">
                Create Reminder
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-8">
          <div className="flex items-center gap-3 px-1">
            <Clock className="w-6 h-6 text-primary" />
            <h2 className="text-xl md:text-2xl font-headline font-bold">Upcoming & Pending</h2>
            <Badge className="bg-primary/10 text-primary border-none text-sm px-3 py-1 font-bold">{pendingReminders.length}</Badge>
          </div>

          <div className="space-y-6">
            {pendingReminders.map((bill) => {
              const date = new Date(bill.dueDate);
              const isOverdue = isPast(date) && !isToday(date);
              
              return (
                <Card key={bill.id} className={cn(
                  "border-none shadow-sm ring-1 transition-all hover:shadow-md group relative overflow-hidden",
                  isOverdue ? "ring-destructive/30 bg-destructive/5" : "ring-primary/5 bg-card"
                )}>
                  <CardContent className="p-6 md:p-8">
                    <div className="flex justify-between items-start mb-6 gap-4">
                      <div className="space-y-2.5 min-w-0 flex-1 pr-4">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-lg md:text-xl truncate leading-tight">{bill.name}</h4>
                          {isOverdue && <AlertCircle className="w-5 h-5 text-destructive shrink-0" />}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-[10px] md:text-xs uppercase font-bold py-1 h-auto border-muted-foreground/20 text-muted-foreground tracking-widest">
                            {bill.frequency}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] md:text-xs uppercase font-bold py-1 h-auto bg-primary/5 text-primary border-none tracking-widest">
                            {bill.category}
                          </Badge>
                          {bill.billImageData && (
                            <Badge variant="outline" className="text-[9px] md:text-[10px] py-1 h-auto border-emerald-500/20 text-emerald-600 bg-emerald-50/50 font-bold">
                              <FileText className="w-3.5 h-3.5 mr-1.5" /> DOCUMENT
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-2xl md:text-3xl text-primary leading-none mb-2">{currency.symbol}{formatCurrency(bill.amount)}</div>
                        <div className={cn("text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center justify-end gap-1.5", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                          <CalendarDays className="w-4 h-4" />
                          {isOverdue ? "Overdue" : "Remind"} {format(date, 'MMM dd')} @ {bill.dueTime}
                        </div>
                      </div>
                    </div>

                    {bill.notes && (
                      <p className="text-xs md:text-sm text-muted-foreground mb-8 bg-muted/30 p-5 rounded-xl border border-muted italic leading-relaxed">
                        "{bill.notes}"
                      </p>
                    )}

                    <div className="flex items-center gap-4">
                      <Button 
                        className="flex-1 rounded-xl h-12 md:h-14 font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/10 text-sm md:text-base"
                        onClick={() => markBillPaid(bill.id)}
                      >
                        <CheckCircle2 className="w-5 h-5 mr-2.5" />
                        Mark as Paid
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-12 w-12 md:h-14 md:w-14 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
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
              <div className="text-center py-24 bg-muted/10 rounded-3xl border-2 border-dashed border-muted text-muted-foreground flex flex-col items-center">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm md:text-base font-bold italic">No upcoming bills. You're all caught up!</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex items-center gap-3 px-1">
            <History className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl md:text-2xl font-headline font-bold">Payment History</h2>
          </div>

          <div className="space-y-6">
            {paidReminders.map((bill) => (
              <Card key={bill.id} className="border-none shadow-sm bg-muted/10 opacity-70 grayscale hover:opacity-100 hover:grayscale-0 transition-all overflow-hidden ring-1 ring-muted">
                <CardContent className="p-6 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="p-3 rounded-full bg-emerald-100 text-emerald-600 shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm md:text-base truncate leading-tight">{bill.name}</h4>
                      <p className="text-[10px] md:text-xs text-muted-foreground mt-1 uppercase tracking-widest font-bold">
                        Settled on {format(new Date(bill.dueDate), 'MMM dd')} at {bill.dueTime}
                      </p>
                    </div>
                  </div>
                  <div className="text-base md:text-lg font-bold whitespace-nowrap text-emerald-700">
                    {currency.symbol}{formatCurrency(bill.amount)}
                  </div>
                </CardContent>
              </Card>
            ))}
            {paidReminders.length === 0 && (
              <p className="text-center py-20 text-muted-foreground text-sm md:text-base italic font-medium opacity-60">No payment history yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
