
"use client";

import { useState, useRef, useMemo } from "react";
import { useFirestore, useUser } from "@/firebase";
import { collection, serverTimestamp, doc, increment, query, where, getDocs } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileUp, 
  Loader2, 
  CheckCircle2, 
  FileText,
  Plus,
  X,
  ThumbsUp,
  RotateCcw,
  Lock,
  Unlock,
  Filter
} from "lucide-react";
import { processBankStatementManual } from "@/ai/flows/bank-statement-import-flow";
import { toast } from "@/hooks/use-toast";
import { useFynWealthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import * as XLSX from 'xlsx';
import * as pdfjs from 'pdfjs-dist';

if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

const CATEGORIES = [
  'Education / Kids',
  'Essentials',
  'Financial Commit',
  'Food and Groceries',
  'Health & Personal',
  'Household & Family',
  'Investments',
  'Life & Entertainment',
  'Warranties',
  'Transportation',
  'Subscriptions',
  'Shopping',
  'Personal',
  'Miscellaneous'
];

export function BankStatementImport() {
  const { currency } = useFynWealthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [reviewMode, setReviewMode] = useState(false);
  
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [pdfPassword, setPdfPassword] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [passwordError, setPasswordError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const db = useFirestore();
  const { user } = useUser();

  const summary = useMemo(() => {
    const active = transactions.filter(t => t.status !== 'rejected');
    return {
      totalTransactions: active.length,
      totalExpense: active.reduce((sum, t) => sum + t.amount, 0),
      pendingCount: active.filter(t => t.status === 'pending').length
    };
  }, [transactions]);

  const approvedTxns = useMemo(() => transactions.filter(t => t.status === 'approved'), [transactions]);

  const isDateLike = (str: string): boolean => {
    const s = String(str).trim();
    const dateRegex = /(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4})|(\d{1,2}[-/][A-Za-z]{3}[-/]\d{2,4})/;
    return dateRegex.test(s);
  };

  const normalizeDate = (dateStr: string): string => {
    const s = dateStr.trim();
    const parts = s.split(/[-/.]/);
    
    if (parts.length === 3) {
      let day, month, year;
      if (parts[0].length === 4) {
        year = parts[0];
        month = parts[1];
        day = parts[2];
      } else {
        day = parts[0];
        month = parts[1];
        year = parts[2];
      }
      const d = day.padStart(2, '0').substring(0, 2);
      const m = month.padStart(2, '0').substring(0, 2);
      let y = year;
      if (y.length === 2) y = '20' + y;
      return `${y}-${m}-${d}`;
    }
    return s;
  };

  const cleanAmount = (val: any): number => {
    if (val === null || val === undefined) return 0;
    let s = String(val).trim().toUpperCase();
    if (s.startsWith('(') && s.endsWith(')')) s = '-' + s.slice(1, -1);
    s = s.replace(/[^0-9.,-]/g, '');
    if (!s) return 0;
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > lastDot) {
      if (s.length - lastComma === 3) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else {
      s = s.replace(/,/g, '');
    }
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
  };

  const extractTransactionsFromRows = (rows: any[][]): any[] => {
    const dateKeys = ['date', 'dt', 'time', 'transaction date', 'value date'];
    const amtKeys = ['amount', 'amt', 'value'];
    const incomeKeywords = ['salary', 'interest credit', 'refund', 'cashback', 'reversal', 'income', 'deposit', 'received', 'credit', 'funds received', 'transfer from', 'cr'];

    let headerIdx = -1;
    let dateIdx = -1, descIdx = -1, debitIdx = -1, creditIdx = -1, amountIdx = -1, balanceIdx = -1;

    for(let i = 0; i < Math.min(rows.length, 100); i++) {
      const row = rows[i].map(c => String(c || "").toLowerCase());
      const hasDate = row.some(c => dateKeys.some(k => c === k || c.includes(k)));
      const hasAmt = row.some(c => amtKeys.some(k => c === k || c.includes(k)));
      if (hasDate && hasAmt) {
        headerIdx = i;
        dateIdx = row.findIndex(c => dateKeys.some(k => c === k || c.includes(k)));
        descIdx = row.findIndex(c => String(c).includes('desc') || String(c).includes('narration') || String(c).includes('particulars'));
        debitIdx = row.findIndex(c => String(c).includes('debit') || String(c).includes('withdrawal') || String(c).includes('dr'));
        creditIdx = row.findIndex(c => String(c).includes('credit') || String(c).includes('deposit') || String(c).includes('cr'));
        amountIdx = row.findIndex(c => amtKeys.some(k => c === k || c.includes(k)));
        balanceIdx = row.findIndex(c => String(c).includes('balance') || String(c).includes('bal'));
        break;
      }
    }

    const results: any[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 1 || i <= headerIdx) continue;

      const dateColIdx = row.findIndex(c => isDateLike(String(c)));
      if (dateColIdx === -1) continue;

      const foundDate = normalizeDate(String(row[dateColIdx]));
      let foundDesc = "";
      let foundAmount = 0;
      let isDebit = false;

      const rowString = row.join(' ').toLowerCase();
      const isExplicitCredit = rowString.includes('cr') || rowString.includes('credit') || rowString.includes('deposit');

      if (headerIdx !== -1) {
        if (descIdx !== -1 && row[descIdx]) foundDesc = String(row[descIdx]);
        else foundDesc = row.filter((c, idx) => idx !== dateColIdx && idx !== balanceIdx && String(c).length > 5 && isNaN(cleanAmount(c))).sort((a,b) => b.length - a.length)[0] || "Transaction";

        if (debitIdx !== -1 && row[debitIdx] && cleanAmount(row[debitIdx]) !== 0) {
          foundAmount = cleanAmount(row[debitIdx]);
          isDebit = true;
        } else if (creditIdx !== -1 && row[creditIdx] && cleanAmount(row[creditIdx]) !== 0) {
          isDebit = false;
        } else if (amountIdx !== -1) {
          const rawAmt = cleanAmount(row[amountIdx]);
          foundAmount = Math.abs(rawAmt);
          isDebit = rawAmt < 0 || (!isExplicitCredit && rawAmt !== 0);
        }
      }

      const hasIncomeKeyword = incomeKeywords.some(k => foundDesc.toLowerCase().includes(k));
      if (foundDate && foundAmount > 0 && isDebit && !hasIncomeKeyword && !isExplicitCredit) {
        results.push({
          date: foundDate,
          description: foundDesc.trim(),
          amount: Math.abs(foundAmount),
          type: 'debit'
        });
      }
    }
    return results;
  };

  const parsePdfManual = async (file: File, password?: string): Promise<any[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer, password });
    let pdf;
    try {
      pdf = await loadingTask.promise;
    } catch (err: any) {
      if (err.name === 'PasswordException') throw new Error('PASSWORD_REQUIRED');
      throw err;
    }
    let allTextRows: string[][] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const items = textContent.items as any[];
      const rows: Record<number, any[]> = {};
      items.forEach(item => {
        const y = Math.round(item.transform[5]);
        if (!rows[y]) rows[y] = [];
        rows[y].push(item);
      });
      const sortedY = Object.keys(rows).map(Number).sort((a, b) => b - a);
      sortedY.forEach(y => {
        const sortedRowItems = rows[y].sort((a, b) => a.transform[4] - b.transform[4]);
        allTextRows.push(sortedRowItems.map(item => item.str.trim()));
      });
    }
    return extractTransactionsFromRows(allTextRows);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid || !db) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'xlsx', 'xls'].includes(extension || '')) {
      toast({ variant: "destructive", title: "Invalid Format", description: "Only PDF and Excel formats are supported." });
      return;
    }
    setLoading(true);
    setPasswordError(false);
    try {
      let parsedData: any[] = [];
      if (extension === 'pdf') {
        try {
          parsedData = await parsePdfManual(file);
        } catch (err: any) {
          if (err.message === 'PASSWORD_REQUIRED') {
            setPendingFile(file);
            setIsPasswordDialogOpen(true);
            setLoading(false);
            return;
          }
          throw err;
        }
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
        parsedData = extractTransactionsFromRows(json as any[][]);
      }
      await handleParsedData(parsedData);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Import Failed", description: err.message || "Failed to parse statement." });
    } finally {
      setLoading(false);
    }
  };

  const handleParsedData = async (parsedData: any[]) => {
    if (!parsedData || parsedData.length === 0) {
      toast({ variant: "destructive", title: "No Transactions", description: "No readable debit entries found." });
      return;
    }

    // Deduplication Logic
    const dates = parsedData.map(t => t.date).sort();
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];

    const existingExpensesRef = collection(db, 'users', user!.uid, 'expenses');
    const q = query(existingExpensesRef, where('date', '>=', minDate), where('date', '<=', maxDate));
    const snapshot = await getDocs(q);
    const existingFingerprints = new Set(snapshot.docs.map(doc => {
      const d = doc.data();
      return `${d.date}_${Number(d.amount).toFixed(2)}_${(d.description || d.note || "").toLowerCase().trim()}`;
    }));

    const uniqueParsed = parsedData.filter(t => {
      const fingerprint = `${t.date}_${Number(t.amount).toFixed(2)}_${t.description.toLowerCase().trim()}`;
      return !existingFingerprints.has(fingerprint);
    });

    if (uniqueParsed.length === 0) {
      toast({ title: "Up to Date", description: "All transactions in this statement are already in your vault." });
      reset();
      return;
    }

    const result = await processBankStatementManual({ userId: user!.uid, transactions: uniqueParsed });
    if (result && result.transactions && result.transactions.length > 0) {
      setTransactions(result.transactions);
      setReviewMode(true);
      toast({ title: "Scanning Complete", description: `Found ${result.transactions.length} new entries.` });
    }
  };

  const updateStatus = (id: string, status: 'approved' | 'rejected' | 'pending') => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const updateCategory = (id: string, category: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, category } : t));
  };

  const handleBulkApprove = () => {
    setTransactions(prev => prev.map(t => (t.status === 'pending' || t.status === 'rejected') ? { ...t, status: 'approved' } : t));
  };

  const handleConfirmImport = async () => {
    if (!user?.uid || !db) return;
    if (approvedTxns.length === 0) return;
    setLoading(true);
    try {
      approvedTxns.forEach(t => {
        addDocumentNonBlocking(collection(db, 'users', user.uid, 'expenses'), {
          userId: user.uid,
          amount: t.amount,
          date: t.date,
          categoryName: t.category,
          category: t.category,
          description: t.description,
          note: t.description,
          status: 'paid',
          createdAt: serverTimestamp()
        });
      });
      updateDocumentNonBlocking(doc(db, 'users', user.uid), { 'stats.totalExpenses': increment(approvedTxns.length) });
      toast({ title: "Vault Synced", description: `Recorded ${approvedTxns.length} new expenses.` });
      setIsOpen(false);
      reset();
    } catch (err) {
      toast({ variant: "destructive", title: "Save Error", description: "Could not write to cloud storage." });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setReviewMode(false);
    setTransactions([]);
    setLoading(false);
    setIsPasswordDialogOpen(false);
    setPdfPassword("");
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsOpen(true)}
        className="h-9 rounded-xl border-primary/20 text-primary font-bold hover:bg-primary/5 shadow-sm"
      >
        <FileUp className="w-4 h-4 mr-2" />
        Import Statement
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) reset(); setIsOpen(open); }}>
        <DialogContent className="sm:max-w-[750px] p-0 overflow-hidden border-none shadow-2xl rounded-[24px]">
          <DialogHeader className="p-8 bg-primary/5 border-b border-muted/50">
            <DialogTitle className="text-2xl font-headline font-bold text-primary flex items-center gap-3">
              <FileText className="w-6 h-6" />
              Statement Import
            </DialogTitle>
            <DialogDescription className="text-sm font-medium mt-1">
              Upload PDF or Excel statements. We'll automatically filter out duplicates.
            </DialogDescription>
          </DialogHeader>

          {!reviewMode ? (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className={cn("p-10 rounded-full transition-all duration-500", loading ? 'bg-primary/10 animate-pulse' : 'bg-muted/30')}>
                {loading ? <Loader2 className="w-16 h-16 text-primary animate-spin" /> : <FileUp className="w-16 h-16 text-muted-foreground opacity-40" />}
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-lg">{loading ? "Analyzing Data..." : "Choose File"}</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  Support for PDF, XLSX, and XLS formats. Existing records are skipped automatically.
                </p>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.pdf" onChange={handleFileChange} />
              <Button onClick={() => fileInputRef.current?.click()} disabled={loading} className="h-14 px-10 rounded-xl font-bold text-base shadow-lg">
                {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />}
                {loading ? "Processing..." : "Select File"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col h-[70vh]">
              <div className="bg-muted/30 px-8 py-4 flex items-center justify-between border-b">
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">New Entries</p>
                    <p className="text-lg font-bold text-primary">{summary.totalTransactions}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">New Volume</p>
                    <p className="text-lg font-bold text-foreground">{currency.symbol}{summary.totalExpense.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={handleBulkApprove} className="h-8 text-[10px] font-bold uppercase border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                    Approve All
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden p-6">
                <ScrollArea className="h-full pr-4 border rounded-2xl bg-muted/5">
                  <div className="p-4 space-y-3">
                    {transactions.filter(t => t.status !== 'rejected').map((t) => (
                      <div key={t.id} className={cn(
                        "flex flex-col gap-4 p-4 rounded-xl border transition-all",
                        t.status === 'approved' ? "bg-emerald-50/30 border-emerald-100 shadow-sm" : "bg-card border-muted"
                      )}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex flex-col min-w-0 flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded uppercase">{t.date}</span>
                              <Badge variant="secondary" className="bg-primary/5 text-primary text-[9px] py-0.5 px-2 h-auto border-none font-bold uppercase">
                                {t.category}
                              </Badge>
                            </div>
                            <p className="font-bold text-sm text-foreground leading-relaxed break-words">{t.description}</p>
                            <Select value={t.category} onValueChange={(v) => updateCategory(t.id, v)}>
                              <SelectTrigger className="h-8 w-48 text-[10px] font-bold uppercase bg-background border-muted rounded-lg px-2"><SelectValue /></SelectTrigger>
                              <SelectContent className="rounded-xl max-h-[300px]">
                                {CATEGORIES.map(cat => <SelectItem key={cat} value={cat} className="text-[10px] font-bold uppercase">{cat}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col items-end gap-4 shrink-0">
                            <span className="font-bold text-base text-foreground">{currency.symbol}{t.amount.toLocaleString()}</span>
                            <div className="flex items-center gap-2">
                              {t.status === 'approved' ? (
                                <Button size="sm" variant="ghost" onClick={() => updateStatus(t.id, 'pending')} className="h-9 px-3 rounded-lg text-emerald-600 bg-emerald-50 font-bold text-[10px] uppercase"><CheckCircle2 className="w-4 h-4 mr-2" />Approved</Button>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => updateStatus(t.id, 'approved')} className="h-9 px-3 rounded-lg text-muted-foreground hover:text-emerald-600 font-bold text-[10px] uppercase"><ThumbsUp className="w-4 h-4 mr-2" />Approve</Button>
                              )}
                              <Button size="icon" variant="ghost" onClick={() => updateStatus(t.id, 'rejected')} className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5"><X className="w-4 h-4" /></Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <DialogFooter className="p-6 bg-muted/20 border-t flex items-center gap-4">
                <Button variant="ghost" onClick={reset} className="font-bold rounded-xl h-12 flex-1">Cancel</Button>
                <Button onClick={handleConfirmImport} disabled={loading || approvedTxns.length === 0} className="font-bold rounded-xl h-12 flex-[2] shadow-lg">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
                  Save {approvedTxns.length} New Expenses
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isPasswordDialogOpen} onOpenChange={(open) => !open && setIsPasswordDialogOpen(false)}>
        <DialogContent className="sm:max-w-[400px] p-8 rounded-[24px] border-none shadow-2xl">
          <DialogHeader className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner border border-amber-100"><Lock className="w-8 h-8" /></div>
            <DialogTitle className="text-2xl font-headline font-bold">Protected PDF</DialogTitle>
            <DialogDescription className="text-sm font-medium">Enter the password to unlock this statement.</DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-2">
            <Label htmlFor="pdf-password" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Password</Label>
            <Input id="pdf-password" type="password" placeholder="••••••••" value={pdfPassword} onChange={(e) => setPdfPassword(e.target.value)} className={cn("h-12 rounded-xl bg-muted/30 border-none shadow-inner px-4 font-bold transition-all focus:ring-2", passwordError ? "ring-2 ring-destructive" : "focus:ring-primary")} autoFocus />
          </div>
          <DialogFooter><Button className="w-full h-14 font-bold rounded-xl shadow-lg" onClick={() => { setPasswordError(false); handleFileChange({ target: { files: [pendingFile!] } } as any); }} disabled={loading || !pdfPassword}>{loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Unlock className="w-5 h-5 mr-2" />}Unlock & Process</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
