"use client";

import { useState, useRef } from "react";
import { useFirestore, useUser } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
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
  AlertCircle,
  FileText,
  X,
  Plus
} from "lucide-react";
import { processBankStatement, type BankStatementOutput } from "@/ai/flows/bank-statement-import-flow";
import { SYSTEM_CATEGORIES } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function BankStatementImport() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [reviewMode, setReviewMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const db = useFirestore();
  const { user } = useUser();

  const handleResult = (result: BankStatementOutput) => {
    // Filter for debits only as per requirements
    const expensesOnly = result.transactions.filter(t => t.type === 'debit');
    setTransactions(expensesOnly);
    setReviewMode(true);
    toast({ 
      title: "Statement Parsed", 
      description: `Found ${expensesOnly.length} expenses to review.` 
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    // Validate file type
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isCsv = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv') || file.type === 'text/plain';
    
    if (!isPdf && !isCsv) {
      toast({ 
        variant: "destructive", 
        title: "Unsupported Format", 
        description: "Please upload a PDF or CSV statement. Excel files should be exported to CSV first." 
      });
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      try {
        const content = reader.result as string;
        
        // Ensure content is not empty
        if (!content || content.length < 50) {
          throw new Error("The selected file appears to be empty or invalid.");
        }

        const result = await processBankStatement({
          fileDataUri: isCsv ? undefined : content,
          rawText: isCsv ? content : undefined,
          categories: Object.keys(SYSTEM_CATEGORIES)
        });

        if (result && result.transactions && result.transactions.length > 0) {
          handleResult(result);
        } else {
          throw new Error("No transactions were detected in this statement. Please ensure it contains expense records.");
        }
      } catch (err: any) {
        console.error("Statement Parse Error:", err);
        toast({ 
          variant: "destructive", 
          title: "Import Failed", 
          description: err.message || "The AI could not read this statement format. Try a different export type." 
        });
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
          createdAt: serverTimestamp()
        });
      });

      await Promise.all(promises);
      
      toast({ title: "Import Successful", description: `${transactions.length} expenses synced to your vault.` });
      setIsOpen(false);
      setReviewMode(false);
      setTransactions([]);
    } catch (err) {
      toast({ variant: "destructive", title: "Sync Failed", description: "Could not save imported expenses." });
    } finally {
      setLoading(false);
    }
  };

  const removeTransaction = (index: number) => {
    setTransactions(prev => prev.filter((_, i) => i !== index));
  };

  const reset = () => {
    setReviewMode(false);
    setTransactions([]);
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
              Statement Import
            </DialogTitle>
            <DialogDescription className="text-sm font-medium mt-1">
              Upload PDF or CSV statements to bulk-record transactions.
            </DialogDescription>
          </DialogHeader>

          {!reviewMode ? (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className={`p-10 rounded-full transition-all duration-500 ${loading ? 'bg-primary/10 animate-pulse' : 'bg-muted/30'}`}>
                {loading ? <Loader2 className="w-16 h-16 text-primary animate-spin" /> : <FileUp className="w-16 h-16 text-muted-foreground opacity-40" />}
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-lg">{loading ? "AI is Analyzing..." : "Select File"}</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  Upload your bank statement (PDF or CSV). We'll extract only the debits/expenses for you.
                </p>
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept=".pdf,.csv,.txt" 
                onChange={handleFileChange} 
              />
              
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={loading}
                className="h-14 px-10 rounded-xl font-bold text-base shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />}
                {loading ? "Parsing Statement" : "Choose Statement"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col h-[60vh]">
              <div className="flex-1 overflow-hidden p-6">
                <div className="flex items-center justify-between mb-4 px-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Detected Expenses ({transactions.length})</span>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-none font-bold text-[9px] uppercase">Review & Import</Badge>
                </div>
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
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-sm text-foreground whitespace-nowrap">
                            ${Math.abs(t.amount).toLocaleString()}
                          </span>
                          <button 
                            onClick={() => removeTransaction(i)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {transactions.length === 0 && (
                      <div className="py-20 text-center text-muted-foreground italic text-sm">
                        No expenses found or all removed.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
              <DialogFooter className="p-6 bg-muted/20 border-t flex items-center gap-4">
                <Button variant="ghost" onClick={reset} className="font-bold rounded-xl h-12 flex-1">Cancel</Button>
                <Button 
                  onClick={handleConfirmImport} 
                  disabled={loading || transactions.length === 0}
                  className="font-bold rounded-xl h-12 flex-[2] shadow-lg shadow-primary/20"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Confirm Import
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
