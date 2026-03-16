"use client";

import { useState, useRef, useMemo } from "react";
import { useFynWealthStore, Frequency } from "@/lib/store";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Paperclip,
  FileText,
  X,
  ShieldCheck
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { scanBillExpenseCapture } from "@/ai/flows/scan-bill-expense-capture";
import { voiceExpenseCapture } from "@/ai/flows/voice-expense-capture-flow";
import { BankStatementImport } from "./BankStatementImport";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function ExpenseCapture() {
  const { currency } = useFynWealthStore();
  const { user } = useUser();
  const db = useFirestore();
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState("manual");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Taxonomy listeners
  const categoriesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "categories");
  }, [db]);

  const { data: categoriesRaw } = useCollection(categoriesQuery);

  const categories = useMemo(() => {
    if (!categoriesRaw) return [];
    const catMap = new Map();
    categoriesRaw.forEach(cat => {
      const normalized = cat.name?.trim().toLowerCase();
      if (!normalized) return;
      
      if (!catMap.has(normalized) || cat.userId === user?.uid) {
        catMap.set(normalized, cat);
      }
    });
    return Array.from(catMap.values()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [categoriesRaw, user?.uid]);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [isSubLoading, setIsSubLoading] = useState(false);

  const [isCustomCategoryOpen, setIsCustomCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>('Monthly');
  const [attachmentData, setAttachmentData] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  const [warrantyData, setWarrantyData] = useState({
    productName: "",
    purchaseDate: format(new Date(), 'yyyy-MM-dd'),
    expiryDate: format(new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate()), 'yyyy-MM-dd'),
    contact: ""
  });

  async function loadSubcategories(categoryId: string) {
    if (!db || !categoryId || categoryId === 'empty' || categoryId === 'loading') {
      setSubcategories([]);
      return;
    }
    setIsSubLoading(true);
    try {
      const q = query(
        collection(db, "subcategories"),
        where("categoryId", "==", categoryId)
      );
      const snapshot = await getDocs(q);
      const fetchedSubs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const sorted = fetchedSubs.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
      setSubcategories(sorted);

      if (sorted.length === 1) {
        setSelectedSubcategory(sorted[0].id);
      } else {
        setSelectedSubcategory("");
      }
    } catch (err) {
      console.error("Failed to load subcategories", err);
    } finally {
      setIsSubLoading(false);
    }
  }

  const handleCategoryChange = (categoryId: string) => {
    if (categoryId === 'empty' || categoryId === 'loading') return;
    setSelectedCategory(categoryId);
    setSelectedSubcategory("");
    loadSubcategories(categoryId);
  };

  const handleAddCustomCategory = async () => {
    if (!newCategoryName.trim() || !db || !user?.uid) return;
    setIsCreatingCategory(true);
    try {
      const categoryRef = await addDoc(collection(db, "categories"), {
        name: newCategoryName.trim(),
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, "subcategories"), {
        name: "Others",
        categoryId: categoryRef.id,
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      toast({ title: "Category Created", description: `"${newCategoryName}" added.` });
      setNewCategoryName("");
      setIsCustomCategoryOpen(false);
      handleCategoryChange(categoryRef.id);
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to create category." });
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const isWarrantyCategory = categories.find(c => c.id === selectedCategory)?.name === "Warranties";

  const resetForm = () => {
    setAmount("");
    setNote("");
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSubcategories([]);
    setIsRecurring(false);
    setFrequency('Monthly');
    setAttachmentData(null);
    setAttachmentName(null);
    setWarrantyData({
      productName: "",
      purchaseDate: format(new Date(), 'yyyy-MM-dd'),
      expiryDate: format(new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate()), 'yyyy-MM-dd'),
      contact: ""
    });
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user?.uid) return;

    if (!selectedCategory || selectedCategory === 'empty') {
      toast({ variant: "destructive", title: "Category Required", description: "Please choose a category." });
      return;
    }

    if (!amount || isNaN(parseFloat(amount))) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid numeric amount." });
      return;
    }

    setLoading(true);
    try {
      const categoryObj = categories.find(c => c.id === selectedCategory);
      const subcategoryObj = selectedSubcategory ? subcategories.find(s => s.id === selectedSubcategory) : null;

      const finalNote = note.trim();
      
      const today = format(new Date(), 'yyyy-MM-dd');
      const status = date > today ? 'unpaid' : 'paid';

      const payload: any = {
        userId: user.uid,
        amount: Math.abs(parseFloat(amount)),
        categoryId: selectedCategory,
        categoryName: categoryObj?.name || "Unknown",
        category: categoryObj?.name || "Unknown",
        subcategoryId: selectedSubcategory || "",
        subcategoryName: subcategoryObj?.name || "Others",
        subCategory: subcategoryObj?.name || "Others",
        note: finalNote,
        description: finalNote,
        date: date,
        billImageData: attachmentData,
        status: status,
        createdAt: serverTimestamp()
      };

      if (isWarrantyCategory) {
        payload.productName = warrantyData.productName;
        payload.purchaseDate = warrantyData.purchaseDate;
        payload.warrantyExpiryDate = warrantyData.expiryDate;
        payload.serviceCentreContact = warrantyData.contact;

        await addDoc(collection(db, 'users', user.uid, 'bills'), {
          name: `Warranty Expiry: ${warrantyData.productName}`,
          amount: 0,
          dueDate: warrantyData.expiryDate,
          dueTime: '09:00',
          frequency: 'One-time',
          categoryId: selectedCategory,
          categoryName: 'Warranties',
          subcategoryId: selectedSubcategory || "",
          subcategoryName: subcategoryObj?.name || "Others",
          userId: user.uid,
          status: 'pending',
          notified: false,
          createdAt: serverTimestamp(),
          note: `Warranty reminder for ${warrantyData.productName}. Contact: ${warrantyData.contact}`
        });
      }

      await addDoc(collection(db, 'users', user.uid, 'expenses'), payload);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      toast({ 
        title: status === 'paid' ? "Expense Saved" : "Future Payment Logged", 
        description: status === 'paid' ? "Synchronized with your cloud vault." : "Marked as unpaid until the due date." 
      });
      resetForm();
    } catch (err) {
      toast({ variant: "destructive", title: "Save Failed", description: "Check your internet connection." });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachmentData(reader.result as string);
      setAttachmentName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setAttachmentData(null);
    setAttachmentName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      toast({ variant: "destructive", title: "Microphone Error", description: "Could not access microphone." });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processVoice = async (audioBlob: Blob) => {
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const result = await voiceExpenseCapture({ audioDataUri: base64String });
        if (result) {
          setAmount(result.amount.toString());
          setNote(result.description);
          if (result.date) setDate(result.date);
          
          if (result.category) {
            const matchedCat = categories.find(c => 
              c.name.toLowerCase().includes(result.category.toLowerCase()) ||
              result.category.toLowerCase().includes(c.name.toLowerCase())
            );
            if (matchedCat) {
              handleCategoryChange(matchedCat.id);
            }
          }

          setActiveTab("manual");
          toast({ title: "AI Transcribed", description: "Review extracted data and save." });
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (err) {
      toast({ variant: "destructive", title: "AI Error", description: "Failed to process voice input." });
    } finally {
      setLoading(false);
    }
  };

  const processImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;
    
    const previewReader = new FileReader();
    previewReader.onloadend = () => {
      setAttachmentData(previewReader.result as string);
      setAttachmentName(file.name);
    };
    previewReader.readAsDataURL(file);

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const result = await scanBillExpenseCapture({ billImage: base64String });
        if (result) {
          if (result.totalAmount) setAmount(Math.abs(result.totalAmount).toString());
          if (result.merchantName) setNote(result.merchantName);
          if (result.transactionDate) setDate(result.transactionDate);
          
          if (result.categorySuggestion) {
            const matchedCat = categories.find(c => 
              c.name.toLowerCase().includes(result.categorySuggestion!.toLowerCase()) ||
              result.categorySuggestion!.toLowerCase().includes(c.name.toLowerCase())
            );
            if (matchedCat) {
              handleCategoryChange(matchedCat.id);
            }
          }
          
          setActiveTab("manual");
          toast({ 
            title: "Receipt Analyzed", 
            description: "Merchant, amount, date and category extracted. Please review." 
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast({ variant: "destructive", title: "Scan Error", description: "AI failed to process receipt." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-none bg-card ring-1 ring-black/5">
      <CardHeader className="bg-primary/5 rounded-t-[20px] flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <CardTitle className="text-xl font-headline text-primary font-bold">Record Spend</CardTitle>
          {success && <CheckCircle2 className="text-emerald-500 w-6 h-6 animate-in zoom-in" />}
        </div>
        <BankStatementImport />
      </CardHeader>
      <CardContent className="p-5 pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="manual" className="text-[10px] md:text-xs font-bold uppercase rounded-lg">Manual</TabsTrigger>
            <TabsTrigger value="voice" className="text-[10px] md:text-xs font-bold uppercase rounded-lg">Voice</TabsTrigger>
            <TabsTrigger value="scan" className="text-[10px] md:text-xs font-bold uppercase rounded-lg">Scan</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <form onSubmit={handleManualSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Amount</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">{currency.symbol}</span>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                      required 
                      className="flex h-12 w-full rounded-xl border border-input bg-background py-2 pl-9 pr-4 text-sm font-bold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Date</Label>
                  <Input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="h-12 shadow-sm rounded-xl px-4"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1 h-5 mb-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Category</Label>
                    <button 
                      type="button" 
                      onClick={() => setIsCustomCategoryOpen(true)}
                      className="text-primary hover:text-primary/80 transition-colors p-1 rounded-full hover:bg-primary/5"
                      title="Add Custom Category"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="h-12 rounded-xl font-bold shadow-sm px-4">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="z-[100] max-h-[300px] rounded-xl">
                      {categories.length > 0 ? (
                        categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="empty" disabled>No categories available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center px-1 h-5 mb-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Subcategory</Label>
                  </div>
                  <Select 
                    key={`sub-exp-${selectedCategory}`}
                    value={selectedSubcategory} 
                    onValueChange={setSelectedSubcategory}
                    disabled={!selectedCategory || isSubLoading}
                  >
                    <SelectTrigger className="h-12 rounded-xl font-medium shadow-sm px-4">
                      <SelectValue placeholder={isSubLoading ? "Loading..." : "Select Subcategory (Optional)"} />
                    </SelectTrigger>
                    <SelectContent className="z-[100] max-h-[250px] rounded-xl">
                      {isSubLoading ? (
                        <SelectItem value="loading" disabled>
                          <div className="flex items-center"><Loader2 className="w-3 h-3 animate-spin mr-2" /> Loading...</div>
                        </SelectItem>
                      ) : subcategories.length > 0 ? (
                        subcategories.map(sub => (
                          <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="empty" disabled>No subcategories found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isWarrantyCategory && (
                <div className="p-5 bg-primary/5 rounded-[20px] border border-primary/10 space-y-4 animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center gap-3 mb-2">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Warranty Details</span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase opacity-70 tracking-widest">Product Name</Label>
                      <Input 
                        placeholder="e.g. iPhone 15 Pro" 
                        value={warrantyData.productName} 
                        onChange={(e) => setWarrantyData({...warrantyData, productName: e.target.value})}
                        className="h-11 bg-background rounded-xl px-4"
                        required={isWarrantyCategory}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase opacity-70 tracking-widest">Purchase Date</Label>
                        <Input 
                          type="date" 
                          value={warrantyData.purchaseDate} 
                          onChange={(e) => setWarrantyData({...warrantyData, purchaseDate: e.target.value})}
                          className="h-11 bg-background text-xs rounded-xl px-4"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase opacity-70 tracking-widest">Expiry Date</Label>
                        <Input 
                          type="date" 
                          value={warrantyData.expiryDate} 
                          onChange={(e) => setWarrantyData({...warrantyData, expiryDate: e.target.value})}
                          className="h-11 bg-background text-xs rounded-xl px-4"
                          required={isWarrantyCategory}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase opacity-70 tracking-widest">Service Centre Contact</Label>
                      <Input 
                        placeholder="Email or Phone Number" 
                        value={warrantyData.contact} 
                        onChange={(e) => setWarrantyData({...warrantyData, contact: e.target.value})}
                        className="h-11 bg-background rounded-xl px-4"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground italic pl-1">
                      Automated reminder set for: {format(new Date(warrantyData.expiryDate), 'MMM dd, yyyy')}.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Description (Optional)</Label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="e.g. Weekly Groceries" 
                    value={note} 
                    onChange={(e) => setNote(e.target.value)} 
                    className="pl-11 pr-4 h-12 rounded-xl shadow-sm" 
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-5 bg-muted/30 rounded-[20px] border border-muted/50 transition-all hover:bg-muted/40">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <Repeat className="w-5 h-5" />
                    </div>
                    <div>
                      <Label className="text-sm font-bold block">Recurring expense</Label>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Auto-record transaction</p>
                    </div>
                  </div>
                  <Switch checked={isRecurring} onCheckedChange={setIsRecurring} className="scale-110" />
                </div>

                {isRecurring && (
                  <div className="space-y-2 animate-in slide-in-from-top-4">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Frequency</Label>
                    <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                      <SelectTrigger className="h-12 rounded-xl font-medium shadow-sm px-4">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[100] rounded-xl">
                        {['Weekly', 'Monthly', 'Quarterly', 'Half-yearly', 'Annually'].map(f => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Attachment</Label>
                <div className="flex flex-col gap-3">
                  {!attachmentData ? (
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full h-12 rounded-xl border-dashed border-primary/30 text-primary hover:bg-primary/5 font-bold transition-all"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="w-4 h-4 mr-2" />
                      Add Bill / PDF
                    </Button>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10 shadow-sm">
                      <div className="flex items-center gap-4 min-w-0">
                        <FileText className="w-6 h-6 text-primary shrink-0" />
                        <span className="text-xs font-bold truncate pr-4">{attachmentName}</span>
                      </div>
                      <button type="button" onClick={removeAttachment} className="p-2 hover:bg-primary/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-primary" />
                      </button>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-12 font-bold rounded-xl shadow-lg transition-all active:scale-95 mt-4">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                Add Expense
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="voice">
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-muted rounded-[20px] bg-muted/10">
              <div className={`p-8 rounded-full mb-6 transition-all duration-500 ${isRecording ? 'bg-destructive/20 animate-pulse scale-110 shadow-xl' : 'bg-primary/10'}`}>
                {isRecording ? <StopCircle className="w-14 h-14 text-destructive" /> : <Mic className="w-14 h-14 text-primary" />}
              </div>
              <h3 className="font-bold text-base mb-2">{isRecording ? "Listening..." : "Voice Capture"}</h3>
              <p className="text-xs text-muted-foreground px-8 mb-8 leading-relaxed max-w-xs">
                {isRecording 
                  ? "Speak your expense details clearly..." 
                  : "Say: \"Spent 500 on dinner yesterday.\""}
              </p>
              
              {!isRecording ? (
                <Button onClick={startRecording} disabled={loading} className="h-12 px-10 font-bold rounded-xl shadow-lg bg-primary transition-all active:scale-95">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Mic className="w-5 h-5 mr-2" />}
                  Start Recording
                </Button>
              ) : (
                <Button onClick={stopRecording} variant="destructive" className="h-12 px-10 font-bold rounded-xl shadow-lg transition-all active:scale-95">
                  Process Audio
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="scan">
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-muted rounded-[20px] bg-muted/10">
              <div className="p-8 rounded-full bg-primary/10 mb-6">
                <Camera className="w-14 h-14 text-primary opacity-60" />
              </div>
              <h3 className="font-bold text-base mb-2">Scan Receipt</h3>
              <p className="text-xs text-muted-foreground mb-8 max-w-xs px-8 leading-relaxed">
                AI will extract Merchant, Amount, Date and Category from your receipt instantly.
              </p>
              <input 
                type="file" 
                className="hidden" 
                id="scan-upload" 
                accept="image/*" 
                capture="environment"
                onChange={processImage} 
              />
              <Button asChild className="h-12 px-10 font-bold rounded-xl shadow-lg transition-all active:scale-95" disabled={loading}>
                <label htmlFor="scan-upload" className="cursor-pointer">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
                  Scan Now
                </label>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={isCustomCategoryOpen} onOpenChange={setIsCustomCategoryOpen}>
        <DialogContent className="sm:max-w-[400px] p-8 rounded-[20px] border-none shadow-2xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl md:text-2xl font-headline font-bold text-primary">New Category</DialogTitle>
            <DialogDescription className="text-sm font-medium mt-2">
              Add a personalized category to your records.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Name</label>
              <Input 
                placeholder="e.g. Travel 2026" 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="h-12 rounded-xl text-sm font-bold shadow-sm px-4"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              className="w-full h-14 font-bold rounded-xl shadow-lg transition-all active:scale-95" 
              onClick={handleAddCustomCategory}
              disabled={isCreatingCategory || !newCategoryName.trim()}
            >
              {isCreatingCategory ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
              Create Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
