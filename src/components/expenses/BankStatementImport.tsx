
"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useFirestore, useUser } from "@/firebase";
import { collection, serverTimestamp, doc, increment } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  AlertCircle
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
    // Support YYYY-MM-DD, DD/MM/YYYY, DD-MMM-YY etc
    const dateRegex = /(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4})|(\d{1,2}[-/][A-Za-z]{3}[-/]\d{2,4})/;
    return dateRegex.test(s);
  };

  const cleanAmount = (val: any): number => {
    if (val === null || val === undefined) return 0;
    let s = String(val).trim().toUpperCase();
    
    // Handle accounting negative (500.00)
    if (s.startsWith('(') && s.endsWith(')')) {
      s = '-' + s.slice(1, -1);
    }
    
    // Handle thousand separators and localized commas
    // If it has a comma and it looks like a thousand separator (e.g. 1,000.00)
    s = s.replace(/[^0-9.,-]/g, '');
    if (!s) return 0;

    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    
    // Simple heuristic for European format (1.000,00) vs US format (1,000.00)
    if (lastComma > lastDot) {
      // If comma is the decimal separator
      if (s.length - lastComma === 3) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        s = s.replace(/,/g, '');
      }
    } else {
      // Comma is thousand separator
      s = s.replace(/,/g, '');
    }
    
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
  };

  const extractTransactionsFromRows = (rows: any[][]): any[] => {
    const debitKeys = ['debit', 'withdrawal', 'withdrawals', 'dr', 'payment', 'paid out', 'amount out', 'spent', 'expense'];
    const creditKeys = ['credit', 'deposit', 'deposits', 'cr', 'amount in', 'income', 'interest', 'refund', 'salary', 'cashback', 'credit limit'];
    const balanceKeys = ['balance', 'bal', 'closing balance', 'available'];
    const descKeys = ['desc', 'narration', 'particulars', 'details', 'remarks', 'description', 'transaction'];
    const dateKeys = ['date', 'dt', 'time', 'transaction date', 'value date'];
    const amtKeys = ['amount', 'amt', 'value'];

    const negativeKeywords = ['salary', 'interest credit', 'refund', 'cashback', 'reversal', 'income', 'deposit', 'received'];

    let headerIdx = -1;
    let dateIdx = -1, descIdx = -1, debitIdx = -1, creditIdx = -1, amountIdx = -1, balanceIdx = -1;

    // Scan for header row
    for(let i = 0; i < Math.min(rows.length, 50); i++) {
      const row = rows[i].map(c => String(c || "").toLowerCase());
      const hasDate = row.some(c => dateKeys.some(k => c === k || c.includes(k)));
      const hasAmt = row.some(c => amtKeys.some(k => c === k || c.includes(k)));

      if (hasDate && hasAmt) {
        headerIdx = i;
        dateIdx = row.findIndex(c => dateKeys.some(k => c === k || c.includes(k)));
        descIdx = row.findIndex(c => descKeys.some(k => c === k || c.includes(k)));
        debitIdx = row.findIndex(c => debitKeys.some(k => c === k || c.includes(k)));
        creditIdx = row.findIndex(c => creditKeys.some(k => c === k || c.includes(k)));
        amountIdx = row.findIndex(c => amtKeys.some(k => c === k || c.includes(k)));
        balanceIdx = row.findIndex(c => balanceKeys.some(k => c === k || c.includes(k)));
        break;
      }
    }

    const results: any[] = [];

    // Brute force data extraction if no header found or starting from Row 0 to be inclusive
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 1) continue;

      let foundDate = "";
      let foundDesc = "";
      let foundAmount = 0;
      let isDebit = false;

      // 1. Look for Date
      const dateColIdx = row.findIndex(c => isDateLike(String(c)));
      if (dateColIdx === -1) {
        // Multi-line description support
        if (results.length > 0 && row.some(c => String(c).length > 10)) {
          const extraText = row.filter(c => String(c).trim().length > 3).join(' ');
          results[results.length - 1].description += ' ' + extraText;
        }
        continue;
      }

      foundDate = String(row[dateColIdx]);

      // 2. Identify Amount & Type
      if (headerIdx !== -1 && i > headerIdx) {
        // Mapping based on header
        if (descIdx !== -1 && row[descIdx]) {
          foundDesc = String(row[descIdx]);
        } else {
          foundDesc = row.filter((c, idx) => idx !== dateColIdx && idx !== balanceIdx && String(c).length > 5 && isNaN(cleanAmount(c))).sort((a,b) => b.length - a.length)[0] || "Transaction";
        }

        if (debitIdx !== -1 && row[debitIdx] && cleanAmount(row[debitIdx]) !== 0) {
          foundAmount = cleanAmount(row[debitIdx]);
          isDebit = true;
        } else if (creditIdx !== -1 && row[creditIdx] && cleanAmount(row[creditIdx]) !== 0) {
          // Explicit credit column value
          isDebit = false;
        } else if (amountIdx !== -1) {
          const rawAmt = cleanAmount(row[amountIdx]);
          foundAmount = Math.abs(rawAmt);
          isDebit = rawAmt < 0 || (!row[creditIdx] && rawAmt !== 0);
        }
      } else {
        // Brute force guess
        const amountCandidates = row.map((c, idx) => ({ val: cleanAmount(c), idx })).filter(o => o.val !== 0 && o.idx !== dateColIdx && o.idx !== balanceIdx);
        if (amountCandidates.length > 0) {
          const bestAmount = amountCandidates[0];
          foundAmount = Math.abs(bestAmount.val);
          foundDesc = row.filter((c, idx) => idx !== dateColIdx && idx !== bestAmount.idx && String(c).trim().length > 3).join(' ') || "Entry";
          isDebit = bestAmount.val < 0 || row.join(' ').toLowerCase().includes('dr');
        }
      }

      // 3. Strict Keyword Filtering for Income
      const lowerDesc = foundDesc.toLowerCase();
      const hasIncomeKeyword = negativeKeywords.some(k => lowerDesc.includes(k));

      if (foundDate && foundAmount > 0 && isDebit && !hasIncomeKeyword) {
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

  const parsePdfManual = async (file: File): Promise<any[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
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

    setLoading(true);

    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let parsedData: any[] = [];

      if (extension === 'pdf') {
        parsedData = await parsePdfManual(file);
      } else if (extension === 'xlsx' || extension === 'xls') {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        parsedData = extractTransactionsFromRows(json as any[][]);
      } else {
        const text = await file.text();
        const rows = text.split(/\r?\n/).map(line => {
          // Smart CSV split handling quoted commas
          const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
          return matches ? matches.map(m => m.replace(/^"|"$/g, '').trim()) : [];
        });
        parsedData = extractTransactionsFromRows(rows);
      }
      
      if (!parsedData || parsedData.length === 0) {
        throw new Error("No readable transactions found. Ensure file contains Date and Amount.");
      }

      const result = await processBankStatementManual({
        userId: user.uid,
        transactions: parsedData
      });

      if (result && result.transactions && result.transactions.length > 0) {
        setTransactions(result.transactions);
        setReviewMode(true);
        toast({ title: "Audit Complete", description: `Extracted ${result.transactions.length} potential expenses.` });
      } else {
        toast({ variant: "destructive", title: "No Expenses Found", description: "No debit transactions identified." });
      }
    } catch (err: any) {
      console.error("Import Error:", err);
      toast({ 
        variant: "destructive", 
        title: "Import Failed", 
        description: err.message || "Failed to parse statement." 
      });
    } finally {
      setLoading(false);
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

  const handleBulkReject = () => {
    setTransactions(prev => prev.map(t => ({ ...t, status: 'rejected' })));
  };

  const handleConfirmImport = async () => {
    if (!user?.uid || !db) return;
    if (approvedTxns.length === 0) {
      toast({ variant: "destructive", title: "Nothing Approved", description: "Please approve entries to continue." });
      return;
    }

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
      
      updateDocumentNonBlocking(doc(db, 'users', user.uid), {
        'stats.totalExpenses': increment(approvedTxns.length)
      });

      toast({ title: "Vault Synced", description: `Recorded ${approvedTxns.length} expenses.` });
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

      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) reset();
        setIsOpen(open);
      }}>
        <DialogContent className="sm:max-w-[750px] p-0 overflow-hidden border-none shadow-2xl rounded-[24px]">
          <DialogHeader className="p-8 bg-primary/5 border-b border-muted/50">
            <DialogTitle className="text-2xl font-headline font-bold text-primary flex items-center gap-3">
              <FileText className="w-6 h-6" />
              Statement Review
            </DialogTitle>
            <DialogDescription className="text-sm font-medium mt-1">
              Deterministic parsing for PDF, Excel, and CSV statements.
            </DialogDescription>
          </DialogHeader>

          {!reviewMode ? (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className={cn("p-10 rounded-full transition-all duration-500", loading ? 'bg-primary/10 animate-pulse' : 'bg-muted/30')}>
                {loading ? <Loader2 className="w-16 h-16 text-primary animate-spin" /> : <FileUp className="w-16 h-16 text-muted-foreground opacity-40" />}
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-lg">{loading ? "Scanning Document..." : "Select File"}</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  Upload your bank export. We'll identify debit entries and capture full narrations.
                </p>
              </div>
              
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx,.xls,.txt,.pdf" onChange={handleFileChange} />
              <Button onClick={() => fileInputRef.current?.click()} disabled={loading} className="h-14 px-10 rounded-xl font-bold text-base shadow-lg">
                {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />}
                {loading ? "Processing..." : "Select Statement"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col h-[70vh]">
              <div className="bg-muted/30 px-8 py-4 flex items-center justify-between border-b">
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Entries</p>
                    <p className="text-lg font-bold text-primary">{summary.totalTransactions}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Volume</p>
                    <p className="text-lg font-bold text-foreground">{currency.symbol}{summary.totalExpense.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={handleBulkReject} className="h-8 text-[10px] font-bold uppercase border-destructive/20 text-destructive hover:bg-destructive/5">
                    Reject All
                  </Button>
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
                              <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap bg-muted/50 px-2 py-0.5 rounded uppercase">{t.date}</span>
                              <Badge variant="secondary" className="bg-primary/5 text-primary text-[9px] py-0.5 px-2 h-auto border-none font-bold uppercase">
                                {t.category}
                              </Badge>
                            </div>
                            
                            <p className="font-bold text-sm text-foreground leading-relaxed break-words">
                              {t.description}
                            </p>

                            <Select value={t.category} onValueChange={(v) => updateCategory(t.id, v)}>
                              <SelectTrigger className="h-8 w-48 text-[10px] font-bold uppercase bg-background border-muted rounded-lg px-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl max-h-[300px]">
                                {CATEGORIES.map(cat => (
                                  <SelectItem key={cat} value={cat} className="text-[10px] font-bold uppercase">{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex flex-col items-end gap-4 shrink-0">
                            <span className="font-bold text-base text-foreground">
                              {currency.symbol}{t.amount.toLocaleString()}
                            </span>
                            <div className="flex items-center gap-2">
                              {t.status === 'approved' ? (
                                <Button size="sm" variant="ghost" onClick={() => updateStatus(t.id, 'pending')} className="h-9 px-3 rounded-lg text-emerald-600 bg-emerald-50 hover:bg-emerald-100 font-bold text-[10px] uppercase">
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Approved
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => updateStatus(t.id, 'approved')} className="h-9 px-3 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 font-bold text-[10px] uppercase">
                                  <ThumbsUp className="w-4 h-4 mr-2" />
                                  Approve
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" onClick={() => updateStatus(t.id, 'rejected')} className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5">
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {transactions.filter(t => t.status !== 'rejected').length === 0 && (
                      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
                        <RotateCcw className="w-10 h-10 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest italic">All entries reviewed</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
              
              <DialogFooter className="p-6 bg-muted/20 border-t flex items-center gap-4">
                <Button variant="ghost" onClick={reset} className="font-bold rounded-xl h-12 flex-1">Cancel</Button>
                <Button 
                  onClick={handleConfirmImport} 
                  disabled={loading || approvedTxns.length === 0} 
                  className="font-bold rounded-xl h-12 flex-[2] shadow-lg"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
                  Save {approvedTxns.length} Approved Expenses
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
