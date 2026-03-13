"use client";

import { useState, useMemo, useRef } from "react";
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
  X,
  CreditCard,
  History,
  Loader2,
  HelpCircle,
  Calendar as CalendarIcon,
  PlusCircle,
  Paperclip,
  FileText
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function BillsPage() {
  const { currency, viewMonth, viewYear, setViewDate } = useFynWealthStore();
  const { user } = useUser();
  const db = useFirestore();
  
  const [showForm, setShowForm] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    dueTime: '09:00',
    frequency: 'Monthly' as Frequency,
    category: 'Miscellaneous',
    subCategory: 'Others',
    attachmentData: '' as string | null,
    attachmentName: '' as string | null,
  });

  const categoriesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return collection(db, 'users', user.uid, 'categories');
  }, [db, user?.uid]);

  const { data: customCategories } = useCollection(categoriesQuery);

  const allCategoriesList = useMemo(() => {
    const system = Object.keys(SYSTEM_CATEGORIES);
    const custom = (customCategories || []).map(c => c.name);
    return Array.from(new Set([...system, ...custom])).sort((a, b) => {
      if (a === 'Miscellaneous') return 1;
      if (b === 'Miscellaneous') return -1;
      return a.localeCompare(b);
    });
  }, [customCategories]);

  const billsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'users', user.uid, 'bills'),
      orderBy('dueDate', 'asc')
    );
  }, [db, user?.uid]);

  const { data: bills, isLoading } = useCollection(billsQuery);

  const subCategories = useMemo(() => {
    return SYSTEM_CATEGORIES[formData.category as keyof typeof SYSTEM_CATEGORIES] || ["Others"];
  }, [formData.category]);

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setViewDate(date.getMonth(), date.getFullYear());
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({ variant: "destructive", title: "Invalid File", description: "Please upload an image or PDF." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File Too Large", description: "Maximum file size is 5MB." });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        attachmentData: reader.result as string,
        attachmentName: file.name
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setFormData(prev => ({ ...prev, attachmentData: null, attachmentName: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddCustomCategory = async () => {
    if (!newCategoryName.trim() || !db || !user?.uid) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'categories'), {
        name: newCategoryName.trim(),
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setFormData(prev => ({ ...prev, category: newCategoryName.trim(), subCategory: 'Others' }));
      setNewCategoryName("");
      setIsCategoryDialogOpen(false);
      toast({ title: "Category Added", description: `"${newCategoryName}" is now available.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save category." });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount || !db || !user?.uid) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'bills'), {
        name: formData.name,
        amount: Math.abs(parseFloat(formData.amount)),
        dueDate: formData.dueDate,
        dueTime: formData.dueTime,
        frequency: formData.frequency,
        category: formData.category,
        subCategory: formData.subCategory,
        attachmentData: formData.attachmentData,
        userId: user.uid,
        status: 'pending',
        notified: false,
        createdAt: serverTimestamp()
      });

      setFormData({
        name: '',
        amount: '',
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        dueTime: '09:00',
        frequency: 'Monthly',
        category: 'Miscellaneous',
        subCategory: 'Others',
        attachmentData: null,
        attachmentName: null,
      });
      setShowForm(false);
      toast({ title: "Reminder Set", description: "Saved successfully." });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Could not sync bill." });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    if (!db || !user?.uid) return;
    await updateDoc(doc(db, 'users', user.uid, 'bills', id), { status: 'paid' });
    toast({ title: "Settled", description: "Bill marked as paid." });
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
          <h1 className="text-2xl md:text-3xl font-bold font-headline text-primary tracking-tight">Custom Reminders</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase">{format(new Date(viewYear, viewMonth), 'MMMM yyyy')}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setShowTutorial(true)} className="rounded-xl"><HelpCircle className="w-5 h-5" /></Button>
          <Popover>
            <PopoverTrigger asChild><Button variant="outline" size="icon" className="rounded-xl"><CalendarIcon className="w-5 h-5" /></Button></PopoverTrigger>
            <PopoverContent className="z-[100] w-auto p-0 border-none shadow-2xl rounded-2xl overflow-hidden mt-2" align="end">
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
        <Card className="border-none shadow-2xl overflow-hidden animate-in slide-in-from-top-4 rounded-3xl">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-xl font-headline flex items-center gap-3 font-bold text-primary">
              <CreditCard className="w-6 h-6" /> Configure Reminder
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Reminder Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="h-12 rounded-xl" placeholder="e.g. Rent Payment" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">{currency.symbol}</span>
                    <Input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required className="pl-8 h-12 rounded-xl font-bold" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Due Date</Label>
                  <Input type="date" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} required className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Frequency</Label>
                  <Select value={formData.frequency} onValueChange={(v) => setFormData({...formData, frequency: v as Frequency})}>
                    <SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[100]">
                      {['One-time', 'Weekly', 'Monthly', 'Quarterly', 'Annually'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Category</Label>
                    <button 
                      type="button" 
                      onClick={() => setIsCategoryDialogOpen(true)}
                      className="text-primary hover:text-primary/80 transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <Select 
                    value={formData.category} 
                    onValueChange={(v) => {
                      const newSubCategory = SYSTEM_CATEGORIES[v]?.[0] || 'Others';
                      setFormData({...formData, category: v, subCategory: newSubCategory});
                    }}
                  >
                    <SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue placeholder="Select Category" /></SelectTrigger>
                    <SelectContent className="z-[100] max-h-[300px]">
                      {allCategoriesList.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Subcategory</Label>
                <Select value={formData.subCategory} onValueChange={(v) => setFormData({...formData, subCategory: v})}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select Subcategory" /></SelectTrigger>
                  <SelectContent className="z-[100] max-h-[250px]">
                    {subCategories.map(sub => <SelectItem key={sub} value={sub}>{sub}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Bill Attachment (Max 5MB)</Label>
                <div className="flex flex-col gap-2">
                  {!formData.attachmentData ? (
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full h-12 rounded-xl border-dashed border-primary/30 text-primary hover:bg-primary/5 font-bold"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="w-4 h-4 mr-2" />
                      Add attachment
                    </Button>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/10">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-5 h-5 text-primary shrink-0" />
                        <span className="text-xs font-bold truncate pr-2">{formData.attachmentName}</span>
                      </div>
                      <button type="button" onClick={removeAttachment} className="p-1 hover:bg-primary/10 rounded-full transition-colors">
                        <X className="w-4 h-4 text-primary" />
                      </button>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-14 font-bold rounded-xl shadow-lg">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Custom Reminder"}
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
              <Card key={bill.id} className={cn("border-none shadow-sm ring-1 ring-primary/5 rounded-2xl", isOverdue && "ring-destructive/30 bg-destructive/5")}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="min-w-0">
                      <h4 className="font-bold text-lg truncate pr-2">{bill.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="secondary" className="text-[9px] font-bold uppercase">{bill.category}</Badge>
                        {bill.subCategory && bill.subCategory !== 'Others' && (
                          <span className="text-[9px] text-muted-foreground uppercase font-medium">/ {bill.subCategory}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-xl text-primary">{currency.symbol}{bill.amount.toLocaleString()}</div>
                      <div className={cn("text-[10px] font-bold uppercase mt-1", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                        {isOverdue ? "Overdue" : "Due"} {format(date, 'MMM dd')}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleMarkPaid(bill.id)} className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/10">Mark Paid</Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(bill.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!isLoading && pendingReminders.length === 0 && (
            <div className="text-center py-12 bg-muted/10 rounded-2xl border-2 border-dashed border-muted text-muted-foreground italic text-sm">
              No pending reminders.
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2 px-1">
            <History className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-headline font-bold">History</h2>
          </div>
          {paidReminders.slice(0, 8).map((bill) => (
            <Card key={bill.id} className="border-none shadow-sm opacity-70 rounded-xl hover:opacity-100 transition-opacity">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-sm truncate block">{bill.name}</span>
                    <span className="text-[9px] text-muted-foreground uppercase font-bold">Paid on {format(new Date(bill.dueDate), 'MMM dd')}</span>
                  </div>
                </div>
                <span className="font-bold text-sm text-foreground shrink-0">{currency.symbol}{bill.amount.toLocaleString()}</span>
              </CardContent>
            </Card>
          ))}
          {paidReminders.length === 0 && (
            <div className="text-center py-12 text-muted-foreground italic text-xs">
              No payment history yet.
            </div>
          )}
        </div>
      </div>

      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[400px] p-8 rounded-3xl border-none shadow-2xl z-[150]">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl font-headline font-bold text-primary">Add Category</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">New Category Name</label>
              <Input 
                placeholder="e.g. Pet Care" 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="h-12 rounded-xl text-sm font-bold shadow-sm"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-14 font-bold rounded-xl shadow-lg" onClick={handleAddCustomCategory}>Create Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
