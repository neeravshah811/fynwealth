
"use client";

import { useState, useRef } from "react";
import { useFirestore, useUser } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from "firebase/firestore";
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
import { 
  FileUp, 
  Loader2, 
  CheckCircle2, 
  Trash2, 
  FileText,
  Plus,
  AlertCircle
} from "lucide-react";
import { processBankStatement, type BankStatementOutput } from "@/ai/flows/bank-statement-import-flow";
import { toast } from "@/hooks/use-toast";
import { useFynWealthStore } from "@/lib/store";

export function BankStatementImport() {
  const { currency } = useFynWealthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const db = useFirestore();
  const { user } = useUser();

  const handleResult = (result: BankStatementOutput) => {
    setTransactions(result.transactions);
    setSummary(result.summary);
    setReviewMode(true);
    toast({ 
      title: "Statement Analyzed", 
      description: `Found ${result.summary.totalTransactions} expenses totaling ${currency.symbol}${result.summary.totalExpense.toLocaleString()}.` 
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isCsv = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv') || file.type === 'text/plain';
    
    if (!isPdf && !isCsv) {
      toast({ 
        variant: "destructive", 
        title: "Unsupported Format", 
        description: "Please upload a PDF or CSV statement." 
      });
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      try {
        const content = reader.result as string;
        
        if (!content || content.length < 50) {
          throw new Error("The selected file appears to be empty or invalid.");
        }

        const result = await processBankStatement({
          fileDataUri: isCsv ? undefined : content,
          rawText: isCsv ? content : undefined
        });

        if (result && result.transactions && result.transactions.length > 0) {
          handleResult(result);
        } else {
          throw new Error("No debit transactions detected. AI ignored credits and deposits.");
        }
      } catch (err: any) {
        console.error("Statement Parse Error:", err);
        let message = "Could not read this statement. Please try a cleaner CSV export.";
        
        // Handle Quota/Rate Limit Errors (429)
        const errString = String(err).toLowerCase();
        if (errString.includes("429") || errString.includes("quota") || errString.includes("too many requests")) {
          message = "High demand on AI engine. Please wait 10-15 seconds and try uploading again.";
        }

        toast({ variant: "destructive", title: "Import Failed", description: message });
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    if (isCsv) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmImport = async () => {
    if (!db || !user?.uid || transactions.length === 0) return;

    setLoading(true);
    try {
      const promises = transactions.map(t => {
        return addDoc(collection(db, 'users', user.uid, 'expenses'), {
          userId: user.uid,
          amount: Math.abs(t.amount),
          date: t.date,
          categoryName: t.category,
          category: t.category,
          description: t.description,
          note: t.description,
          status: 'paid',
          confidence: t.confidence,
          createdAt: serverTimestamp()
        });
      });

      await Promise.all(promises);
      
      await updateDoc(doc(db, 'users', user.uid), {
        'stats.totalExpenses': increment(transactions.length)
      });

      toast({ title: "Import Complete", description: "All debit records saved to vault." });
      setIsOpen(false);
      reset();
    } catch (err) {
      toast({ variant: "destructive", title: "Sync Failed", description: "Failed to save records." });
    } finally {
      setLoading(false);
    }
  };

  const removeTransaction = (index: number) => {
    const removed = transactions[index];
    setTransactions(prev => prev.filter((_, i) => i !== index));
    if (summary) {
      setSummary({
        totalTransactions: summary.totalTransactions - 1,
        totalExpense: summary.totalExpense - removed.amount
      });
    }
  };

  const reset = () => {
    setReviewMode(false);
    setTransactions([]);
    setSummary(null);
    setLoading(false);
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
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-[24px]">
          <DialogHeader className="p-8 bg-primary/5 border-b border-muted/50">
            <DialogTitle className="text-2xl font-headline font-bold text-primary flex items-center gap-3">
              <FileText className="w-6 h-6" />
              Debit Processing
            </DialogTitle>
            <DialogDescription className="text-sm font-medium mt-1">
              Extract debit transactions with mandatory smart categorization.
            </DialogDescription>
          </DialogHeader>

          {!reviewMode ? (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className={`p-10 rounded-full transition-all duration-500 ${loading ? 'bg-primary/10 animate-pulse' : 'bg-muted/30'}`}>
                {loading ? <Loader2 className="w-16 h-16 text-primary animate-spin" /> : <FileUp className="w-16 h-16 text-muted-foreground opacity-40" />}
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-lg">{loading ? "AI Data Engine Working..." : "Select Statement"}</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  Upload PDF or CSV. AI will filter ONLY debits and map them to standard categories.
                </p>
              </div>
              
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.csv,.txt" onChange={handleFileChange} />
              <Button onClick={() => fileInputRef.current?.click()} disabled={loading} className="h-14 px-10 rounded-xl font-bold text-base shadow-lg shadow-primary/20 transition-all active:scale-95">
                {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />}
                {loading ? "Processing..." : "Choose File"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col h-[60vh]">
              <div className="bg-muted/30 px-8 py-4 flex items-center justify-between border-b">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Transactions</p>
                    <p className="text-lg font-bold text-primary">{summary?.totalTransactions}</p>
                  </div>
                  <div className="w-px h-8 bg-muted-foreground/20" />
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Debit</p>
                    <p className="text-lg font-bold text-foreground">{currency.symbol}{summary?.totalExpense.toLocaleString()}</p>
                  </div>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-none uppercase font-bold text-[9px]">Reviewing Debits</Badge>
              </div>

              <div className="flex-1 overflow-hidden p-6">
                <ScrollArea className="h-full pr-4 border rounded-2xl bg-muted/5">
                  <div className="p-4 space-y-3">
                    {transactions.map((t, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-card border rounded-xl shadow-sm group hover:ring-1 hover:ring-primary/20 transition-all">
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">{t.date}</span>
                            <h4 className="font-bold text-sm truncate pr-4">{t.description}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] h-5 px-2 font-bold uppercase border-primary/20 text-primary bg-primary/5">
                              {t.category}
                            </Badge>
                            {t.confidence < 0.7 && <Badge variant="secondary" className="bg-rose-50 text-rose-600 text-[8px] h-4">Check Date/Amt</Badge>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-sm text-foreground whitespace-nowrap">
                            {currency.symbol}{Math.abs(t.amount).toLocaleString()}
                          </span>
                          <button onClick={() => removeTransaction(i)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <DialogFooter className="p-6 bg-muted/20 border-t flex items-center gap-4">
                <Button variant="ghost" onClick={reset} className="font-bold rounded-xl h-12 flex-1">Cancel</Button>
                <Button onClick={handleConfirmImport} disabled={loading || transactions.length === 0} className="font-bold rounded-xl h-12 flex-[2] shadow-lg shadow-primary/20">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Save All Debits
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
