
"use client";

import { useState, useRef, useMemo } from "react";
import { useFynWealthStore, Frequency, SYSTEM_CATEGORIES } from "@/lib/store";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Camera, 
  Mic, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  Repeat, 
  Upload, 
  StopCircle,
  Tag,
  PlusCircle
} from "lucide-react";
import { scanBillExpenseCapture } from "@/ai/flows/scan-bill-expense-capture";
import { voiceExpenseCapture } from "@/ai/flows/voice-expense-capture-flow";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function ExpenseCapture() {
  const { currency } = useFynWealthStore();
  const { user } = useUser();
  const db = useFirestore();
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [manual, setManual] = useState({
    amount: '',
    description: '',
    category: 'Miscellaneous',
    subCategory: 'Others',
    date: format(new Date(), 'yyyy-MM-dd'),
    isRecurring: false,
    frequency: 'Monthly' as Frequency,
  });

  // Fetch custom categories from Firestore
  const categoriesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return collection(db, 'users', user.uid, 'categories');
  }, [db, user?.uid]);

  const { data: customCategories } = useCollection(categoriesQuery);

  const allCategoriesList = useMemo(() => {
    const system = Object.keys(SYSTEM_CATEGORIES);
    const custom = (customCategories || []).map(c => c.name);
    return [...new Set([...system, ...custom])];
  }, [customCategories]);

  const subCategories = useMemo(() => {
    const subs = SYSTEM_CATEGORIES[manual.category as keyof typeof SYSTEM_CATEGORIES] || ["Others"];
    return subs;
  }, [manual.category]);

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
        subCategory: manual.subCategory,
        date: manual.date,
        status: manual.date <= todayStr ? 'paid' : 'unpaid',
        isRecurring: manual.isRecurring,
        frequency: manual.isRecurring ? manual.frequency : 'One-time',
        billImageData: null,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'users', user.uid, 'expenses'), payload);

      setManual({ 
        amount: '', 
        description: '', 
        category: 'Miscellaneous', 
        subCategory: 'Others',
        date: format(new Date(), 'yyyy-MM-dd'),
        isRecurring: false,
        frequency: 'Monthly',
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      toast({ title: "Success", description: "Expense added successfully." });
    } catch (err) {
      toast({ variant: "destructive", title: "Sync Failed", description: "Check your connection." });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomCategory = async () => {
    if (!newCategoryName.trim() || !db || !user?.uid) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'categories'), {
        name: newCategoryName.trim(),
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setManual(prev => ({ ...prev, category: newCategoryName.trim(), subCategory: 'Others' }));
      setNewCategoryName("");
      setIsCategoryDialogOpen(false);
      toast({ title: "Category Added", description: `"${newCategoryName}" is now available.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save category." });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await processVoice(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast({ variant: "destructive", title: "Microphone Denied", description: "Please enable mic access." });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processVoice = async (blob: Blob) => {
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const result = await voiceExpenseCapture({ audioDataUri: base64String });
        
        if (result && user?.uid) {
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          await addDoc(collection(db, 'users', user.uid, 'expenses'), {
            userId: user.uid,
            amount: result.amount,
            description: result.description || 'Voice Captured Expense',
            category: result.category,
            subCategory: 'Others',
            date: result.date || todayStr,
            status: (result.date || todayStr) <= todayStr ? 'paid' : 'unpaid',
            createdAt: serverTimestamp()
          });
          
          setSuccess(true);
          setTimeout(() => setSuccess(false), 2000);
          toast({ title: "Voice Processed", description: `Added ${currency.symbol}${result.amount} for ${result.category}.` });
        }
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      toast({ variant: "destructive", title: "Processing Error", description: "AI failed to transcribe." });
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
            subCategory: 'Others',
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
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="manual" className="text-[10px] md:text-xs font-bold uppercase">Manual</TabsTrigger>
            <TabsTrigger value="voice" className="text-[10px] md:text-xs font-bold uppercase">Voice</TabsTrigger>
            <TabsTrigger value="scan" className="text-[10px] md:text-xs font-bold uppercase">Scan</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <form onSubmit={handleManualSubmit} className="space-y-5">
              {/* Row 1: Amount and Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">{currency.symbol}</span>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={manual.amount} 
                      onChange={(e) => setManual({...manual, amount: e.target.value})} 
                      required 
                      className="pl-8 h-11 rounded-xl font-bold shadow-sm" 
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Date</Label>
                  <Input 
                    type="date" 
                    value={manual.date} 
                    onChange={(e) => setManual({...manual, date: e.target.value})} 
                    className="h-11 rounded-xl shadow-sm" 
                  />
                </div>
              </div>

              {/* Row 2: Category and Subcategory */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Category</Label>
                  <Select value={manual.category} onValueChange={(v) => {
                    if (v === 'ADD_NEW') {
                      setIsCategoryDialogOpen(true);
                    } else {
                      setManual({...manual, category: v, subCategory: SYSTEM_CATEGORIES[v as keyof typeof SYSTEM_CATEGORIES]?.[0] || 'Others'});
                    }
                  }}>
                    <SelectTrigger className="h-11 rounded-xl font-bold shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {allCategoriesList.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                      <SelectSeparator />
                      <SelectItem value="ADD_NEW" className="text-primary font-bold">
                        <div className="flex items-center gap-2">
                          <PlusCircle className="w-4 h-4" />
                          Add New Category
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Subcategory</Label>
                  <Select value={manual.subCategory} onValueChange={(v) => setManual({...manual, subCategory: v})}>
                    <SelectTrigger className="h-11 rounded-xl font-medium shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px]">
                      {subCategories.map(sub => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Description</Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="e.g. Starbucks Latte" 
                    value={manual.description} 
                    onChange={(e) => setManual({...manual, description: e.target.value})} 
                    className="pl-10 h-11 rounded-xl shadow-sm" 
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-muted/50">
                <div className="flex items-center gap-3">
                  <Repeat className="w-4 h-4 text-primary" />
                  <div>
                    <Label className="text-xs font-bold block">Monthly Recurring</Label>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">Auto-adds next month</p>
                  </div>
                </div>
                <Switch checked={manual.isRecurring} onCheckedChange={(checked) => setManual({...manual, isRecurring: checked})} />
              </div>

              <Button type="submit" disabled={loading} className="w-full h-12 font-bold rounded-xl shadow-lg">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Expense
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="voice">
            <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-muted rounded-2xl bg-muted/10">
              <div className={`p-6 rounded-full mb-4 transition-all duration-500 ${isRecording ? 'bg-destructive/20 animate-pulse scale-110' : 'bg-primary/10'}`}>
                {isRecording ? <StopCircle className="w-12 h-12 text-destructive" /> : <Mic className="w-12 h-12 text-primary" />}
              </div>
              <h3 className="font-bold text-sm mb-1">{isRecording ? "Listening..." : "Voice Capture"}</h3>
              <p className="text-xs text-muted-foreground px-6 mb-6 leading-relaxed">
                {isRecording 
                  ? "Describe your expense now..." 
                  : "Say: \"Spent 50 dollars on groceries today.\""}
              </p>
              
              {!isRecording ? (
                <Button onClick={startRecording} disabled={loading} className="h-12 px-8 font-bold rounded-xl shadow-md bg-primary">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                  Start Recording
                </Button>
              ) : (
                <Button onClick={stopRecording} variant="destructive" className="h-12 px-8 font-bold rounded-xl shadow-md">
                  Stop & Process
                </Button>
              )}
            </div>
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

      {/* New Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[400px] p-8 rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl font-headline font-bold text-primary">Add Category</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">New Category Name</label>
              <Input 
                placeholder="e.g. Pet Care" 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="h-12 rounded-xl text-sm font-bold shadow-sm"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-14 font-bold rounded-xl shadow-lg" onClick={handleAddCustomCategory}>Create Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
