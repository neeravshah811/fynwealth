"use client";

import { useState } from "react";
import { useFynWealthStore, Frequency, SYSTEM_CATEGORIES } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Plus, Trash2, CheckCircle2, Calendar, Clock, AlertCircle, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";

const REMINDER_FREQUENCIES: Frequency[] = ['Weekly', 'Monthly', 'Quarterly', 'Half-yearly', 'Annually'];

export function CustomReminders() {
  const { bills, addBill, deleteBill, markBillPaid, currency, customCategories } = useFynWealthStore();
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    frequency: 'Monthly' as Frequency,
    category: 'Miscellaneous',
    subCategory: '',
    notes: ''
  });

  const allCategories = { ...SYSTEM_CATEGORIES, ...customCategories };
  const categoriesList = Object.keys(allCategories);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount || !formData.dueDate) return;

    addBill({
      name: formData.name,
      amount: Math.abs(parseFloat(formData.amount)),
      dueDate: formData.dueDate,
      frequency: formData.frequency,
      category: formData.category,
      subCategory: formData.subCategory,
      notes: formData.notes
    });

    setFormData({
      name: '',
      amount: '',
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      frequency: 'Monthly',
      category: 'Miscellaneous',
      subCategory: '',
      notes: ''
    });
    setShowForm(false);
    toast({ title: "Reminder Set", description: `We'll remind you about ${formData.name}.` });
  };

  const pendingReminders = bills.filter(b => b.status === 'pending');
  const paidReminders = bills.filter(b => b.status === 'paid');

  const formatCurrency = (val: number) => {
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Card className="border-none shadow-sm overflow-hidden ring-1 ring-primary/5 bg-card">
      <CardHeader className="bg-primary/5 flex flex-row items-center justify-between pb-6">
        <div>
          <CardTitle className="text-xl font-headline flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Reminders & Upcoming
          </CardTitle>
          <CardDescription className="text-sm">Stay on top of your future payments.</CardDescription>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)} 
          variant={showForm ? "ghost" : "default"}
          className="rounded-xl h-11 px-5"
        >
          {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5 mr-2" />}
          {showForm ? "Cancel" : "New Reminder"}
        </Button>
      </CardHeader>

      <CardContent className="p-6">
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-6 mb-10 p-6 bg-muted/20 rounded-2xl border border-muted animate-in slide-in-from-top-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Expense Name</Label>
                <Input 
                  placeholder="e.g. Gym Membership" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="h-11 rounded-xl"
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
                  className="h-11 rounded-xl font-bold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Due Date</Label>
                <Input 
                  type="date" 
                  value={formData.dueDate} 
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  className="h-11 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Frequency</Label>
                <Select value={formData.frequency} onValueChange={(v) => setFormData({...formData, frequency: v as Frequency})}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {REMINDER_FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[250px] rounded-xl">
                    {categoriesList.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Description (Optional)</Label>
              <Textarea 
                placeholder="Account numbers, specific instructions..." 
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="rounded-xl min-h-[80px]"
              />
            </div>

            <Button type="submit" className="w-full h-12 font-bold rounded-xl shadow-lg shadow-primary/10">
              Set Reminder
            </Button>
          </form>
        )}

        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-muted-foreground">Pending Reminders</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingReminders.map((bill) => {
              const date = new Date(bill.dueDate);
              const isOverdue = isPast(date) && !isToday(date);
              
              return (
                <div key={bill.id} className={cn(
                  "p-5 rounded-2xl border transition-all hover:shadow-md group relative",
                  isOverdue ? "bg-destructive/5 border-destructive/20" : "bg-card border-muted"
                )}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base">{bill.name}</h4>
                        {isOverdue && <AlertCircle className="w-4 h-4 text-destructive" />}
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-5 border-muted-foreground/20 text-muted-foreground">
                        {bill.frequency}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-primary">{currency.symbol}{formatCurrency(bill.amount)}</div>
                      <div className={cn("text-[11px] font-bold uppercase", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                        {isOverdue ? "Overdue" : "Due"} {format(date, 'MMM dd')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1 rounded-xl h-10 font-bold bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10"
                      onClick={() => markBillPaid(bill.id)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Paid
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                      onClick={() => deleteBill(bill.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {pendingReminders.length === 0 && (
              <div className="md:col-span-2 text-center py-12 bg-muted/20 rounded-2xl border border-dashed border-muted text-muted-foreground italic text-sm">
                No pending reminders.
              </div>
            )}
          </div>
        </div>

        {paidReminders.length > 0 && (
          <div className="mt-10 space-y-6 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-muted-foreground">Recently Settled</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {paidReminders.slice(0, 3).map((bill) => (
                <div key={bill.id} className="p-4 rounded-xl border border-muted bg-emerald-50/30 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{bill.name}</p>
                    <p className="text-[10px] text-muted-foreground">Paid on {format(new Date(bill.dueDate), 'MMM dd')}</p>
                  </div>
                  <div className="font-bold text-sm text-emerald-700 whitespace-nowrap">
                    {currency.symbol}{formatCurrency(bill.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
