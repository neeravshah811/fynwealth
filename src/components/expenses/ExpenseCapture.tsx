
"use client";

import { useState, useRef, useEffect } from "react";
import { useFynWealthStore, Frequency } from "@/lib/store";
import { useFirestore, useUser } from "@/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy } from "firebase/firestore";
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
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function ExpenseCapture() {
  const { currency } = useFynWealthStore();
  const { user } = useUser();
  const db = useFirestore();
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Categories & Subcategories
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [isSubLoading, setIsSubLoading] = useState(false);

  // Custom Category Dialog State
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

  // Warranty specialized states
  const [warrantyData, setWarrantyData] = useState({
    productName: "",
    purchaseDate: format(new Date(), 'yyyy-MM-dd'),
    expiryDate: format(new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate()), 'yyyy-MM-dd'),
    contact: ""
  });

  const loadCategories = async () => {
    if (!db) return;
    try {
      const snapshot = await getDocs(query(collection(db, "categories"), orderBy("name", "asc")));
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Failed to load categories", err);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [db]);

  async function loadSubcategories(categoryId: string) {
    if (!db || !categoryId) {
      setSubcategories([]);
      return;
    }
    setIsSubLoading(true);
    try {
      const q = query(
        collection(db, "subcategories"),
        where("categoryId", "==", categoryId),
        orderBy("name", "asc")
      );
      const snapshot = await getDocs(q);
      setSubcategories(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (err) {
      console.error("Failed to load subcategories", err);
    } finally {
      setIsSubLoading(false);
    }
  }

  const handleCategoryChange = (categoryId: string) => {
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

      toast({ title: "Category Created", description: `"${newCategoryName}" added to your list.` });
      setNewCategoryName("");
      setIsCustomCategoryOpen(false);
      
      await loadCategories();
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

    if (!selectedCategory || !selectedSubcategory) {
      toast({ variant: "destructive", title: "Missing Selection", description: "Please select both a category and subcategory." });
      return;
    }

    if (!amount) {
      toast({ variant: "destructive", title: "Missing Amount", description: "Please enter an amount." });
      return;
    }

    setLoading(true);
    try {
      const categoryObj = categories.find(c => c.id === selectedCategory);
      const subcategoryObj = subcategories.find(s => s.id === selectedSubcategory);

      const finalNote = note.trim() || "No note provided";

      const payload: any = {
        userId: user.uid,
        amount: Math.abs(parseFloat(amount)),
        categoryId: selectedCategory,
        categoryName: categoryObj?.name || "Unknown",
        category: categoryObj?.name || "Unknown",
        subcategoryId: selectedSubcategory,
        subcategoryName: subcategoryObj?.name || "Unknown",
        subCategory: subcategoryObj?.name || "Unknown",
        note: finalNote,
        description: finalNote,
        date: date,
        billImageData: attachmentData,
        status: 'paid',
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
          subcategoryId: selectedSubcategory,
          subcategoryName: subcategoryObj?.name || "Unknown",
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
      toast({ title: "Expense Added", description: isWarrantyCategory ? "Warranty recorded and reminder scheduled." : "Expense saved to cloud vault." });
      resetForm();
    } catch (err) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not sync with cloud." });
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
      toast({ variant: "destructive", title: "Microphone Denied", description: "Please enable microphone access." });
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
          toast({ title: "Voice Capture", description: "Review and click 'Add Expense'." });
          setAmount(result.amount.toString());
          setNote(result.description);
          if (result.date) setDate(result.date);
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (err) {
      toast({ variant: "destructive", title: "AI Failed", description: "Could not process audio." });
    } finally {
      setLoading(false);
    }
  };

  const processImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const result = await scanBillExpenseCapture({ billImage: base64String });
        if (result.totalAmount) {
          setAmount(Math.abs(result.totalAmount).toString());
          setNote(result.merchantName || "");
          toast({ title: "Bill Scanned", description: "Extracted amount and merchant." });
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast({ variant: "destructive", title: "Scan Failed", description: "Could not read receipt." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-none bg-card ring-1 ring-primary/5">
      <CardHeader className="bg-primary/5 rounded-t-3xl">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">{currency.symbol}</span>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                      required 
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 pl-8 text-sm font-bold shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Date</Label>
                  <Input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="h-11 shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Category</Label>
                    <button 
                      type="button" 
                      onClick={() => setIsCustomCategoryOpen(true)}
                      className="text-primary hover:text-primary/80 transition-colors p-0.5 rounded-full hover:bg-primary/5"
                      title="Add Custom Category"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="h-11 rounded-xl font-bold shadow-sm">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="z-[100] max-h-[300px]">
                      {categories.length > 0 ? (
                        categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="empty" disabled>No categories found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Subcategory</Label>
                  <Select 
                    key={`sub-exp-${selectedCategory}`}
                    value={selectedSubcategory} 
                    onValueChange={setSelectedSubcategory}
                    disabled={!selectedCategory || isSubLoading}
                  >
                    <SelectTrigger className="h-11 rounded-xl font-medium shadow-sm">
                      <SelectValue placeholder={isSubLoading ? "Loading..." : "Select Subcategory"} />
                    </SelectTrigger>
                    <SelectContent className="z-[100] max-h-[250px]">
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
                <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10 space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Warranty Details</span>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase opacity-70">Product Name</Label>
                      <Input 
                        placeholder="e.g. MacBook Pro" 
                        value={warrantyData.productName} 
                        onChange={(e) => setWarrantyData({...warrantyData, productName: e.target.value})}
                        className="h-10 bg-background"
                        required={isWarrantyCategory}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase opacity-70">Purchase Date</Label>
                        <Input 
                          type="date" 
                          value={warrantyData.purchaseDate} 
                          onChange={(e) => setWarrantyData({...warrantyData, purchaseDate: e.target.value})}
                          className="h-10 bg-background text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold uppercase opacity-70">Expiry Date</Label>
                        <Input 
                          type="date" 
                          value={warrantyData.expiryDate} 
                          onChange={(e) => setWarrantyData({...warrantyData, expiryDate: e.target.value})}
                          className="h-10 bg-background text-xs"
                          required={isWarrantyCategory}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase opacity-70">Service Centre Contact</Label>
                      <Input 
                        placeholder="Email or Phone Number" 
                        value={warrantyData.contact} 
                        onChange={(e) => setWarrantyData({...warrantyData, contact: e.target.value})}
                        className="h-10 bg-background"
                      />
                    </div>
                    <p className="text-[9px] text-muted-foreground italic">
                      A reminder will be automatically set for {format(new Date(warrantyData.expiryDate), 'MMM dd, yyyy')}.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Note</Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="e.g. Starbucks Latte" 
                    value={note} 
                    onChange={(e) => setNote(e.target.value)} 
                    className="pl-10 h-11 rounded-xl shadow-sm" 
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-muted/50">
                  <div className="flex items-center gap-3">
                    <Repeat className="w-4 h-4 text-primary" />
                    <div>
                      <Label className="text-xs font-bold block">Recurring expense</Label>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold">Automatically record this transaction</p>
                    </div>
                  </div>
                  <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                </div>

                {isRecurring && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Frequency</Label>
                    <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                      <SelectTrigger className="h-11 rounded-xl font-medium shadow-sm">
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
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Attachment (Max 5MB)</Label>
                <div className="flex flex-col gap-2">
                  {!attachmentData ? (
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full h-11 rounded-xl border-dashed border-primary/30 text-primary hover:bg-primary/5 font-bold"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="w-4 h-4 mr-2" />
                      Add attachment
                    </Button>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/10">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-5 h-5 text-primary shrink-0" />
                        <span className="text-xs font-bold truncate pr-2">{attachmentName}</span>
                      </div>
                      <button type="button" onClick={removeAttachment} className="p-1 hover:bg-primary/10 rounded-full transition-colors">
                        <X className="w-4 h-4 text-primary" />
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

      <Dialog open={isCustomCategoryOpen} onOpenChange={setIsCustomCategoryOpen}>
        <DialogContent className="sm:max-w-[400px] p-8 rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl font-headline font-bold text-primary">New Category</DialogTitle>
            <DialogDescription className="text-xs font-medium mt-1">
              Add a personalized category to your financial command center.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Category Name</label>
              <Input 
                placeholder="e.g. Personal Projects" 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="h-12 rounded-xl text-sm font-bold shadow-sm"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              className="w-full h-14 font-bold rounded-xl shadow-lg" 
              onClick={handleAddCustomCategory}
              disabled={isCreatingCategory || !newCategoryName.trim()}
            >
              {isCreatingCategory ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
