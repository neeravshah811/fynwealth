
"use client";

import { useFynWealthStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Files, 
  Calendar, 
  Search, 
  ExternalLink, 
  Image as ImageIcon,
  Download,
  Trash2,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DocumentsPage() {
  const { expenses, currency, deleteExpense } = useFynWealthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  const documentExpenses = useMemo(() => {
    return expenses
      .filter(e => e.billImageData || e.invoiceUrl)
      .filter(e => 
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
        e.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, searchTerm]);

  const formatAmount = (amount: number) => {
    return Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline mb-2 text-primary">Documents</h1>
          <p className="text-sm text-muted-foreground">All your scanned bills and invoices, stored automatically.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search documents..." 
            className="pl-9 h-11 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {documentExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-muted/10 rounded-3xl border-2 border-dashed border-muted">
          <Files className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
          <p className="text-sm font-medium text-muted-foreground">No documents found. Scan a bill in the Expenses tab to add one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {documentExpenses.map((expense) => (
            <Card key={expense.id} className="border-none shadow-sm ring-1 ring-primary/5 group hover:ring-primary/20 transition-all overflow-hidden bg-card flex flex-col">
              <div 
                className="aspect-[3/4] bg-muted/30 relative cursor-pointer overflow-hidden"
                onClick={() => setSelectedDoc(expense.billImageData || null)}
              >
                {expense.billImageData ? (
                  <img 
                    src={expense.billImageData} 
                    alt={expense.description} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                    <ImageIcon className="w-10 h-10" />
                    <span className="text-[10px] uppercase font-bold">Image Unavailable</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Button variant="secondary" size="sm" className="rounded-full">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Large
                  </Button>
                </div>
              </div>
              <CardContent className="p-4 space-y-3 flex-1">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm truncate leading-tight" title={expense.description}>{expense.description}</h4>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">
                      {expense.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-primary">{currency.symbol}{formatAmount(expense.amount)}</div>
                    <div className="text-[9px] font-bold text-muted-foreground flex items-center justify-end gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(expense.date), 'MMM dd')}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 h-8 text-[10px] font-bold rounded-lg border-primary/20 text-primary"
                    onClick={() => {
                      if (expense.billImageData) {
                        const link = document.createElement('a');
                        link.href = expense.billImageData;
                        link.download = `bill-${expense.description.replace(/\s+/g, '-').toLowerCase()}-${expense.date}.png`;
                        link.click();
                      }
                    }}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteExpense(expense.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
        <DialogContent className="max-w-3xl h-[85vh] p-0 overflow-hidden bg-black flex items-center justify-center rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <img 
              src={selectedDoc} 
              alt="Document Preview" 
              className="max-w-full max-h-full object-contain"
            />
          )}
          <button 
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors"
            onClick={() => setSelectedDoc(null)}
          >
            <ExternalLink className="w-5 h-5 rotate-45" />
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
