"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useFynWealthStore, Frequency } from "@/lib/store";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, deleteDoc, updateDoc, doc, serverTimestamp, query, orderBy, getDocs, where } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Paperclip,
  FileText,
  MessageSquare
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";

export default function BillsPage() {
  const { currency, viewMonth, viewYear, setViewDate } = useFynWealthStore();
  const { user } = useUser();
  const db = useFirestore();
  
  const [showForm, setShowForm] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [isSubLoading, setIsSubLoading] = useState(false);

  const [isCustomCategoryOpen, setIsCustomCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    dueTime: '09:00',
    frequency: 'Monthly' as Frequency,
    attachmentData: '' as string | null,
    attachmentName: '' as string | null,
    note: ''
  });

  const loadCategories = async () => {
    if (!db) return;
    try {
      const snapshot = await getDocs(collection(db, "categories"));
      const catMap = new Map();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const normalized = data.name?.trim().toLowerCase();
        if (!normalized) return;
        
        if (!catMap.has(normalized) || data.userId === user?.uid) {
          catMap.set(normalized, { id: doc.id, ...data });
        }
      });
      
      setCategories(Array.from(catMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error("Failed to load categories", err);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [db]);

  async function loadSubcategories(categoryId: string) {
    if (!db || !categoryId || categoryId === 'empty' || categoryId === 'loading') {
      setSubcategories([]);
      return;
    }
    setIsSubLoading(true);
    try {
      const q = query(
        collection(db, "subcategories"),
        where("categoryId", "==", categoryId)
      );
      const snapshot = await getDocs(q);
      const fetchedSubs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const sorted = fetchedSubs.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
      setSubcategories(sorted);

      if (sorted.length === 1) {
        setSelectedSubcategory(sorted[0].id);
      } else {
        setSelectedSubcategory("");
      }
    } catch (err) {
      console.error("Failed to load subcategories", err);
    } finally {
      setIsSubLoading(false);
    }
  }

  const handleCategoryChange = (categoryId: string) => {
    if (categoryId === 'empty' || categoryId === 'loading') return;
    setSelectedCategory(categoryId);
    setSelectedSubcategory("");
    loadSubcategories(categoryId);
  };

  const handleAddCustomCategory = async () => {
    if (!newCategoryName.trim() || !db || !user?.uid) return;
    setIsCreatingCategory(true);
    try {
      const categoryRef = await addDoc(collection(db, "categories"), {
        name: newCategoryName.trim(),
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, "subcategories"), {
        name: "Others",
        categoryId: categoryRef.id,
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      toast({ title: "Category Added", description: `"${newCategoryName}" is now available.` });
      setNewCategoryName("");
      setIsCustomCategoryOpen(false);
      
      await loadCategories();
      handleCategoryChange(categoryRef.id);
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to create custom category." });
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const billsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'users', user.uid, 'bills'),
      orderBy('dueDate', 'asc')
    );
  }, [db, user?.uid]);

  const { data: bills, isLoading } = useCollection(billsQuery);

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setViewDate(date.getMonth(), date.getFullYear());
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      dueTime: '09:00',
      frequency: 'Monthly',
      attachmentData: null,
      attachmentName: null,
      note: ''
    });
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSubcategories([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user?.uid) return;

    if (!formData.name || !formData.amount) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please enter a name and amount." });
      return;
    }

    if (!selectedCategory || selectedCategory === 'empty') {
      toast({ variant: "destructive", title: "Category Required", description: "Please pick a category." });
      return;
    }

    setLoading(true);
    try {
      const categoryObj = categories.find(c => c.id === selectedCategory);
      const subcategoryObj = selectedSubcategory ? subcategories.find(s => s.id === selectedSubcategory) : null;

      await addDoc(collection(db, 'users', user.uid, 'bills'), {
        name: formData.name,
        amount: Math.abs(parseFloat(formData.amount)),
        dueDate: formData.dueDate,
        dueTime: formData.dueTime,
        frequency: formData.frequency,
        categoryId: selectedCategory,
        categoryName: categoryObj?.name || "Unknown",
        subcategoryId: selectedSubcategory || "",
        subcategoryName: subcategoryObj?.name || "Others",
        attachmentData: formData.attachmentData,
        note: formData.note,
        userId: user.uid,
        status: 'pending',
        notified: false,
        createdAt: serverTimestamp()
      });

      resetForm();
      setShowForm(false);
      toast({ title: "Reminder Sync", description: "Saved to your cloud vault." });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Could not save reminder." });
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
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 px-1">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold font-headline text-primary tracking-tight">Custom Reminders</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{format(new Date(viewYear, viewMonth), 'MMMM yyyy')}</p>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setShowTutorial(true)} className="h-11 w-11 rounded-xl shadow-sm border-primary/20 transition-all hover:bg-primary/5">
              <HelpCircle className="w-5 h-5" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl shadow-sm border-primary/20 transition-all hover:bg-primary/5">
                  <CalendarIcon className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-auto p-0 border-none shadow-2xl rounded-[20px] overflow-hidden mt-4" align="end">
                <Calendar mode="single" selected={new Date(viewYear, viewMonth)} onSelect={handleCalendarSelect} />
              </PopoverContent>
            </Popover>
          </div>
          <Button id="tour-reminders-add" onClick={() => setShowForm(!showForm)} className="rounded-xl h-11 px-8 shadow-lg transition-all active:scale-95">
            {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showForm ? "Cancel" : "Add Reminder"}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="border-none shadow-2xl overflow-hidden animate-in slide-in-from-top-8 rounded-[20px]">
          <CardHeader className="bg-primary/5 border-b border-muted/50 p-8">
            <CardTitle className="text-xl font-headline flex items-center gap-4 font-bold text-primary">
              <CreditCard className="w-6 h-6" /> Configure Reminder
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Reminder Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="h-12 rounded-xl px-4 font-medium" placeholder="e.g. Rent Payment" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Amount</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">{currency.symbol}</span>
                    <input 
                      type="number" 
                      value={formData.amount} 
                      onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                      required 
                      className="flex h-12 w-full rounded-xl border border-input bg-background py-2 pl-9 pr-4 text-sm font-bold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Due Date</Label>
                  <Input type="date" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} required className="h-12 rounded-xl px-4" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Frequency</Label>
                  <Select value={formData.frequency} onValueChange={(v) => setFormData({...formData, frequency: v as Frequency})}>
                    <SelectTrigger className="h-12 rounded-xl font-bold shadow-sm px-4"><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[100] rounded-xl">
                      {['One-time', 'Weekly', 'Monthly', 'Quarterly', 'Annually'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1 h-5 mb-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Category</Label>
                    <button 
                      type="button" 
                      onClick={() => setIsCustomCategoryOpen(true)}
                      className="text-primary hover:text-primary/80 transition-colors p-1 rounded-full hover:bg-primary/5"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="h-12 rounded-xl font-bold shadow-sm px-4"><SelectValue placeholder="Select Category" /></SelectTrigger>
                    <SelectContent className="z-[100] max-h-[300px] rounded-xl">
                      {categories.length > 0 ? (
                        categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)
                      ) : (
                        <SelectItem value="empty" disabled>No categories found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center px-1 h-5 mb-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Subcategory</Label>
                  </div>
                  <Select 
                    key={`sub-rem-${selectedCategory}`}
                    value={selectedSubcategory} 
                    onValueChange={setSelectedSubcategory}
                    disabled={!selectedCategory || isSubLoading}
                  >
                    <SelectTrigger className="h-12 rounded-xl shadow-sm px-4"><SelectValue placeholder={isSubLoading ? "Loading..." : "Select Subcategory (Optional)"} /></SelectTrigger>
                    <SelectContent className="z-[100] max-h-[250px] rounded-xl">
                      {isSubLoading ? (
                        <SelectItem value="loading" disabled>
                          <div className="flex items-center"><Loader2 className="w-3 h-3 animate-spin mr-2" /> Loading...</div>
                        </SelectItem>
                      ) : subcategories.length > 0 ? (
                        subcategories.map(sub => <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>)
                      ) : (
                        <SelectItem value="empty" disabled>No subcategories found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Description (Optional)</Label>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-4 w-4 h-4 text-muted-foreground opacity-50" />
                  <Textarea 
                    value={formData.note} 
                    onChange={(e) => setFormData({...formData, note: e.target.value})} 
                    placeholder="Additional details, account numbers, etc." 
                    className="rounded-xl min-h-[100px] pl-11 pr-4 py-3 font-medium shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Attachment</Label>
                <div className="flex flex-col gap-3">
                  {!formData.attachmentData ? (
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full h-12 rounded-xl border-dashed border-primary/30 text-primary hover:bg-primary/5 font-bold transition-all"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="w-4 h-4 mr-2" />
                      Add Bill / Invoice
                    </Button>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10 shadow-sm">
                      <div className="flex items-center gap-4 min-w-0">
                        <FileText className="w-6 h-6 text-primary shrink-0" />
                        <span className="text-xs font-bold truncate pr-4">{formData.attachmentName}</span>
                      </div>
                      <button type="button" onClick={removeAttachment} className="p-2 hover:bg-primary/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-primary" />
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

              <Button type="submit" disabled={loading} className="w-full h-14 font-bold rounded-xl shadow-lg transition-all active:scale-95 text-base">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Save Reminder"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div id="tour-reminders-list" className="space-y-8">
          <div className="flex items-center gap-3 px-1">
            <Clock className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-headline font-bold tracking-tight">Upcoming</h2>
          </div>
          {isLoading ? (
            <div className="py-24 text-center"><Loader2 className="w-12 h-12 animate-spin mx-auto text-primary/30" /></div>
          ) : pendingReminders.map((bill) => {
            const date = new Date(bill.dueDate);
            const isOverdue = isPast(date) && !isToday(date);
            return (
              <Card key={bill.id} className={cn("border-none shadow-sm ring-1 ring-primary/5 rounded-[20px] transition-all hover:shadow-md", isOverdue && "ring-destructive/30 bg-destructive/5")}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="min-w-0 pr-4">
                      <h4 className="font-bold text-lg truncate mb-2 leading-tight">{bill.name}</h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="bg-primary/5 text-primary text-[9px] py-1 px-2.5 h-auto border-none font-bold uppercase inline-flex items-center text-center">
                          {bill.categoryName}
                        </Badge>
                        {bill.subcategoryName && bill.subcategoryName !== 'Others' && (
                          <span className="text-[9px] text-muted-foreground uppercase font-bold bg-muted/30 px-2 py-1 rounded-full tracking-tighter">/ {bill.subcategoryName}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-2xl text-primary tracking-tighter mb-1">{currency.symbol}{bill.amount.toLocaleString()}</div>
                      <div className={cn("text-[10px] font-bold uppercase tracking-widest", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                        {isOverdue ? "Overdue" : "Due"} {format(date, 'MMM dd')}
                      </div>
                    </div>
                  </div>
                  
                  {bill.note && (
                    <div className="mb-8 p-4 bg-muted/20 rounded-[16px] flex items-start gap-3 border border-muted/50">
                      <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed italic font-medium">{bill.note}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button onClick={() => handleMarkPaid(bill.id)} className="flex-1 rounded-xl h-11 font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/10 transition-all active:scale-95">Mark Paid</Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(bill.id)} className="h-11 w-11 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!isLoading && pendingReminders.length === 0 && (
            <div className="text-center py-20 bg-muted/10 rounded-[20px] border-2 border-dashed border-muted text-muted-foreground font-medium italic text-sm">
              No pending reminders.
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="flex items-center gap-3 px-1">
            <History className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-headline font-bold tracking-tight">History</h2>
          </div>
          <div className="space-y-4">
            {paidReminders.slice(0, 8).map((bill) => (
              <Card key={bill.id} className="border-none shadow-sm opacity-70 rounded-xl hover:opacity-100 transition-all hover:shadow-md hover:ring-primary/10">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-sm truncate block text-foreground mb-0.5">{bill.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Paid {format(new Date(bill.dueDate), 'MMM dd')}</span>
                    </div>
                  </div>
                  <span className="font-bold text-base text-foreground shrink-0 tracking-tight">{currency.symbol}{bill.amount.toLocaleString()}</span>
                </CardContent>
              </Card>
            ))}
            {paidReminders.length === 0 && (
              <div className="text-center py-20 text-muted-foreground font-medium italic text-xs">
                No recent settlements.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
