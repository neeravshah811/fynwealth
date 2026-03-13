
"use client";

import { useFynWealthStore, SYSTEM_CATEGORIES } from "@/lib/store";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, deleteDoc, updateDoc, query, orderBy, where, addDoc, serverTimestamp } from "firebase/firestore";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Edit2, Trash2, Loader2, Filter, Download, Upload } from "lucide-react";
import { useState, useMemo, useRef } from "react";
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
import { toast } from "@/hooks/use-toast";

export default function ExpensesPage() {
  const { currency, viewMonth, viewYear } = useFynWealthStore();
  const { user } = useUser();
  const db = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Firestore Expenses Query - Filters by current view date
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

  const { data: expenses, isLoading } = useCollection(expensesQuery);

  const categoriesList = Object.keys(SYSTEM_CATEGORIES);

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    return expenses
      .filter(e => {
        const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (e.subCategory || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || e.status === statusFilter;
        const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
        return matchesSearch && matchesStatus && matchesCategory;
      });
  }, [expenses, searchTerm, statusFilter, categoryFilter]);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (!db || !user?.uid) return;
    const docRef = doc(db, 'users', user.uid, 'expenses', id);
    await updateDoc(docRef, { status: currentStatus === 'paid' ? 'unpaid' : 'paid' });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingExpense && db && user?.uid) {
      const docRef = doc(db, 'users', user.uid, 'expenses', editingExpense.id);
      await updateDoc(docRef, {
        ...editingExpense,
        amount: Math.abs(parseFloat(editingExpense.amount))
      });
      setEditingExpense(null);
      toast({ title: "Updated", description: "Record synchronized." });
    }
  };

  const handleDelete = async (id: string) => {
    if (!db || !user?.uid) return;
    await deleteDoc(doc(db, 'users', user.uid, 'expenses', id));
    toast({ title: "Deleted", description: "Record removed." });
  };

  const handleExport = () => {
    if (filteredExpenses.length === 0) {
      toast({ variant: "destructive", title: "Export Error", description: "No transactions to export." });
      return;
    }

    const headers = ["Date", "Description", "Category", "Subcategory", "Amount", "Status"];
    const rows = filteredExpenses.map(e => [
      e.date,
      `"${e.description.replace(/"/g, '""')}"`,
      e.category,
      e.subCategory || "Others",
      e.amount,
      e.status
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `fynwealth-expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`);
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

      // Simple CSV parsing (skipping header)
      const dataRows = lines.slice(1);
      let successCount = 0;
      let failCount = 0;

      for (const row of dataRows) {
        try {
          // Naive split, but handles basics. For complex CSVs with quotes, regex is better.
          const parts = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          
          if (parts.length >= 5) {
            const [date, desc, cat, sub, amt, status] = parts.map(p => p.trim().replace(/^"|"$/g, ''));
            
            const parsedAmount = Math.abs(parseFloat(amt));
            if (isNaN(parsedAmount)) throw new Error("Invalid amount");

            await addDoc(collection(db, 'users', user.uid, 'expenses'), {
              userId: user.uid,
              date: date || format(new Date(), 'yyyy-MM-dd'),
              description: desc || "Imported Expense",
              category: cat || "Miscellaneous",
              subCategory: sub || "Others",
              amount: parsedAmount,
              status: (status?.toLowerCase() === 'paid' ? 'paid' : 'unpaid') as 'paid' | 'unpaid',
              createdAt: serverTimestamp()
            });
            successCount++;
          }
        } catch (err) {
          failCount++;
        }
      }

      toast({ 
        title: "Import Complete", 
        description: `Successfully added ${successCount} expenses.${failCount > 0 ? ` Failed to import ${failCount} rows.` : ''}` 
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-headline mb-2 text-primary">Expenses</h1>
          <p className="text-sm md:text-base text-muted-foreground">Track and manage every cent you spend across devices.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1">
          <ExpenseCapture />
        </div>
        
        <div className="lg:col-span-2 space-y-10">
          <Card className="border-none shadow-sm overflow-hidden ring-1 ring-primary/5 bg-card">
            <CardHeader className="pb-6 bg-muted/20">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base md:text-lg font-headline font-bold">Transaction History</CardTitle>
                  <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".csv" 
                      onChange={handleFileImport} 
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 text-[10px] uppercase font-bold rounded-lg border-primary/20 text-primary"
                      onClick={handleImportClick}
                      disabled={isImporting}
                    >
                      {isImporting ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Upload className="w-3 h-3 mr-1.5" />}
                      Import
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 text-[10px] uppercase font-bold rounded-lg border-primary/20 text-primary"
                      onClick={handleExport}
                    >
                      <Download className="w-3 h-3 mr-1.5" /> Export
                    </Button>
                    <Button variant="ghost" size="sm" className="h-9 text-[10px] uppercase font-bold rounded-lg">
                      <Filter className="w-3 h-3 mr-1.5" /> Filter
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-5 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input 
                      placeholder="Search description..." 
                      className="pl-10 h-12 rounded-xl"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-4">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="all">All Categories</SelectItem>
                        {categoriesList.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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
                    <TableRow className="bg-muted/10 border-none">
                      <TableHead className="text-[10px] uppercase font-bold tracking-widest pl-6">Status</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold tracking-widest">Date</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold tracking-widest">Description</TableHead>
                      <TableHead className="text-right text-[10px] uppercase font-bold tracking-widest">Amount</TableHead>
                      <TableHead className="text-right text-[10px] uppercase font-bold tracking-widest pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell>
                      </TableRow>
                    ) : filteredExpenses.map((expense) => (
                      <TableRow key={expense.id} className="hover:bg-primary/5 transition-colors border-b border-muted/30">
                        <TableCell className="pl-6">
                          <button 
                            onClick={() => handleToggleStatus(expense.id, expense.status)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-colors ${
                              expense.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100'
                            }`}
                          >
                            {expense.status.toUpperCase()}
                          </button>
                        </TableCell>
                        <TableCell className="text-xs font-medium">{format(new Date(expense.date), 'MMM dd')}</TableCell>
                        <TableCell>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-sm truncate max-w-[180px]">{expense.description}</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Badge variant="secondary" className="bg-primary/5 text-primary text-[8px] py-0 h-4 border-none font-bold uppercase">
                                {expense.category}
                              </Badge>
                              {expense.subCategory && expense.subCategory !== 'Others' && (
                                <span className="text-[8px] text-muted-foreground uppercase font-medium">/ {expense.subCategory}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-sm text-foreground">
                          {currency.symbol}{formatAmount(expense.amount)}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-primary/10" onClick={() => setEditingExpense(expense)}>
                              <Edit2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-destructive/10 group"><Trash2 className="w-4 h-4 text-muted-foreground group-hover:text-destructive" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-2xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Record?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently remove this expense from your vault.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(expense.id)} className="bg-destructive rounded-xl shadow-lg shadow-destructive/20">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredExpenses.length === 0 && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic text-sm">
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
          <DialogContent className="sm:max-w-[450px] rounded-3xl p-8 border-none shadow-2xl">
            <DialogHeader><DialogTitle className="font-headline text-2xl font-bold text-primary">Edit Transaction</DialogTitle></DialogHeader>
            <form onSubmit={handleSaveEdit} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Amount ({currency.symbol})</Label>
                <Input type="number" className="h-12 text-lg font-bold rounded-xl bg-muted/30 border-none shadow-inner" value={editingExpense.amount} onChange={(e) => setEditingExpense({...editingExpense, amount: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Description</Label>
                <Input className="h-12 rounded-xl bg-muted/30 border-none shadow-inner" value={editingExpense.description} onChange={(e) => setEditingExpense({...editingExpense, description: e.target.value})} required />
              </div>
              <Button type="submit" className="w-full h-14 font-bold rounded-xl shadow-lg">Save Changes</Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
