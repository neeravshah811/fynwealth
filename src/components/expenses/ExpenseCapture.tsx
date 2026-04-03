"use client";

import { useState, useRef, useMemo } from "react";
import { useFynWealthStore, Frequency } from "@/lib/store";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, serverTimestamp, getDocs, query, where, doc, increment } from "firebase/firestore";
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
  StopCircle,
  Tag,
  Paperclip,
  FileText,
  X,
  ShieldCheck,
  ThumbsUp,
  Sparkles
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
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

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
      let name = cat.name?.trim();
      if (name === "Financial Commitments" || name === "Financial Commit") {
        name = "Financial Commit";
      }
      const normalized = name.toLowerCase();
      if (!normalized) return;
      if (!catMap.has(normalized) || cat.userId === user?.uid) {
        catMap.set(normalized, { ...cat, name });
      }
    });
    return Array.from(catMap.values()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [categoriesRaw, user?.uid]);

  // Manual Form States
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [isSubLoading, setIsSubLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>('Monthly');
  const [attachmentData, setAttachmentData] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  // AI Review Dialog States
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [aiReviewData, setAiReviewData] = useState<any>({
    amount: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    note: "",
    categoryId: "",
    subcategoryId: ""
  });

  const [isCustomCategoryOpen, setIsCustomCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const [warrantyData, setWarrantyData] = useState({
    productName: "",
    purchaseDate: format(new Date(), 'yyyy-MM-dd'),
    expiryDate: format(new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate()), 'yyyy-MM-dd'),
    contact: ""
  });

  async function loadSubcategories(categoryId: string, isReview: boolean = false) {
    if (!db || !categoryId || categoryId === 'empty' || categoryId === 'loading') {
      isReview ? setAiReviewData((prev: any) => ({ ...prev, subcategories: [] })) : setSubcategories([]);
      return;
    }
    setIsSubLoading(true);
    try {
      const q = query(
        collection(db, "subcategories"),
        where("categoryId", "==", categoryId)
      );
      const snapshot = await getDocs(q);
      const fetchedSubs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sorted = fetchedSubs.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
      
      if (isReview) {
        setAiReviewData((prev: any) => ({
          ...prev,
          subcategories: sorted,
          subcategoryId: sorted.length === 1 ? sorted[0].id : ""
        }));
      } else {
        setSubcategories(sorted);
        setSelectedSubcategory(sorted.length === 1 ? sorted[0].id : "");
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
        note: note.trim(),
        description: note.trim(),
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

        addDocumentNonBlocking(collection(db, 'users', user.uid, 'bills'), {
          name: `Warranty Expiry: ${warrantyData.productName}`,
          amount: 0,
          dueDate: warrantyData.expiryDate,
          dueTime: '09:00',
          frequency: 'One-time',
          categoryId: selectedCategory,
          categoryName: 'Warranties',
          userId: user.uid,
          status: 'pending',
          notified: false,
          createdAt: serverTimestamp(),
          note: `Warranty reminder for ${warrantyData.productName}. Contact: ${warrantyData.contact}`
        });
        updateDocumentNonBlocking(doc(db, 'users', user.uid), { 'stats.totalReminders': increment(1) });
      }

      addDocumentNonBlocking(collection(db, 'users', user.uid, 'expenses'), payload);
      updateDocumentNonBlocking(doc(db, 'users', user.uid), { 'stats.totalExpenses': increment(1) });

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

  const handleReviewApproval = async () => {
    if (!db || !user?.uid) return;
    setLoading(true);
    try {
      const categoryObj = categories.find(c => c.id === aiReviewData.categoryId);
      const subcategoryObj = aiReviewData.subcategories?.find((s: any) => s.id === aiReviewData.subcategoryId);
      const today = format(new Date(), 'yyyy-MM-dd');
      const status = aiReviewData.date > today ? 'unpaid' : 'paid';

      addDocumentNonBlocking(collection(db, 'users', user.uid, 'expenses'), {
        userId: user.uid,
        amount: Math.abs(parseFloat(aiReviewData.amount)),
        categoryId: aiReviewData.categoryId,
        categoryName: categoryObj?.name || "Unknown",
        category: categoryObj?.name || "Unknown",
        subcategoryId: aiReviewData.subcategoryId || "",
        subcategoryName: subcategoryObj?.name || "Others",
        subCategory: subcategoryObj?.name || "Others",
        note: aiReviewData.note.trim(),
        description: aiReviewData.note.trim(),
        date: aiReviewData.date,
        billImageData: attachmentData,
        status: status,
        createdAt: serverTimestamp()
      });

      updateDocumentNonBlocking(doc(db, 'users', user.uid), { 'stats.totalExpenses': increment(1) });
      setIsReviewDialogOpen(false);
      resetForm();
      toast({ title: "Approved & Recorded", description: "Expense successfully added to your vault." });
    } catch (err) {
      toast({ variant: "destructive", title: "Approval Failed", description: "Could not record the expense." });
    } finally {
      setLoading(false);
    }
  };

  const removeAttachment = () => {
    setAttachmentData(null);
    setAttachmentName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: mimeType });
        await processVoice(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast({ variant: "destructive", title: "Microphone Error", description: "Please allow microphone access to use voice capture." });
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
          const matchedCat = categories.find(c => 
            c.name.toLowerCase().includes(result.category.toLowerCase()) ||
            result.category.toLowerCase().includes(c.name.toLowerCase())
          );
          
          setAiReviewData({
            amount: result.amount.toString(),
            date: result.date || format(new Date(), 'yyyy-MM-dd'),
            note: result.description,
            categoryId: matchedCat?.id || "",
            subcategoryId: ""
          });
          if (matchedCat) await loadSubcategories(matchedCat.id, true);
          setIsReviewDialogOpen(true);
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (err) {
      toast({ variant: "destructive", title: "AI Transcribe Failed", description: "Failed to process audio. Try speaking again." });
    } finally {
      setLoading(false);
    }
  };

  const processImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;
    
    const previewReader = new FileReader();
    previewReader.onloadend = () => { setAttachmentData(previewReader.result as string); setAttachmentName(file.name); };
    previewReader.readAsDataURL(file);

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const result = await scanBillExpenseCapture({ billImage: base64String });
        if (result) {
          const matchedCat = categories.find(c => 
            c.name.toLowerCase().includes(result.categorySuggestion?.toLowerCase() || "") ||
            result.categorySuggestion?.toLowerCase().includes(c.name.toLowerCase())
          );
          setAiReviewData({
            amount: Math.abs(result.totalAmount || 0).toString(),
            date: result.transactionDate || format(new Date(), 'yyyy-MM-dd'),
            note: result.merchantName || "",
            categoryId: matchedCat?.id || "",
            subcategoryId: ""
          });
          if (matchedCat) await loadSubcategories(matchedCat.id, true);
          setIsReviewDialogOpen(true);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast({ variant: "destructive", title: "Scan Error", description: "AI failed to analyze receipt." });
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
                      className="flex h-12 w-full rounded-xl border border-input bg-background py-2 pl-9 pr-4 text-sm font-bold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 shadow-sm rounded-xl px-4" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1 h-5 mb-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Category</Label>
                    <button type="button" onClick={() => setIsCustomCategoryOpen(true)} className="text-primary hover:text-primary/80 p-1 rounded-full"><Plus className="w-4 h-4" /></button>
                  </div>
                  <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="h-12 rounded-xl font-bold shadow-sm px-4"><SelectValue placeholder="Select Category" /></SelectTrigger>
                    <SelectContent className="z-[100] max-h-[300px] rounded-xl">
                      {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center px-1 h-5 mb-1"><Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Subcategory</Label></div>
                  <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory} disabled={!selectedCategory || isSubLoading}>
                    <SelectTrigger className="h-12 rounded-xl font-medium shadow-sm px-4"><SelectValue placeholder={isSubLoading ? "Loading..." : "Optional"} /></SelectTrigger>
                    <SelectContent className="z-[100] max-h-[250px] rounded-xl">
                      {subcategories.map(sub => <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Description</Label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="e.g. Weekly Groceries" value={note} onChange={(e) => setNote(e.target.value)} className="pl-11 pr-4 h-12 rounded-xl shadow-sm" />
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
                {isRecording ? "Speak your expense clearly..." : "Say: \"Spent 500 on dinner yesterday.\""}
              </p>
              {!isRecording ? (
                <Button onClick={startRecording} disabled={loading} className="h-12 px-10 font-bold rounded-xl shadow-lg transition-all">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Mic className="w-5 h-5 mr-2" />}
                  {loading ? "Processing..." : "Start Recording"}
                </Button>
              ) : (
                <Button onClick={stopRecording} variant="destructive" className="h-12 px-10 font-bold rounded-xl shadow-lg transition-all">
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
              <p className="text-xs text-muted-foreground mb-8 max-w-xs px-8 leading-relaxed">AI will extract Merchant, Amount and Date from your receipt instantly.</p>
              <input type="file" className="hidden" id="scan-upload" accept="image/*" capture="environment" onChange={processImage} />
              <Button asChild className="h-12 px-10 font-bold rounded-xl shadow-lg transition-all" disabled={loading}>
                <label htmlFor="scan-upload" className="cursor-pointer">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
                  {loading ? "Analyzing..." : "Scan Now"}
                </label>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* AI Review & Edit Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl rounded-[24px]">
          <DialogHeader className="p-8 bg-primary/5 border-b border-muted/50">
            <DialogTitle className="text-2xl font-headline font-bold text-primary flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-accent" /> Verify AI Extract
            </DialogTitle>
            <DialogDescription className="text-sm font-medium mt-1">Check extracted details and categorize your expense.</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase opacity-70">Amount ({currency.symbol})</Label>
                <Input value={aiReviewData.amount} onChange={(e) => setAiReviewData({...aiReviewData, amount: e.target.value})} className="h-11 font-bold rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase opacity-70">Date</Label>
                <Input type="date" value={aiReviewData.date} onChange={(e) => setAiReviewData({...aiReviewData, date: e.target.value})} className="h-11 rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase opacity-70">Description</Label>
              <Input value={aiReviewData.note} onChange={(e) => setAiReviewData({...aiReviewData, note: e.target.value})} className="h-11 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase opacity-70">Category</Label>
                <Select value={aiReviewData.categoryId} onValueChange={(v) => { setAiReviewData({...aiReviewData, categoryId: v}); loadSubcategories(v, true); }}>
                  <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue placeholder="Pick One" /></SelectTrigger>
                  <SelectContent className="max-h-[300px] rounded-xl">
                    {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase opacity-70">Subcategory</Label>
                <Select value={aiReviewData.subcategoryId} onValueChange={(v) => setAiReviewData({...aiReviewData, subcategoryId: v})} disabled={!aiReviewData.categoryId}>
                  <SelectTrigger className="h-11 rounded-xl font-medium"><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent className="max-h-[250px] rounded-xl">
                    {aiReviewData.subcategories?.map((sub: any) => <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 bg-muted/20 border-t flex gap-3">
            <Button variant="ghost" onClick={() => setIsReviewDialogOpen(false)} className="flex-1 font-bold rounded-xl h-12">Discard</Button>
            <Button onClick={handleReviewApproval} disabled={loading || !aiReviewData.categoryId} className="flex-[2] font-bold rounded-xl h-12 shadow-lg">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
              Approve & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCustomCategoryOpen} onOpenChange={setIsCustomCategoryOpen}>
        <DialogContent className="sm:max-w-[400px] p-8 rounded-[20px] border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-xl font-headline font-bold text-primary">New Category</DialogTitle></DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Name</label>
              <Input placeholder="e.g. Travel 2026" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="h-12 rounded-xl text-sm font-bold shadow-sm px-4" autoFocus />
            </div>
          </div>
          <DialogFooter><Button className="w-full h-14 font-bold rounded-xl shadow-lg transition-all" onClick={handleAddCustomCategory} disabled={isCreatingCategory || !newCategoryName.trim()}>{isCreatingCategory ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Create Now"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
