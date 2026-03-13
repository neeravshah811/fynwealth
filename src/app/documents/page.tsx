"use client";

import { useFynWealthStore } from "@/lib/store";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, where, deleteDoc, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
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
  FileText,
  Eye,
  FolderPlus,
  Folder as FolderIcon,
  ChevronRight,
  MoreHorizontal,
  ArrowRightLeft,
  X,
  HelpCircle,
  Calendar as CalendarIcon,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { TutorialDialog } from "@/components/TutorialDialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";

export default function DocumentsPage() {
  const { currency, viewMonth, viewYear, setViewDate } = useFynWealthStore();
  const { user } = useUser();
  const db = useFirestore();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<{ data: string; type: string } | null>(null);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Firestore Expenses (Documents) Query
  const expensesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    const startDate = format(new Date(viewYear, viewMonth, 1), 'yyyy-MM-dd');
    const endDate = format(new Date(viewYear, viewMonth + 1, 0), 'yyyy-MM-dd');
    
    return query(
      collection(db, 'users', user.uid, 'expenses'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
  }, [db, user?.uid, viewMonth, viewYear]);

  // Firestore Folders Query
  const foldersQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return collection(db, 'users', user.uid, 'folders');
  }, [db, user?.uid]);

  const { data: expensesData, isLoading: expensesLoading } = useCollection(expensesQuery);
  const { data: foldersData, isLoading: foldersLoading } = useCollection(foldersQuery);

  const folders = foldersData || [];
  const expenses = (expensesData || []).filter(e => e.billImageData);

  const activeFolder = folders.find(f => f.id === currentFolderId);

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(e => 
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
        e.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(e => (e.folderId ?? null) === currentFolderId);
  }, [expenses, searchTerm, currentFolderId]);

  const rootFolders = useMemo(() => {
    if (currentFolderId) return []; 
    return folders.filter(f => 
      f.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [folders, searchTerm, currentFolderId]);

  const formatAmount = (amount: number) => {
    return Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getDocType = (dataUri: string) => {
    if (dataUri.startsWith('data:application/pdf')) return 'pdf';
    return 'image';
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setViewDate(date.getMonth(), date.getFullYear());
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !db || !user?.uid) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'folders'), {
        name: newFolderName.trim(),
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewFolderName("");
      setIsFolderDialogOpen(false);
      toast({ title: "Folder Created", description: `Added "${newFolderName}" to your safe.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to create folder." });
    }
  };

  const handleDeleteFolder = async (id: string, name: string) => {
    if (!db || !user?.uid) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'folders', id));
      toast({ title: "Folder Deleted", description: `Removed "${name}".` });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete folder." });
    }
  };

  const moveExpenseToFolder = async (expenseId: string, folderId: string | null) => {
    if (!db || !user?.uid) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'expenses', expenseId), {
        folderId: folderId
      });
      toast({ title: "Moved", description: "Document location updated." });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to move document." });
    }
  };

  const deleteExpense = async (id: string) => {
    if (!db || !user?.uid) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'expenses', id));
      toast({ title: "Deleted", description: "Document removed from vault." });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete document." });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-24 px-1">
      <TutorialDialog open={showTutorial} onOpenChange={setShowTutorial} />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-headline mb-1 text-primary">Document Safe</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold uppercase tracking-wider">
            <button onClick={() => setCurrentFolderId(null)} className="hover:text-primary transition-colors">Root</button>
            {activeFolder && (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-foreground">{activeFolder.name}</span>
              </>
            )}
            <span className="mx-2 text-muted-foreground/30">•</span>
            <span>{format(new Date(viewYear, viewMonth), 'MMMM yyyy')}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 rounded-lg shadow-sm border-primary/20 text-primary hover:bg-primary/5 transition-colors"
              onClick={() => setShowTutorial(true)}
              title="Show Tutorial"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-10 w-10 rounded-lg shadow-sm border-primary/20 text-primary hover:bg-primary/5 transition-colors"
                  title="Select Date"
                >
                  <CalendarIcon className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-2xl overflow-hidden mt-2" align="end">
                <CalendarPicker
                  mode="single"
                  selected={new Date(viewYear, viewMonth)}
                  onSelect={handleCalendarSelect}
                  initialFocus
                  captionLayout="dropdown"
                  fromYear={2020}
                  toYear={2035}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button 
            onClick={() => setIsFolderDialogOpen(true)}
            className="h-11 rounded-xl font-bold shadow-lg shadow-primary/10"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search safe by description or category..." 
            className="pl-9 h-12 rounded-xl bg-card border-none shadow-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-10">
        {/* Folders Section */}
        {rootFolders.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <FolderIcon className="w-4 h-4 text-primary" />
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Storage Folders</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {rootFolders.map((folder) => (
                <Card 
                  key={folder.id} 
                  className="group border-none bg-card hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer shadow-sm relative ring-1 ring-black/5"
                  onClick={() => setCurrentFolderId(folder.id)}
                >
                  <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                    <div className="p-4 rounded-2xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-inner">
                      <FolderIcon className="w-8 h-8 fill-current" />
                    </div>
                    <span className="text-xs font-bold truncate w-full px-1">{folder.name}</span>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted transition-all">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem 
                          className="text-destructive font-bold text-xs focus:text-destructive"
                          onClick={() => handleDeleteFolder(folder.id, folder.name)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Folder
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Documents Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {activeFolder ? `Files in ${activeFolder.name}` : 'Recent Vault Documents'}
              </h2>
            </div>
            <Badge variant="secondary" className="bg-primary/5 text-primary text-[10px] font-bold px-3 py-1">
              {filteredExpenses.length} Items Found
            </Badge>
          </div>

          {expensesLoading ? (
            <div className="flex items-center justify-center py-24"><Loader2 className="w-10 h-10 animate-spin text-primary/30" /></div>
          ) : filteredExpenses.length === 0 && rootFolders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-muted/10 rounded-3xl border-2 border-dashed border-muted">
              <Files className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
              <p className="text-sm font-bold text-muted-foreground italic">No matching documents in this view.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredExpenses.map((expense) => {
                const docUri = expense.billImageData || "";
                const isPdf = getDocType(docUri) === 'pdf';
                
                return (
                  <Card key={expense.id} className="border-none shadow-sm ring-1 ring-primary/5 group hover:ring-primary/20 transition-all overflow-hidden bg-card flex flex-col">
                    <div 
                      className="aspect-[3/4] bg-muted/30 relative cursor-pointer overflow-hidden flex items-center justify-center"
                      onClick={() => setSelectedDoc({ data: docUri, type: isPdf ? 'pdf' : 'image' })}
                    >
                      {isPdf ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-6 bg-primary/10 rounded-2xl">
                            <FileText className="w-12 h-12 text-primary" />
                          </div>
                          <span className="text-[10px] uppercase font-bold text-primary tracking-widest">PDF INVOICE</span>
                        </div>
                      ) : docUri ? (
                        <img 
                          src={docUri} 
                          alt={expense.description} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                          <ImageIcon className="w-10 h-10" />
                          <span className="text-[10px] uppercase font-bold">Preview Unavailable</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Button variant="secondary" size="sm" className="rounded-full shadow-lg font-bold">
                          <Eye className="w-4 h-4 mr-2" />
                          Full View
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-4 space-y-3 flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm truncate leading-tight" title={expense.description}>{expense.description}</h4>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Badge variant="secondary" className="bg-primary/5 text-primary text-[9px] py-0 h-5 border-none font-bold uppercase">
                              {expense.category}
                            </Badge>
                            {isPdf && (
                              <Badge variant="outline" className="text-[9px] py-0 h-5 border-primary/20 text-primary uppercase font-bold">
                                PDF
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-sm text-primary">{currency.symbol}{formatAmount(expense.amount)}</div>
                          <div className="text-[9px] font-bold text-muted-foreground flex items-center justify-end gap-1 mt-1 uppercase tracking-tight">
                            <Calendar className="w-2.5 h-2.5" />
                            {format(new Date(expense.date), 'MMM dd')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 pt-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 h-9 text-xs font-bold rounded-lg border-primary/20 text-primary"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
                              Move
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48 rounded-xl">
                            <DropdownMenuLabel className="text-[10px] font-bold uppercase text-muted-foreground">Move to Folder</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => moveExpenseToFolder(expense.id, null)} className="text-xs font-medium">
                              <FolderIcon className="w-3.5 h-3.5 mr-2 opacity-50" /> Main Safe
                            </DropdownMenuItem>
                            {folders.filter(f => f.id !== expense.folderId).map(folder => (
                              <DropdownMenuItem key={folder.id} onClick={() => moveExpenseToFolder(expense.id, folder.id)} className="text-xs font-medium">
                                <FolderIcon className="w-3.5 h-3.5 mr-2 opacity-50" /> {folder.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-9 w-9 rounded-lg border-primary/20 text-primary"
                          title="Download"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = docUri;
                            link.download = `doc-${expense.description.replace(/\s+/g, '-').toLowerCase()}-${expense.date}.${isPdf ? 'pdf' : 'png'}`;
                            link.click();
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteExpense(expense.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Folder Dialog */}
      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
        <DialogContent className="sm:max-w-[400px] p-8 rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl font-headline font-bold text-primary">Create Folder</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">New Folder Name</label>
              <Input 
                placeholder="e.g. Travel Receipts 2026" 
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="h-12 rounded-xl text-sm font-bold shadow-sm"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-14 font-bold rounded-xl shadow-lg" onClick={handleCreateFolder}>Create Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 overflow-hidden bg-background flex flex-col rounded-3xl border-none shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden relative bg-black/5">
            {selectedDoc?.type === 'pdf' ? (
              <iframe 
                src={selectedDoc.data} 
                className="w-full h-full border-none"
                title="PDF Preview"
              />
            ) : selectedDoc?.data ? (
              <div className="w-full h-full flex items-center justify-center p-4">
                <img 
                  src={selectedDoc.data} 
                  alt="Document Preview" 
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
              </div>
            ) : null}

            <div className="absolute top-4 right-4 flex items-center gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                className="rounded-full shadow-lg h-10 px-4 font-bold"
                onClick={() => {
                  if (selectedDoc) {
                    const link = document.createElement('a');
                    link.href = selectedDoc.data;
                    link.download = `document.${selectedDoc.type === 'pdf' ? 'pdf' : 'png'}`;
                    link.click();
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button 
                variant="secondary" 
                size="icon" 
                className="rounded-full shadow-lg h-10 w-10"
                onClick={() => setSelectedDoc(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
