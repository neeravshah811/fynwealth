
"use client";

import { useState, useRef } from "react";
import { useFynWealthStore, Frequency, SYSTEM_CATEGORIES } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Mic, Plus, Loader2, CheckCircle2, Repeat, ShieldCheck, PlusCircle, Upload, Image as ImageIcon, FileText, X } from "lucide-react";
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

const FREQUENCIES: Frequency[] = ['One-time', 'Weekly', 'Monthly', 'Quarterly', 'Half-yearly', 'Annually'];

export function ExpenseCapture() {
  const { addExpense, currency, customCategories, addCustomCategory, addCustomSubCategory } = useFynWealthStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  const [newCustomCategory, setNewCustomCategory] = useState("");
  const [newCustomSubCategory, setNewCustomSubCategory] = useState("");
  const [customParent, setCustomParent] = useState("");
  
  const [isRecurringGlobal, setIsRecurringGlobal] = useState(false);
  const [manualDoc, setManualDoc] = useState<{ data: string; type: string; name: string } | null>(null);

  const [manual, setManual] = useState({
    amount: '',
    description: '',
    category: 'Miscellaneous',
    subCategory: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    isRecurring: false,
    frequency: 'Monthly' as Frequency,
    reminderDate: format(new Date(), 'yyyy-MM-dd'),
    reminderTime: '09:00',
    productName: '',
    purchaseDate: '',
    warrantyExpiryDate: '',
    serviceCenterContact: '',
    notes: ''
  });

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const micInputRef = useRef<HTMLInputElement>(null);
  const audioUploadRef = useRef<HTMLInputElement>(null);
  const manualDocRef = useRef<HTMLInputElement>(null);

  const allCategories = { ...SYSTEM_CATEGORIES, ...customCategories };
  const categoriesList = Object.keys(allCategories);
  const subCategories = allCategories[manual.category] || [];

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manual.amount) return;
    
    const amount = Math.abs(parseFloat(manual.amount));
    const description = manual.description.trim() || `${manual.category} Expense`;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    addExpense({
      amount,
      description: description,
      category: manual.category,
      subCategory: manual.subCategory,
      date: manual.date,
      status: manual.date <= todayStr ? 'paid' : 'unpaid',
      isRecurring: manual.isRecurring,
      frequency: manual.isRecurring ? manual.frequency : undefined,
      reminderDate: manual.isRecurring ? manual.reminderDate : undefined,
      reminderTime: manual.isRecurring ? manual.reminderTime : undefined,
      productName: manual.category === 'Warranties' ? manual.productName : undefined,
      purchaseDate: manual.category === 'Warranties' ? manual.purchaseDate : undefined,
      warrantyExpiryDate: manual.category === 'Warranties' ? manual.warrantyExpiryDate : undefined,
      serviceCenterContact: manual.category === 'Warranties' ? manual.serviceCenterContact : undefined,
      notes: manual.category === 'Warranties' ? manual.notes : undefined,
      billImageData: manualDoc?.data
    });

    setManual({ 
      amount: '', 
      description: '', 
      category: 'Miscellaneous', 
      subCategory: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      isRecurring: false,
      frequency: 'Monthly',
      reminderDate: format(new Date(), 'yyyy-MM-dd'),
      reminderTime: '09:00',
      productName: '',
      purchaseDate: '',
      warrantyExpiryDate: '',
      serviceCenterContact: '',
      notes: ''
    });
    setManualDoc(null);
    showSuccess();
  };

  const handleManualDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setManualDoc({
        data: reader.result as string,
        type: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const showSuccess = () => {
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const processImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const result = await scanBillExpenseCapture({ billImage: base64String });
        
        if (result.totalAmount) {
          let detectedCategory = 'Miscellaneous';
          if (result.categorySuggestion) {
            const found = categoriesList.find(c => 
              c.toLowerCase().includes(result.categorySuggestion!.toLowerCase()) || 
              result.categorySuggestion!.toLowerCase().includes(c.toLowerCase())
            );
            if (found) detectedCategory = found;
          }

          const amount = Math.abs(result.totalAmount);
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          const date = result.transactionDate || todayStr;

          addExpense({
            amount,
            description: result.merchantName || 'Scanned Receipt',
            category: detectedCategory,
            date,
            status: date <= todayStr ? 'paid' : 'unpaid',
            billImageData: base64String,
            isRecurring: isRecurringGlobal,
            frequency: isRecurringGlobal ? 'Monthly' : undefined,
            reminderDate: isRecurringGlobal ? date : undefined,
            reminderTime: isRecurringGlobal ? '09:00' : undefined
          });
          
          showSuccess();
          toast({ 
            title: "Bill Scanned", 
            description: `Captured ${currency.symbol}${amount} from ${result.merchantName || 'the receipt'}.` 
          });
        } else {
          toast({
            variant: "destructive",
            title: "Scan Failed",
            description: "Could not find a total amount. Please ensure the receipt is visible."
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast({ variant: "destructive", title: "AI Scan Error", description: "Failed to process the receipt image." });
    } finally {
      setLoading(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (imageUploadRef.current) imageUploadRef.current.value = "";
    }
  };

  const processVoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const result = await voiceExpenseCapture({ audioDataUri: base64String });
        
        if (result.amount > 0) {
          const amount = Math.abs(result.amount);
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          const date = result.date || todayStr;

          addExpense({
            amount,
            description: result.description || 'Voice Entry',
            category: result.category || 'Miscellaneous',
            date,
            status: date <= todayStr ? 'paid' : 'unpaid',
            isRecurring: isRecurringGlobal,
            frequency: isRecurringGlobal ? 'Monthly' : undefined,
            reminderDate: isRecurringGlobal ? date : undefined,
            reminderTime: isRecurringGlobal ? '09:00' : undefined
          });
          
          showSuccess();
          toast({ 
            title: "Voice Entry Recorded", 
            description: `Recorded ${currency.symbol}${amount} for ${result.description}.` 
          });
        } else {
          toast({
            variant: "destructive",
            title: "Voice Analysis Failed",
            description: "We couldn't extract an amount."
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast({ variant: "destructive", title: "AI Voice Error", description: "Could not process the audio recording." });
    } finally {
      setLoading(false);
      if (micInputRef.current) micInputRef.current.value = "";
      if (audioUploadRef.current) audioUploadRef.current.value = "";
    }
  };

  const handleAddCustom = () => {
    if (newCustomCategory) {
      addCustomCategory(newCustomCategory);
      setNewCustomCategory("");
      setIsCustomDialogOpen(false);
      toast({ title: "Category added", description: `Added "${newCustomCategory}"` });
    } else if (newCustomSubCategory && customParent) {
      addCustomSubCategory(customParent, newCustomSubCategory);
      setNewCustomSubCategory("");
      setCustomParent("");
      setIsCustomDialogOpen(false);
      toast({ title: "Sub-category added", description: `Added to "${customParent}"` });
    }
  };

  return (
    <Card className="shadow-lg border-none bg-card overflow-hidden ring-1 ring-primary/5">
      <CardHeader className="bg-primary/5 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl md:text-2xl font-headline text-primary tracking-tight">Capture Expense</CardTitle>
            <CardDescription className="text-xs md:text-sm mt-1">Easily record new transactions below.</CardDescription>
          </div>
          {success && <CheckCircle2 className="text-emerald-500 w-10 h-10 animate-in zoom-in" />}
        </div>
      </CardHeader>
      <CardContent className="pt-8 px-6">
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-10 bg-muted/40 p-1.5 h-12 rounded-xl">
            <TabsTrigger value="manual" className="text-[10px] md:text-xs font-bold uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all">Manual</TabsTrigger>
            <TabsTrigger value="scan" className="text-[10px] md:text-xs font-bold uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all">Scan Bill</TabsTrigger>
            <TabsTrigger value="voice" className="text-[10px] md:text-xs font-bold uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all">Voice</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <form onSubmit={handleManualSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Amount ({currency.symbol})</Label>
                  <div className="relative">
                    <Input 
                      id="amount" 
                      type="number" 
                      placeholder="0.00" 
                      required
                      className="h-12 text-sm md:text-base font-bold rounded-xl bg-background border-input focus:ring-primary shadow-sm"
                      value={manual.amount}
                      onChange={(e) => setManual({...manual, amount: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Date</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    className="h-12 text-sm md:text-base rounded-xl font-medium shadow-sm bg-background"
                    value={manual.date}
                    onChange={(e) => setManual({...manual, date: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Category</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={manual.category} 
                      onValueChange={(v) => setManual({...manual, category: v, subCategory: ''})}
                    >
                      <SelectTrigger id="category" className="h-12 text-sm md:text-base rounded-xl font-bold border-input bg-background">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[250px] rounded-xl">
                        {categoriesList.map(cat => (
                          <SelectItem key={cat} value={cat} className="text-sm md:text-base">{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="outline" 
                      className="h-12 w-12 shrink-0 rounded-xl border-input bg-background"
                      onClick={() => { setCustomParent(""); setIsCustomDialogOpen(true); }}
                    >
                      <PlusCircle className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subCategory" className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Sub-Category</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={manual.subCategory} 
                      onValueChange={(v) => setManual({...manual, subCategory: v})}
                    >
                      <SelectTrigger id="subCategory" className="h-12 text-sm md:text-base rounded-xl font-bold border-input bg-background">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] rounded-xl">
                        {subCategories.map(sub => (
                          <SelectItem key={sub} value={sub} className="text-sm md:text-base">{sub}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="outline" 
                      className="h-12 w-12 shrink-0 rounded-xl border-input bg-background"
                      onClick={() => { setCustomParent(manual.category); setIsCustomDialogOpen(true); }}
                    >
                      <PlusCircle className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Document Upload (Image/PDF)</Label>
                <div className="flex flex-col gap-3">
                  {!manualDoc ? (
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="h-12 w-full rounded-xl border-dashed border-primary/30 text-muted-foreground text-xs md:text-sm font-bold shadow-sm"
                      onClick={() => manualDocRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Bill/Invoice
                    </Button>
                  ) : (
                    <div className="flex items-center justify-between p-3.5 bg-primary/5 rounded-xl border border-primary/20 animate-in fade-in shadow-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        {manualDoc.type === 'application/pdf' ? <FileText className="w-5 h-5 text-primary" /> : <ImageIcon className="w-5 h-5 text-primary" />}
                        <span className="text-xs md:text-sm font-bold truncate text-foreground">{manualDoc.name}</span>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                        onClick={() => setManualDoc(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={manualDocRef} 
                    className="hidden" 
                    accept="image/*,application/pdf" 
                    onChange={handleManualDocUpload} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Description (Optional)</Label>
                <Input 
                  id="description" 
                  placeholder="What did you spend on?" 
                  className="h-12 text-sm md:text-base rounded-xl shadow-sm bg-background"
                  value={manual.description}
                  onChange={(e) => setManual({...manual, description: e.target.value})}
                />
              </div>

              {manual.category === 'Warranties' && (
                <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-5 animate-in fade-in slide-in-from-top-2 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-primary">Warranty Details</span>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="productName" className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Product Name</Label>
                      <Input id="productName" className="h-11 text-sm md:text-base rounded-lg font-bold" value={manual.productName} onChange={(e) => setManual({...manual, productName: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="purchaseDate" className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Purchase Date</Label>
                      <Input id="purchaseDate" type="date" className="h-11 text-sm md:text-base rounded-lg font-medium" value={manual.purchaseDate} onChange={(e) => setManual({...manual, purchaseDate: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="expiry" className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Expiry Date</Label>
                      <Input id="expiry" type="date" className="h-11 text-sm md:text-base rounded-lg font-medium" value={manual.warrantyExpiryDate} onChange={(e) => setManual({...manual, warrantyExpiryDate: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact" className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Service Center</Label>
                      <Input id="contact" className="h-11 text-sm md:text-base rounded-lg" value={manual.serviceCenterContact} onChange={(e) => setManual({...manual, serviceCenterContact: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="notes" className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Notes</Label>
                    <Textarea id="notes" className="text-sm md:text-base min-h-[100px] rounded-lg" value={manual.notes} onChange={(e) => setManual({...manual, notes: e.target.value})} />
                  </div>
                </div>
              )}

              <div className="pt-6 pb-4 space-y-4 border-t border-dashed mt-6">
                <div className="flex items-center justify-between p-5 bg-muted/30 rounded-xl border border-muted shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-primary/10">
                      <Repeat className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <Label htmlFor="recurring" className="cursor-pointer text-sm md:text-base font-bold">Monthly Recurring</Label>
                      <p className="text-[10px] md:text-xs text-muted-foreground font-medium">Persist for future months</p>
                    </div>
                  </div>
                  <Switch 
                    id="recurring"
                    checked={manual.isRecurring}
                    onCheckedChange={(checked) => setManual({...manual, isRecurring: checked})}
                    className="scale-90"
                  />
                </div>

                {manual.isRecurring && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                      <Label htmlFor="frequency" className="text-[10px] md:text-xs font-bold uppercase text-muted-foreground ml-1">Frequency</Label>
                      <Select 
                        value={manual.frequency} 
                        onValueChange={(v) => setManual({...manual, frequency: v as Frequency})}
                      >
                        <SelectTrigger id="frequency" className="h-11 text-sm md:text-base rounded-xl font-bold shadow-sm bg-background border-input">
                          <SelectValue placeholder="Frequency" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {FREQUENCIES.map(freq => (
                            <SelectItem key={freq} value={freq} className="text-sm md:text-base">{freq}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reminder-date" className="text-[10px] md:text-xs font-bold uppercase text-muted-foreground ml-1">Reminder Date</Label>
                      <Input 
                        id="reminder-date" 
                        type="date" 
                        className="h-11 text-sm md:text-base rounded-xl font-medium shadow-sm bg-background"
                        value={manual.reminderDate}
                        onChange={(e) => setManual({...manual, reminderDate: e.target.value})}
                        required={manual.isRecurring}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reminder-time" className="text-[10px] md:text-xs font-bold uppercase text-muted-foreground ml-1">Reminder Time</Label>
                      <Input 
                        id="reminder-time" 
                        type="time" 
                        className="h-11 text-sm md:text-base rounded-xl font-medium shadow-sm bg-background"
                        value={manual.reminderTime}
                        onChange={(e) => setManual({...manual, reminderTime: e.target.value})}
                        required={manual.isRecurring}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full h-14 bg-primary hover:bg-primary/90 text-sm md:text-base font-bold shadow-lg shadow-primary/20 rounded-xl mt-6">
                <Plus className="w-6 h-6 mr-2" />
                Add Transaction
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="scan">
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center border-2 border-dashed border-muted/50 rounded-2xl bg-muted/10 transition-colors hover:bg-muted/20">
                <div className="p-6 bg-primary/10 rounded-full mb-6">
                  <Camera className="w-12 h-12 text-primary" />
                </div>
                <h3 className="font-headline font-bold mb-3 text-lg md:text-xl">Scan Bill</h3>
                <p className="text-xs md:text-sm text-muted-foreground mb-8 max-w-[300px]">Our AI will automatically extract the merchant, amount, and date from your receipt.</p>
                
                <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={processImage} />
                <input type="file" ref={imageUploadRef} className="hidden" accept="image/*" onChange={processImage} />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-sm">
                  <Button 
                    onClick={() => cameraInputRef.current?.click()} 
                    disabled={loading} 
                    className="h-14 font-bold rounded-xl shadow-lg"
                  >
                    {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Camera className="w-5 h-5 mr-2" />}
                    Take Photo
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => imageUploadRef.current?.click()} 
                    disabled={loading} 
                    className="h-14 font-bold rounded-xl border-primary text-primary hover:bg-primary/5 shadow-sm"
                  >
                    {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Upload className="w-5 h-5 mr-2" />}
                    Upload Receipt
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-5 bg-muted/30 rounded-xl border border-muted shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Repeat className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <Label className="text-sm md:text-base font-bold">Monthly Recurring</Label>
                    <p className="text-[10px] md:text-xs text-muted-foreground font-medium">Applies to scanned bill</p>
                  </div>
                </div>
                <Switch checked={isRecurringGlobal} onCheckedChange={setIsRecurringGlobal} className="scale-90" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="voice">
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center border-2 border-dashed border-muted/50 rounded-2xl bg-muted/10 transition-colors hover:bg-muted/20">
                <div className="p-6 bg-accent/10 rounded-full mb-6">
                  <Mic className="w-12 h-12 text-accent" />
                </div>
                <h3 className="font-headline font-bold mb-3 text-lg md:text-xl">Voice Capture</h3>
                <p className="text-xs md:text-sm text-muted-foreground mb-8 max-w-[300px]">Mention the amount, category, and description clearly.</p>
                
                <input type="file" ref={micInputRef} className="hidden" accept="audio/*" capture="user" onChange={processVoice} />
                <input type="file" ref={audioUploadRef} className="hidden" accept="audio/*" onChange={processVoice} />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-sm">
                  <Button 
                    onClick={() => micInputRef.current?.click()} 
                    disabled={loading} 
                    className="h-14 font-bold bg-accent hover:bg-accent/90 rounded-xl shadow-lg"
                  >
                    {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Mic className="w-5 h-5 mr-2" />}
                    Record Voice
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => audioUploadRef.current?.click()} 
                    disabled={loading} 
                    className="h-14 font-bold border-accent text-accent hover:bg-accent/5 rounded-xl shadow-sm"
                  >
                    {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Upload className="w-5 h-5 mr-2" />}
                    Upload Audio
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-5 bg-muted/30 rounded-xl border border-muted shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Repeat className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <Label className="text-sm md:text-base font-bold">Monthly Recurring</Label>
                    <p className="text-[10px] md:text-xs text-muted-foreground font-medium">Applies to voice entry</p>
                  </div>
                </div>
                <Switch checked={isRecurringGlobal} onCheckedChange={setIsRecurringGlobal} className="scale-90" />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
        <DialogContent className="max-w-[400px] p-8 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl font-headline font-bold text-primary mb-2">
              {customParent ? `New Sub-category for ${customParent}` : "New Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <Label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-3 block">Category Name</Label>
            {customParent ? (
              <Input 
                placeholder="e.g. Organic Produce" 
                value={newCustomSubCategory} 
                className="text-sm md:text-base h-12 rounded-xl font-bold shadow-sm"
                onChange={(e) => setNewCustomSubCategory(e.target.value)} 
              />
            ) : (
              <Input 
                placeholder="e.g. Hobby Projects" 
                value={newCustomCategory} 
                className="text-sm md:text-base h-12 rounded-xl font-bold shadow-sm"
                onChange={(e) => setNewCustomCategory(e.target.value)} 
              />
            )}
          </div>
          <DialogFooter>
            <Button className="w-full h-14 text-sm md:text-base font-bold rounded-xl shadow-lg" onClick={handleAddCustom}>Confirm & Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
