
"use client";

import { useState, useRef, useEffect } from "react";
import { useFynWealthStore, Frequency } from "@/lib/store";
import { useFirestore, useUser } from "@/firebase";
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
  X
} from "lucide-react";
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

  // Required state structure
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>('Monthly');
  const [attachmentData, setAttachmentData] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  // Load categories on mount
  useEffect(() => {
    async function loadCategories() {
      if (!db) return;
      try {
        const snapshot = await getDocs(collection(db, "categories"));
        setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    }
    loadCategories();
  }, [db]);

  // Load subcategories when category changes
  async function loadSubcategories(categoryId: string) {
    if (!db || !categoryId) {
      setSubcategories([]);
      return;
    }
    try {
      const q = query(
        collection(db, "subcategories"),
        where("categoryId", "==", categoryId)
      );
      const snapshot = await getDocs(q);
      setSubcategories(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (err) {
      console.error("Failed to load subcategories", err);
    }
  }

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory("");
    loadSubcategories(categoryId);
  };

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

      const payload = {
        userId: user.uid,
        amount: Math.abs(parseFloat(amount)),
        categoryId: selectedCategory,
        categoryName: categoryObj?.name || "Unknown",
        subcategoryId: selectedSubcategory,
        subcategoryName: subcategoryObj?.name || "Unknown",
        note: note.trim() || "No note provided",
        date: date, // Using string 'yyyy-MM-dd' for easier range queries
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'users', user.uid, 'expenses'), payload);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      toast({ title: "Expense Added", description: "Your expense has been saved to your cloud vault." });
      resetForm();
    } catch (err) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not sync with cloud. Please check connection." });
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
      toast({ variant: "destructive", title: "Microphone Denied", description: "Please enable microphone access in your browser settings." });
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
        if (result && user?.uid) {
          toast({ title: "Voice Capture", description: "Review the extracted details and click 'Add Expense'." });
          setAmount(result.amount.toString());
          setNote(result.description);
          if (result.date) setDate(result.date);
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (err) {
      toast({ variant: "destructive", title: "AI Processing Failed", description: "Could not transcribe audio. Please try again or type manually." });
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
          setAmount(Math.abs(result.totalAmount).toString());
          setNote(result.merchantName || "");
          toast({ title: "Bill Scanned", description: "Successfully extracted amount and merchant details." });
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast({ variant: "destructive", title: "Scan Failed", description: "AI could not read the receipt clearly. Please ensure good lighting." });
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
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                      required 
                      className="pl-8 h-11 font-bold shadow-sm"
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
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Category</Label>
                  <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="h-11 rounded-xl font-bold shadow-sm">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="z-[100] max-h-[300px]">
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Subcategory</Label>
                  <Select 
                    value={selectedSubcategory} 
                    onValueChange={setSelectedSubcategory}
                    disabled={!selectedCategory}
                  >
                    <SelectTrigger className="h-11 rounded-xl font-medium shadow-sm">
                      <SelectValue placeholder="Select Subcategory" />
                    </SelectTrigger>
                    <SelectContent className="z-[100] max-h-[250px]">
                      {subcategories.map(sub => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

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
    </Card>
  );
}
