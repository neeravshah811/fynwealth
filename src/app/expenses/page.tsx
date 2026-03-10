
"use client";

import { useFynWealthStore, Expense, SYSTEM_CATEGORIES } from "@/lib/store";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Download, Edit2, Trash2, X, ShieldCheck, Upload, Repeat } from "lucide-react";
import { useState, useMemo, useRef } from "react";
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
  const { expenses, currency, budgets, updateExpense, deleteExpense, toggleExpenseStatus, customCategories, addExpenses, updateBudget } = useFynWealthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const allCategories = { ...SYSTEM_CATEGORIES, ...customCategories };
  const categoriesList = Object.keys(allCategories);

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(e => {
        const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (e.subCategory || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || e.status === statusFilter;
        const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
        return matchesSearch && matchesStatus && matchesCategory;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, searchTerm, statusFilter, categoryFilter]);

  const handleEditClick = (expense: Expense) => {
    setEditingExpense(expense);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingExpense) {
      updateExpense(editingExpense.id, {
        ...editingExpense,
        amount: Math.abs(editingExpense.amount)
      });
      setEditingExpense(null);
    }
  };

  const handleDelete = (id: string) => {
    deleteExpense(id);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCategoryFilter("all");
  };

  const formatAmount = (amount: number) => {
    return Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const exportToCSV = () => {
    if (filteredExpenses.length === 0) return;
    const headers = ["Date", "Description", "Category", "Sub-Category", "Amount", "Currency", "Status", "Budget Limit"];
    const csvRows = [
      headers.join(","),
      ...filteredExpenses.map(e => {
        const budget = budgets.find(b => b.category === e.category);
        return [
          e.date,
          `"${e.description.replace(/"/g, '""')}"`,
          e.category,
          e.subCategory || "",
          Math.abs(e.amount),
          currency.code,
          e.status,
          budget ? budget.limit : "0"
        ].join(",");
      })
    ];
    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `fynwealth-expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.click();
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) return;

      const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const importedData: any[] = [];
      const importedBudgets: Record<string, number> = {};

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const parts: string[] = [];
        let currentPart = "";
        let inQuotes = false;

        for (let charIdx = 0; charIdx < line.length; charIdx++) {
          const char = line[charIdx];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            parts.push(currentPart.trim().replace(/^"|"$/g, ''));
            currentPart = "";
          } else {
            currentPart += char;
          }
        }
        parts.push(currentPart.trim().replace(/^"|"$/g, ''));

        const getVal = (name: string, index: number) => {
          const colIndex = headers.indexOf(name);
          return parts[colIndex !== -1 ? colIndex : index];
        };

        const dateStr = getVal('date', 0);
        const description = getVal('description', 1);
        const category = getVal('category', 2);
        const subCategory = getVal('sub-category', 3) || getVal('subcategory', 3);
        const amountStr = getVal('amount', 4);
        const statusStr = getVal('status', 6);
        const budgetLimitStr = getVal('budget limit', 7) || getVal('budget_limit', 7);

        if (description && amountStr) {
          const cleanAmount = Math.abs(parseFloat(amountStr.replace(/[^0-9.-]+/g, "")));
          if (!isNaN(cleanAmount)) {
            importedData.push({
              date: dateStr || new Date().toISOString().split('T')[0],
              description: description,
              category: category || "Miscellaneous",
              subCategory: subCategory || "",
              amount: cleanAmount,
              status: (statusStr?.toLowerCase() === 'unpaid') ? 'unpaid' : 'paid'
            });

            if (category && budgetLimitStr) {
              const limit = parseFloat(budgetLimitStr);
              if (!isNaN(limit)) {
                importedBudgets[category] = limit;
              }
            }
          }
        }
      }

      if (importedData.length > 0) {
        addExpenses(importedData);
        Object.entries(importedBudgets).forEach(([cat, lim]) => {
          updateBudget(cat, lim);
        });
        toast({ title: "Data Imported", description: `Successfully imported ${importedData.length} transactions.` });
      }

      if (importInputRef.current) importInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all" || categoryFilter !== "all";

  return (
    <div className="space-y-12 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline mb-2 text-primary">Expenses</h1>
          <p className="text-sm text-muted-foreground">Track and manage every cent you spend.</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            ref={importInputRef} 
            onChange={handleImportCSV} 
            accept=".csv" 
            className="hidden" 
          />
          <Button 
            variant="outline" 
            className="h-11 px-5 rounded-xl text-sm" 
            onClick={() => importInputRef.current?.click()}
          >
            <Upload className="w-5 h-5 mr-2" />
            Import
          </Button>
          <Button 
            variant="outline" 
            className="h-11 px-5 rounded-xl text-sm" 
            onClick={exportToCSV}
          >
            <Download className="w-5 h-5 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1">
          <ExpenseCapture />
        </div>
        
        <div className="lg:col-span-2 space-y-10">
          <Card className="border-none shadow-sm overflow-hidden ring-1 ring-primary/5">
            <CardHeader className="pb-6 bg-muted/20">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-headline">Transaction History</CardTitle>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="text-sm h-9 text-muted-foreground">
                      <X className="w-4 h-4 mr-2" />
                      Clear Filters
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-5 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input 
                      placeholder="Search description..." 
                      className="pl-10 h-11 bg-background border-muted text-sm rounded-xl"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-11 bg-background border-muted text-sm rounded-xl">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-4">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-11 bg-background border-muted text-sm rounded-xl">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Categories</SelectItem>
                        {categoriesList.map(cat => (
                          <SelectItem key={cat} value={cat} className="text-sm">{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10 border-none">
                    <TableHead className="w-[120px] text-xs uppercase font-bold text-muted-foreground">Status</TableHead>
                    <TableHead className="w-[140px] text-xs uppercase font-bold text-muted-foreground">Date</TableHead>
                    <TableHead className="text-xs uppercase font-bold text-muted-foreground">Description</TableHead>
                    <TableHead className="text-xs uppercase font-bold text-muted-foreground">Category</TableHead>
                    <TableHead className="text-right text-xs uppercase font-bold text-muted-foreground">Amount</TableHead>
                    <TableHead className="text-right w-[120px] text-xs uppercase font-bold text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id} className="hover:bg-primary/5 transition-colors border-muted/50">
                      <TableCell>
                        <button 
                          onClick={() => toggleExpenseStatus(expense.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            expense.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100'
                          }`}
                        >
                          {expense.status.toUpperCase()}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {format(new Date(expense.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold truncate max-w-[200px] text-foreground">{expense.description}</span>
                          <div className="flex flex-wrap gap-2">
                            {expense.category === 'Warranties' && (
                              <Badge variant="outline" className="flex items-center gap-1 text-primary border-primary/20 text-[10px] h-5 px-1.5 font-bold uppercase">
                                <ShieldCheck className="w-3 h-3" /> WARRANTY
                              </Badge>
                            )}
                            {expense.isRecurring && (
                              <Badge variant="outline" className="flex items-center gap-1 text-accent border-accent/20 text-[10px] h-5 px-1.5 font-bold uppercase">
                                <Repeat className="w-3 h-3" /> RECURRING
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary" className="bg-primary/5 text-primary text-[11px] py-0.5 px-2 w-fit">
                            {expense.category}
                          </Badge>
                          {expense.subCategory && (
                            <span className="text-xs text-muted-foreground italic ml-1">{expense.subCategory}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-base text-foreground">
                        {currency.symbol}{formatAmount(expense.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="w-9 h-9" onClick={() => handleEditClick(expense)}>
                            <Edit2 className="w-5 h-5 text-muted-foreground" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="w-9 h-9 text-destructive hover:bg-destructive/10">
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this expense? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="h-11 rounded-xl text-sm">Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDelete(expense.id)}
                                  className="h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-sm"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-24 text-muted-foreground text-sm">
                        No transactions match your criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {editingExpense && (
        <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
          <DialogContent className="sm:max-w-[450px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-headline text-xl">Edit Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveEdit} className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Amount ({currency.symbol})</Label>
                  <Input 
                    type="number" 
                    className="h-11 text-sm font-bold rounded-xl" 
                    value={Math.abs(editingExpense.amount)} 
                    onChange={(e) => setEditingExpense({...editingExpense, amount: Math.abs(parseFloat(e.target.value)) || 0})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Category</Label>
                  <Select value={editingExpense.category} onValueChange={(v) => setEditingExpense({...editingExpense, category: v})}>
                    <SelectTrigger className="h-11 text-sm rounded-xl text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[300px] rounded-xl">{categoriesList.map(cat => <SelectItem key={cat} value={cat} className="text-sm">{cat}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Date</Label>
                  <Input 
                    type="date" 
                    className="h-11 text-sm rounded-xl text-sm" 
                    value={editingExpense.date} 
                    onChange={(e) => setEditingExpense({...editingExpense, date: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Sub-Category</Label>
                  <Input 
                    className="h-11 text-sm rounded-xl text-sm" 
                    value={editingExpense.subCategory || ""} 
                    onChange={(e) => setEditingExpense({...editingExpense, subCategory: e.target.value})} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Description</Label>
                <Input className="h-11 text-sm rounded-xl text-sm" value={editingExpense.description} onChange={(e) => setEditingExpense({...editingExpense, description: e.target.value})} required />
              </div>
              
              <div className="flex items-center justify-between p-5 bg-muted/30 rounded-xl border border-muted">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-full bg-primary/10">
                    <Repeat className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Label className="text-sm font-bold cursor-pointer" htmlFor="edit-recurring">Monthly Recurring</Label>
                    <p className="text-xs text-muted-foreground">Persist for future months</p>
                  </div>
                </div>
                <Switch 
                  id="edit-recurring"
                  checked={editingExpense.isRecurring || false}
                  onCheckedChange={(checked) => setEditingExpense({...editingExpense, isRecurring: checked, frequency: checked ? 'Monthly' : undefined})}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="submit" className="w-full h-12 text-sm font-bold rounded-xl" onClick={() => setEditingExpense(null)}>Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
