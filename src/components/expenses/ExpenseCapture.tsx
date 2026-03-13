
"use client";

import { useState, useRef } from "react";
import { useFynWealthStore, Frequency, SYSTEM_CATEGORIES } from "@/lib/store";
import { useFirestore, useUser } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Mic, Plus, Loader2, CheckCircle2, Repeat, ShieldCheck, Upload, X } from "lucide-react";
import { scanBillExpenseCapture } from "@/ai/flows/scan-bill-expense-capture";
import { voiceExpenseCapture } from "@/ai/flows/voice-expense-capture-flow";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const FREQUENCIES: Frequency[] = ['One-time', 'Weekly', 'Monthly', 'Quarterly', 'Half-yearly', 'Annually'];

export function ExpenseCapture() {
  const { currency } = useFynWealthStore();
  const { user } = useUser();
  const db = useFirestore();
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [manualDoc, setManualDoc] = useState<{ data: string; type: string; name: string } | null>(null);

  const [manual, setManual] = useState({
    amount: '',
    description: '',
    category: 'Miscellaneous',
    date: format(new Date(), 'yyyy-MM-dd'),
    isRecurring: false,
    frequency: 'Monthly' as Frequency,
  });

  const categoriesList = Object.keys(SYSTEM_CATEGORIES);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manual.amount || !db || !user?.uid) return;
    
    setLoading(true);
    try {
      const amount = Math.abs(parseFloat(manual.amount));
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      
      const payload = {
        userId: user.uid,
        amount,
        description: manual.description.trim() || `${manual.category} Expense`,
        category: manual.category,
        date: manual.date,
        status: manual.date <= todayStr ? 'paid' : 'unpaid',
        isRecurring: manual.isRecurring,
        frequency: manual.isRecurring ? manual.frequency : 'One-time',
        billImageData: manualDoc?.data || null,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'users', user.uid, 'expenses'), payload);

      setManual({ 
        amount: '', 
        description: '', 
        category: 'Miscellaneous', 
        date: format(new Date(), 'yyyy-MM-dd'),
        isRecurring: false,
        frequency: 'Monthly',
      });
      setManualDoc(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      toast({ title: "Success", description: "Expense synced to cloud." });
    } catch (err) {
      toast({ variant: "destructive", title: "Sync Failed", description: "Check your connection." });
    } finally {
      setLoading(false);
    }
  };

  const processImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !db || !user?.uid) return;
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const result = await scanBillExpenseCapture({ billImage: base64String });
        
        if (result.totalAmount) {
          const amount = Math.abs(result.totalAmount);
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          const date = result.transactionDate || todayStr;

          await addDoc(collection(db, 'users', user.uid, 'expenses'), {
            userId: user.uid,
            amount,
            description: result.merchantName || 'Scanned Receipt',
            category: result.categorySuggestion || 'Miscellaneous',
            date,
            status: date <= todayStr ? 'paid' : 'unpaid',
            billImageData: base64String,
            createdAt: serverTimestamp()
          });
          
          setSuccess(true);
          setTimeout(() => setSuccess(false), 2000);
          toast({ title: "Bill Scanned", description: "Receipt captured and saved." });
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast({ variant: "destructive", title: "Scan Error", description: "AI failed to read bill." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-none bg-card overflow-hidden ring-1 ring-primary/5">
      <CardHeader className="bg-primary/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-headline text-primary">Capture Expense</CardTitle>
          {success && <CheckCircle2 className="text-emerald-500 w-8 h-8 animate-in zoom-in" />}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="manual" className="text-xs font-bold uppercase">Manual</TabsTrigger>
            <TabsTrigger value="scan" className="text-xs font-bold uppercase">Scan</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Amount</Label>
                  <Input type="number" placeholder="0.00" value={manual.amount} onChange={(e) => setManual({...manual, amount: e.target.value})} required className="h-11 rounded-xl font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Date</Label>
                  <Input type="date" value={manual.date} onChange={(e) => setManual({...manual, date: e.target.value})} className="h-11 rounded-xl" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Category</Label>
                <Select value={manual.category} onValueChange={(v) => setManual({...manual, category: v})}>
                  <SelectTrigger className="h-11 rounded-xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesList.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Description</Label>
                <Input placeholder="e.g. Weekly Coffee" value={manual.description} onChange={(e) => setManual({...manual, description: e.target.value})} className="h-11 rounded-xl" />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-muted">
                <div className="flex items-center gap-3">
                  <Repeat className="w-4 h-4 text-primary" />
                  <Label className="text-xs font-bold">Monthly Recurring</Label>
                </div>
                <Switch checked={manual.isRecurring} onCheckedChange={(checked) => setManual({...manual, isRecurring: checked})} />
              </div>

              <Button type="submit" disabled={loading} className="w-full h-12 font-bold rounded-xl shadow-lg">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Sync to Cloud
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="scan">
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-muted rounded-2xl bg-muted/10">
              <Camera className="w-10 h-10 text-primary mb-4 opacity-40" />
              <p className="text-xs text-muted-foreground mb-6">Extract amount & merchant automatically.</p>
              <input type="file" className="hidden" id="scan-upload" accept="image/*" onChange={processImage} />
              <Button asChild className="h-12 px-8 font-bold rounded-xl shadow-md" disabled={loading}>
                <label htmlFor="scan-upload">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload Receipt
                </label>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
