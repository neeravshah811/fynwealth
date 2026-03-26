
"use client";

import { useState, useRef, useMemo } from "react";
import { useFirestore, useUser } from "@/firebase";
import { collection, serverTimestamp, doc, increment, getDoc } from "firebase/firestore";
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
  RotateCcw
} from "lucide-react";
import { processBankStatement } from "@/ai/flows/bank-statement-import-flow";
import { toast } from "@/hooks/use-toast";
import { useFynWealthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { addDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

const CATEGORIES = [
  'Education / Kids',
  'Essentials',
  'Financial Commitments',
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid || !db) return;

    setLoading(true);

    try {
      // 1. Check Usage Quota
      const month = format(new Date(), 'yyyy-MM');
      const usageId = `${user.uid}_${month}`;
      const usageRef = doc(db, 'ai_usage', usageId);
      const usageDoc = await getDoc(usageRef);
      
      const hybridCount = usageDoc.exists() ? (usageDoc.data().hybridStatementCount || 0) : 0;
      if (hybridCount >= 5) {
        toast({ 
          variant: "destructive", 
          title: "Monthly Limit Reached", 
          description: "You have reached the limit of 5 statement imports per month." 
        });
        setLoading(false);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const content = reader.result as string;
          const result = await processBankStatement({
            userId: user.uid,
            fileDataUri: content,
            fileName: file.name
          });

          if (result && result.transactions && result.transactions.length > 0) {
            // 2. Track Usage Increment
            setDocumentNonBlocking(usageRef, {
              userId: user.uid,
              month,
              hybridStatementCount: increment(1),
              lastUpdated: serverTimestamp()
            }, { merge: true });

            // 3. Store Intelligence Results
            if (result.insights || result.anomalies) {
              addDocumentNonBlocking(collection(db, 'statement_results'), {
                userId: user.uid,
                uploadId: `up_${Date.now()}`,
                insights: result.insights || [],
                anomalies: result.anomalies || [],
                processedAt: serverTimestamp()
              });
            }

            setTransactions(result.transactions);
            setReviewMode(true);
            toast({ title: "Analysis Complete", description: `Found ${result.transactions.length} debit transactions.` });
          } else {
            toast({ variant: "destructive", title: "No Data", description: "No debit transactions found." });
          }
        } catch (err: any) {
          console.error("Import Error:", err);
          let message = err.message || "Could not process statement.";
          if (String(err).includes("429") || String(err).includes("quota")) {
            message = "AI service quota reached. Please wait a moment and try again.";
          }
          toast({ variant: "destructive", title: "Import Failed", description: message });
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Quota Check Error:", err);
      toast({ variant: "destructive", title: "Error", description: "Could not verify your usage quota." });
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
    setTransactions(prev => prev.map(t => t.status === 'pending' ? { ...t, status: 'approved' } : t));
  };

  const handleBulkReject = () => {
    setTransactions(prev => prev.map(t => ({ ...t, status: 'rejected' })));
  };

  const handleConfirmImport = async () => {
    if (!user?.uid || !db) return;
    const approvedTxns = transactions.filter(t => t.status === 'approved');
    if (approvedTxns.length === 0) {
      toast({ variant: "destructive", title: "Nothing Approved", description: "Please approve some transactions first." });
      return;
    }

    setLoading(true);
    try {
      // Record expenses using centralized non-blocking helper
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
      
      // Update global count
      updateDocumentNonBlocking(doc(db, 'users', user.uid), {
        'stats.totalExpenses': increment(approvedTxns.length)
      });

      toast({ title: "Vault Synced", description: `${approvedTxns.length} transactions recorded.` });
      setIsOpen(false);
      reset();
    } catch (err) {
      toast({ variant: "destructive", title: "Save Error", description: "Could not save transactions." });
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
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl rounded-[24px]">
          <DialogHeader className="p-8 bg-primary/5 border-b border-muted/50">
            <DialogTitle className="text-2xl font-headline font-bold text-primary flex items-center gap-3">
              <FileText className="w-6 h-6" />
              Statement Audit
            </DialogTitle>
            <DialogDescription className="text-sm font-medium mt-1">
              Deterministic parsing + AI intelligence layer. Review before saving.
            </DialogDescription>
          </DialogHeader>

          {!reviewMode ? (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className={cn("p-10 rounded-full transition-all duration-500", loading ? 'bg-primary/10 animate-pulse' : 'bg-muted/30')}>
                {loading ? <Loader2 className="w-16 h-16 text-primary animate-spin" /> : <FileUp className="w-16 h-16 text-muted-foreground opacity-40" />}
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-lg">{loading ? "Analyzing Statement..." : "Select Statement File"}</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  Deterministic parsing ensures accuracy while AI categorizes and detects anomalies.
                </p>
              </div>
              
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.csv,.xlsx,.txt" onChange={handleFileChange} />
              <Button onClick={() => fileInputRef.current?.click()} disabled={loading} className="h-14 px-10 rounded-xl font-bold text-base shadow-lg shadow-primary/20">
                {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />}
                {loading ? "Verifying Quota..." : "Choose File"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col h-[65vh]">
              <div className="bg-muted/30 px-8 py-4 flex items-center justify-between border-b">
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Transactions</p>
                    <p className="text-lg font-bold text-primary">{summary.totalTransactions}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Expense</p>
                    <p className="text-lg font-bold text-foreground">{currency.symbol}{summary.totalExpense.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={handleBulkReject} className="h-8 text-[10px] font-bold uppercase border-destructive/20 text-destructive hover:bg-destructive/5 rounded-lg">
                    Clear List
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleBulkApprove} className="h-8 text-[10px] font-bold uppercase border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-lg">
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
                        t.status === 'approved' ? "bg-emerald-50/30 border-emerald-100" : "bg-card border-muted"
                      )}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-3 mb-1.5">
                              <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap bg-muted/50 px-2 py-0.5 rounded uppercase">{t.date}</span>
                              <h4 className="font-bold text-sm truncate pr-4 text-foreground">{t.description}</h4>
                            </div>
                            <div className="flex items-center gap-3">
                              <Select value={t.category} onValueChange={(v) => updateCategory(t.id, v)}>
                                <SelectTrigger className="h-7 w-44 text-[10px] font-bold uppercase bg-background border-muted rounded-lg px-2">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl max-h-[300px]">
                                  {CATEGORIES.map(cat => (
                                    <SelectItem key={cat} value={cat} className="text-[10px] font-bold uppercase">{cat}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {t.confidence < 0.8 && (
                                <Badge variant="secondary" className="bg-amber-50 text-amber-600 text-[8px] h-4 uppercase font-bold border-amber-100">AI Review</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="font-bold text-sm text-foreground">
                              {currency.symbol}{t.amount.toLocaleString()}
                            </span>
                            <div className="flex items-center gap-1">
                              {t.status === 'approved' ? (
                                <Button size="icon" variant="ghost" onClick={() => updateStatus(t.id, 'pending')} className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-100">
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button size="icon" variant="ghost" onClick={() => updateStatus(t.id, 'approved')} className="h-8 w-8 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50">
                                  <ThumbsUp className="w-4 h-4" />
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" onClick={() => updateStatus(t.id, 'rejected')} className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5">
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {transactions.filter(t => t.status !== 'rejected').length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                        <RotateCcw className="w-8 h-8 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest italic">All cleared</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
              
              <DialogFooter className="p-6 bg-muted/20 border-t flex items-center gap-4">
                <Button variant="ghost" onClick={reset} className="font-bold rounded-xl h-12 flex-1">Cancel</Button>
                <Button 
                  onClick={handleConfirmImport} 
                  disabled={loading || summary.totalTransactions === 0} 
                  className="font-bold rounded-xl h-12 flex-[2] shadow-lg shadow-primary/20"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
                  Save to Vault
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
