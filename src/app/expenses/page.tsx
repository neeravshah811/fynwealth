
"use client";

import { useFynWealthStore, SYSTEM_CATEGORIES } from "@/lib/store";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, deleteDoc, updateDoc, query, orderBy, where } from "firebase/firestore";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Download, Edit2, Trash2, X, ShieldCheck, Upload, Repeat, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { ExpenseCapture } from "@/components/expenses/ExpenseCapture";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

export default function ExpensesPage() {
  const { currency, viewMonth, viewYear } = useFynWealthStore();
  const { user } = useUser();
  const db = useFirestore();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingExpense, setEditingExpense] = useState<any | null>(null);

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
                             e.category.toLowerCase().includes(searchTerm.toLowerCase());
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
      toast({ title: "Updated", description: "Cloud record synchronized." });
    }
  };

  const handleDelete = async (id: string) => {
    if (!db || !user?.uid) return;
    await deleteDoc(doc(db, 'users', user.uid, 'expenses', id));
    toast({ title: "Deleted", description: "Record removed from cloud." });
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
                <CardTitle className="text-base md:text-lg font-headline font-bold">Cloud Transaction History</CardTitle>
                
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
                        <SelectItem value="all">All</SelectItem>
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
                      <SelectContent>
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
                      <TableHead className="text-[10px] uppercase font-bold tracking-widest">Status</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold tracking-widest">Date</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold tracking-widest">Description</TableHead>
                      <TableHead className="text-right text-[10px] uppercase font-bold tracking-widest">Amount</TableHead>
                      <TableHead className="text-right text-[10px] uppercase font-bold tracking-widest">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell>
                      </TableRow>
                    ) : filteredExpenses.map((expense) => (
                      <TableRow key={expense.id} className="hover:bg-primary/5 transition-colors">
                        <TableCell>
                          <button 
                            onClick={() => handleToggleStatus(expense.id, expense.status)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border ${
                              expense.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}
                          >
                            {expense.status.toUpperCase()}
                          </button>
                        </TableCell>
                        <TableCell className="text-xs font-medium">{format(new Date(expense.date), 'MMM dd')}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm truncate max-w-[150px]">{expense.description}</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">{expense.category}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-sm">
                          {currency.symbol}{formatAmount(expense.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setEditingExpense(expense)}>
                              <Edit2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Record?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently remove the record from your cloud profile.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(expense.id)} className="bg-destructive">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {editingExpense && (
        <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
          <DialogContent className="sm:max-w-[450px] rounded-2xl">
            <DialogHeader><DialogTitle className="font-headline text-2xl font-bold">Edit Transaction</DialogTitle></DialogHeader>
            <form onSubmit={handleSaveEdit} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Amount</Label>
                <Input type="number" className="h-12 text-lg font-bold rounded-xl" value={editingExpense.amount} onChange={(e) => setEditingExpense({...editingExpense, amount: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Description</Label>
                <Input className="h-12 rounded-xl" value={editingExpense.description} onChange={(e) => setEditingExpense({...editingExpense, description: e.target.value})} required />
              </div>
              <Button type="submit" className="w-full h-14 font-bold rounded-xl shadow-lg">Save Changes</Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
