"use client";

import { useFynWealthStore, SYSTEM_CATEGORIES } from "@/lib/store";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, deleteDoc, updateDoc, query, orderBy, where, addDoc, serverTimestamp, setDoc, getDocs } from "firebase/firestore";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Edit2, 
  Trash2, 
  Loader2, 
  Filter, 
  Download, 
  Upload, 
  Calendar as CalendarIcon, 
  Tag, 
  Repeat, 
  Paperclip, 
  FileText, 
  X 
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { ExpenseCapture } from "@/components/expenses/ExpenseCapture";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ExpensesPage() {
  const { currency, viewMonth, viewYear } = useFynWealthStore();
  const { user } = useUser();
  const db = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form taxonomy state
  const [editSubcategories, setEditSubcategories] = useState<any[]>([]);
  const [isEditSubLoading, setIsEditSubLoading] = useState(false);

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    const startDate = format(new Date(viewYear, viewMonth, 1), 'yyyy-MM-dd');
    const endDate = format(new Date(viewYear, viewMonth + 1, 0), 'yyyy-MM-dd');
    
    return query(
      collection(db, 'users', user.uid, 'expenses'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
  }, [db, user?.uid, viewMonth, viewYear]);

  const categoriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'categories');
  }, [db]);

  const budgetsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return collection(db, 'users', user.uid, 'budgets');
  }, [db, user?.uid]);

  const { data: expenses, isLoading } = useCollection(expensesQuery);
  const { data: categoriesData } = useCollection(categoriesQuery);
  const { data: budgetsData } = useCollection(budgetsQuery);

  const categoriesList = useMemo(() => {
    if (!categoriesData) return [];
    const catMap = new Map();
    categoriesData.forEach(cat => {
      const normalized = cat.name?.trim().toLowerCase();
      if (!normalized) return;
      if (!catMap.has(normalized) || cat.userId === user?.uid) {
        catMap.set(normalized, cat);
      }
    });
    return Array.from(catMap.values()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [categoriesData, user?.uid]);

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    return expenses
      .filter(e => {
        const desc = (e.description || e.note || "").toLowerCase();
        const cat = (e.categoryName || e.category || "").toLowerCase();
        const sub = (e.subcategoryName || e.subCategory || "").toLowerCase();
        const term = searchTerm.toLowerCase();

        const matchesSearch = desc.includes(term) || cat.includes(term) || sub.includes(term);
        const matchesStatus = statusFilter === "all" || e.status === statusFilter;
        const matchesCategory = categoryFilter === "all" || (e.categoryName === categoryFilter || e.category === categoryFilter);
        return matchesSearch && matchesStatus && matchesCategory;
      });
  }, [expenses, searchTerm, statusFilter, categoryFilter]);

  const loadEditSubcategories = async (categoryId: string) => {
    if (!db || !categoryId) {
      setEditSubcategories([]);
      return;
    }
    setIsEditSubLoading(true);
    try {
      const q = query(
        collection(db, "subcategories"),
        where("categoryId", "==", categoryId)
      );
      const snapshot = await getDocs(q);
      const fetchedSubs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEditSubcategories(fetchedSubs.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || "")));
    } catch (err) {
      console.error("Failed to load edit subcategories", err);
    } finally {
      setIsEditSubLoading(false);
    }
  };

  useEffect(() => {
    if (editingExpense?.categoryId) {
      loadEditSubcategories(editingExpense.categoryId);
    }
  }, [editingExpense?.categoryId]);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (!db || !user?.uid) return;
    const docRef = doc(db, 'users', user.uid, 'expenses', id);
    updateDoc(docRef, { status: currentStatus === 'paid' ? 'unpaid' : 'paid' });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || !db || !user?.uid) return;

    setIsSaving(true);
    try {
      const categoryObj = categoriesList.find(c => c.id === editingExpense.categoryId);
      const subcategoryObj = editSubcategories.find(s => s.id === editingExpense.subcategoryId);

      const docRef = doc(db, 'users', user.uid, 'expenses', editingExpense.id);
      await updateDoc(docRef, {
        ...editingExpense,
        amount: Math.abs(parseFloat(editingExpense.amount)),
        categoryName: categoryObj?.name || editingExpense.categoryName || "Unknown",
        category: categoryObj?.name || editingExpense.category || "Unknown",
        subcategoryName: subcategoryObj?.name || "Others",
        subCategory: subcategoryObj?.name || "Others",
        description: editingExpense.description || editingExpense.note || "",
        note: editingExpense.description || editingExpense.note || "",
        updatedAt: serverTimestamp()
      });
      setEditingExpense(null);
      toast({ title: "Updated", description: "Record synchronized with cloud." });
    } catch (err) {
      toast({ variant: "destructive", title: "Update Failed", description: "Could not save changes." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditingExpense({
        ...editingExpense,
        billImageData: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string) => {
    if (!db || !user?.uid) return;
    deleteDoc(doc(db, 'users', user.uid, 'expenses', id));
    toast({ title: "Deleted", description: "Record removed." });
  };

  const handleExport = () => {
    if (filteredExpenses.length === 0) {
      toast({ variant: "destructive", title: "Export Error", description: "No transactions to export." });
      return;
    }

    const headers = ["Date", "Description", "Category", "Subcategory", "Amount", "Status", "Budget Limit"];
    const rows = filteredExpenses.map(e => {
      const budget = (budgetsData || []).find(b => 
        b.categoryId === e.categoryId || 
        b.categoryName === (e.categoryName || e.category)
      );

      return [
        e.date,
        `"${(e.description || e.note || "").replace(/"/g, '""')}"`,
        e.categoryName || e.category,
        e.subcategoryName || e.subCategory || "Others",
        e.amount,
        e.status || 'paid',
        budget ? budget.limit : ""
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `fynwealth-vault-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Export Ready", description: "CSV file downloaded successfully." });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !db || !user?.uid) return;

    setIsImporting(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      
      if (lines.length <= 1) {
        toast({ variant: "destructive", title: "Import Error", description: "The file appears to be empty." });
        setIsImporting(false);
        return;
      }

      const dataRows = lines.slice(1);
      let successCount = 0;

      for (const row of dataRows) {
        try {
          const parts = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          
          if (parts.length >= 5) {
            const [date, desc, cat, sub, amt, status, budgetLimit] = parts.map(p => p.trim().replace(/^"|"$/g, ''));
            
            const parsedAmount = Math.abs(parseFloat(amt));
            if (isNaN(parsedAmount)) throw new Error("Invalid amount");

            addDoc(collection(db, 'users', user.uid, 'expenses'), {
              userId: user.uid,
              date: date || format(new Date(), 'yyyy-MM-dd'),
              note: desc || "",
              description: desc || "",
              categoryName: cat || "Miscellaneous",
              category: cat || "Miscellaneous",
              subcategoryName: sub || "Others",
              subCategory: sub || "Others",
              amount: parsedAmount,
              status: (status?.toLowerCase() === 'unpaid' ? 'unpaid' : 'paid') as 'paid' | 'unpaid',
              createdAt: serverTimestamp()
            });

            if (budgetLimit && !isNaN(parseFloat(budgetLimit))) {
              const categoryMatch = (categoriesData || []).find(c => 
                c.name.toLowerCase() === cat.toLowerCase()
              );
              
              if (categoryMatch) {
                const budgetRef = doc(db, 'users', user.uid, 'budgets', categoryMatch.id);
                setDoc(budgetRef, {
                  categoryId: categoryMatch.id,
                  categoryName: categoryMatch.name,
                  limit: Math.abs(parseFloat(budgetLimit)),
                  userId: user.uid,
                  updatedAt: serverTimestamp()
                }, { merge: true });
              }
            }

            successCount++;
          }
        } catch (err) {
          // skip
        }
      }

      toast({ 
        title: "Import Complete", 
        description: `Processed ${successCount} entries. Syncing with cloud...` 
      });
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    reader.readAsText(file);
  };

  const formatAmount = (amount: number) => {
    return Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 px-1">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold font-headline text-primary tracking-tight">Expenses</h1>
          <p className="text-sm md:text-base text-muted-foreground font-medium">Track and manage every cent across devices.</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".csv" 
            onChange={handleFileImport} 
          />
          <Button 
            variant="outline" 
            className="h-11 rounded-xl bg-card shadow-sm border-primary/20 text-primary font-bold px-6 transition-all hover:bg-primary/5"
            onClick={handleImportClick}
            disabled={isImporting}
          >
            {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Import CSV
          </Button>
          <Button 
            variant="outline" 
            className="h-11 rounded-xl bg-card shadow-sm border-primary/20 text-primary font-bold px-6 transition-all hover:bg-primary/5"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <ExpenseCapture />
        </div>
        
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-sm overflow-hidden bg-card">
            <CardHeader className="pb-6 bg-muted/20 border-b border-muted/50 p-6">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base md:text-lg font-headline font-bold uppercase tracking-widest text-muted-foreground">Transaction History</CardTitle>
                  <Button variant="ghost" size="sm" className="h-9 text-[10px] uppercase font-bold rounded-lg border border-transparent hover:border-muted-foreground/20">
                    <Filter className="w-3.5 h-3.5 mr-2" /> Filter
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-5 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input 
                      placeholder="Search description..." 
                      className="pl-11 h-12 rounded-xl border-muted bg-background focus:ring-primary shadow-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-12 rounded-xl border-muted bg-background shadow-sm px-4">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-4">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-12 rounded-xl border-muted bg-background shadow-sm px-4">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] rounded-xl">
                        <SelectItem value="all">All Categories</SelectItem>
                        {categoriesList.map(cat => (
                          <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10 border-none hover:bg-muted/10">
                      <TableHead className="text-[10px] uppercase font-bold tracking-widest pl-6 h-12">Status</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold tracking-widest h-12">Date</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold tracking-widest h-12">Description</TableHead>
                      <TableHead className="text-right text-[10px] uppercase font-bold tracking-widest h-12">Amount</TableHead>
                      <TableHead className="text-right text-[10px] uppercase font-bold tracking-widest pr-6 h-12">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-24"><Loader2 className="w-10 h-10 animate-spin mx-auto text-primary/30" /></TableCell>
                      </TableRow>
                    ) : filteredExpenses.map((expense) => {
                      const displayDescription = expense.description || expense.note || (
                        expense.subcategoryName && expense.subcategoryName !== 'Others' 
                          ? `${expense.categoryName} - ${expense.subcategoryName}` 
                          : expense.categoryName
                      );

                      return (
                        <TableRow key={expense.id} className="hover:bg-primary/5 transition-colors border-b border-muted/30 group">
                          <TableCell className="pl-6 py-5">
                            <button 
                              onClick={() => handleToggleStatus(expense.id, expense.status)}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-all active:scale-95 ${
                                expense.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                              }`}
                            >
                              {(expense.status || 'paid').toUpperCase()}
                            </button>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-muted-foreground">{format(new Date(expense.date), 'MMM dd')}</TableCell>
                          <TableCell className="py-5">
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-sm truncate max-w-[200px] text-foreground mb-1">{displayDescription}</span>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary" className="bg-primary/5 text-primary text-[8px] px-2 py-0.5 h-auto border-none font-bold uppercase inline-flex items-center text-center">
                                  {expense.categoryName || expense.category || "General"}
                                </Badge>
                                {(expense.subcategoryName || expense.subCategory) && (expense.subcategoryName || expense.subCategory) !== 'Others' && (
                                  <span className="text-[8px] text-muted-foreground uppercase font-bold bg-muted/30 px-2 py-0.5 rounded-full tracking-tighter">/ {expense.subcategoryName || expense.subCategory}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-sm text-foreground">
                            {currency.symbol}{formatAmount(expense.amount)}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end gap-2 transition-all">
                              <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl hover:bg-primary/10 transition-all" onClick={() => setEditingExpense({ ...expense, amount: expense.amount.toString() })}>
                                <Edit2 className="w-4 h-4 text-muted-foreground hover:text-primary" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl hover:bg-destructive/10 group transition-all"><Trash2 className="w-4 h-4 text-muted-foreground group-hover:text-destructive" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[20px] p-8 border-none shadow-2xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-xl font-bold font-headline">Delete Record?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-sm mt-2">This will permanently remove this expense from your vault. This action cannot be reversed.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="mt-8 gap-3">
                                    <AlertDialogCancel className="rounded-xl h-12 font-bold px-6">Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(expense.id)} className="bg-destructive rounded-xl h-12 font-bold px-6 shadow-lg shadow-destructive/20 transition-all active:scale-95">Confirm Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredExpenses.length === 0 && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-32 text-muted-foreground font-medium italic text-sm">
                          No transactions found for this period.
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

      {editingExpense && (
        <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
          <DialogContent className="sm:max-w-[550px] rounded-[24px] p-0 overflow-hidden border-none shadow-2xl gap-0">
            <DialogHeader className="p-8 bg-primary/5 border-b border-muted/50">
              <DialogTitle className="font-headline text-2xl font-bold text-primary">Edit Transaction</DialogTitle>
            </DialogHeader>
            
            <ScrollArea className="max-h-[70vh]">
              <form onSubmit={handleSaveEdit} className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Amount ({currency.symbol})</Label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="flex h-12 w-full rounded-xl bg-muted/30 border-none shadow-inner px-4 text-xl font-bold transition-all focus:ring-2 focus:ring-primary" 
                      value={editingExpense.amount} 
                      onChange={(e) => setEditingExpense({...editingExpense, amount: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Date</Label>
                    <Input 
                      type="date" 
                      className="h-12 rounded-xl bg-muted/30 border-none shadow-inner px-4 font-bold" 
                      value={editingExpense.date} 
                      onChange={(e) => setEditingExpense({...editingExpense, date: e.target.value})} 
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Category</Label>
                    <Select 
                      value={editingExpense.categoryId || ""} 
                      onValueChange={(v) => setEditingExpense({...editingExpense, categoryId: v, subcategoryId: ""})}
                    >
                      <SelectTrigger className="h-12 rounded-xl font-bold shadow-inner bg-muted/30 border-none px-4">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl z-[150] max-h-[250px]">
                        {categoriesList.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Subcategory</Label>
                    <Select 
                      value={editingExpense.subcategoryId || ""} 
                      onValueChange={(v) => setEditingExpense({...editingExpense, subcategoryId: v})}
                      disabled={!editingExpense.categoryId || isEditSubLoading}
                    >
                      <SelectTrigger className="h-12 rounded-xl font-medium shadow-inner bg-muted/30 border-none px-4">
                        <SelectValue placeholder={isEditSubLoading ? "Loading..." : "Select Subcategory (Optional)"} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl z-[150] max-h-[200px]">
                        {editSubcategories.map(sub => (
                          <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Description</Label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-50" />
                    <Input 
                      className="h-12 pl-11 rounded-xl bg-muted/30 border-none shadow-inner px-4 font-medium" 
                      value={editingExpense.description || editingExpense.note || ""} 
                      onChange={(e) => setEditingExpense({...editingExpense, description: e.target.value, note: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-5 bg-muted/20 rounded-[20px] border border-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                        <Repeat className="w-5 h-5" />
                      </div>
                      <div>
                        <Label className="text-sm font-bold block">Recurring expense</Label>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Auto-record monthly</p>
                      </div>
                    </div>
                    <Switch 
                      checked={editingExpense.isRecurring || false} 
                      onCheckedChange={(val) => setEditingExpense({...editingExpense, isRecurring: val})} 
                      className="scale-110"
                    />
                  </div>

                  {editingExpense.isRecurring && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Frequency</Label>
                      <Select 
                        value={editingExpense.frequency || "Monthly"} 
                        onValueChange={(v) => setEditingExpense({...editingExpense, frequency: v})}
                      >
                        <SelectTrigger className="h-12 rounded-xl font-medium shadow-inner bg-muted/30 border-none px-4">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl z-[150]">
                          {['Weekly', 'Monthly', 'Quarterly', 'Annually'].map(f => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Attachment</Label>
                  {!editingExpense.billImageData ? (
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full h-12 rounded-xl border-dashed border-primary/30 text-primary hover:bg-primary/5 font-bold"
                      onClick={() => editFileInputRef.current?.click()}
                    >
                      <Paperclip className="w-4 h-4 mr-2" />
                      Attach Bill / PDF
                    </Button>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10 shadow-sm">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-white shadow-inner flex items-center justify-center overflow-hidden">
                          {editingExpense.billImageData.startsWith('data:application/pdf') ? (
                            <FileText className="w-6 h-6 text-primary" />
                          ) : (
                            <img src={editingExpense.billImageData} alt="Preview" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <span className="text-xs font-bold truncate pr-4 text-primary uppercase tracking-widest">Document Attached</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setEditingExpense({...editingExpense, billImageData: null})} 
                        className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={editFileInputRef} 
                    className="hidden" 
                    accept="image/*,application/pdf"
                    onChange={handleEditFileChange}
                  />
                </div>

                <div className="flex gap-4 pt-4 pb-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="flex-1 h-14 rounded-xl font-bold" 
                    onClick={() => setEditingExpense(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSaving} 
                    className="flex-[2] h-14 font-bold rounded-xl shadow-lg transition-all active:scale-95 text-base"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Save Changes"}
                  </Button>
                </div>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
