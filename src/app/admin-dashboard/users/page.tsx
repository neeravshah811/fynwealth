'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useState, useMemo } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Eye, 
  Trash2, 
  Loader2, 
  UserPlus, 
  Filter,
  Activity
} from 'lucide-react';
import { format, isValid, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function UserManagementPage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'newest' | 'active'>('newest');

  // Real-time query for users
  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'users'),
      orderBy(filter === 'newest' ? 'createdAt' : 'lastActive', 'desc'),
      limit(50)
    );
  }, [db, filter]);

  const { data: users, isLoading } = useCollection(usersQuery);

  const handleDeleteUser = async (userId: string) => {
    try {
      const userToDelete = users?.find(u => u.id === userId);
      const userDocRef = doc(db, 'users', userId);
      const blacklistRef = doc(db, 'blacklist', userId);
      
      const batch = writeBatch(db);
      
      // Delete user profile
      batch.delete(userDocRef);
      
      // Blacklist UID to prevent re-login
      batch.set(blacklistRef, {
        uid: userId,
        email: userToDelete?.email || 'unknown',
        deletedAt: serverTimestamp(),
        reason: 'Administrative action'
      });
      
      await batch.commit();
      toast({ title: "User Deleted & Banned", description: "User removed and barred from logging in again." });
    } catch (error: any) {
      const permissionError = new FirestorePermissionError({
        path: `users/${userId}`,
        operation: 'delete',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      toast({ variant: "destructive", title: "Error", description: "Could not complete user deletion." });
    }
  };

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => 
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id.includes(searchTerm)
    );
  }, [users, searchTerm]);

  const handleExportCSV = () => {
    if (!filteredUsers || filteredUsers.length === 0) {
      toast({ variant: "destructive", title: "Export Failed", description: "No user data available to export." });
      return;
    }

    const headers = ["UID", "Name", "Email", "Signup Date", "Last Active", "Total Expenses", "Total Reminders"];
    const rows = filteredUsers.map(u => [
      u.id,
      u.name || "N/A",
      u.email,
      u.createdAt ? format(new Date(u.createdAt.toDate ? u.createdAt.toDate() : u.createdAt), 'yyyy-MM-dd') : "Legacy",
      u.lastActive ? format(new Date(u.lastActive.toDate ? u.lastActive.toDate() : u.lastActive), 'yyyy-MM-dd HH:mm') : "Never",
      u.stats?.totalExpenses || 0,
      u.stats?.totalReminders || 0
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `fynwealth-users-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Export Complete", description: "User list has been downloaded." });
  };

  const safeFormatDate = (dateValue: any, formatStr: string = 'MMM dd, yyyy') => {
    if (!dateValue) return 'Legacy Account';
    
    let date: Date;
    if (typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    } else {
      date = new Date(dateValue);
    }

    return isValid(date) ? format(date, formatStr) : 'N/A';
  };

  const formatLastActive = (dateValue: any) => {
    if (!dateValue) return 'Never';
    let date: Date;
    if (typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    } else {
      date = new Date(dateValue);
    }
    return isValid(date) ? formatDistanceToNow(date, { addSuffix: true }) : 'N/A';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground">Monitor live account growth and financial engagement.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="h-11 rounded-xl bg-white shadow-sm border-black/5 font-bold"
            onClick={handleExportCSV}
          >
            <Filter className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button className="h-11 rounded-xl shadow-lg shadow-primary/20 font-bold" asChild>
            <Link href="/admin-dashboard/settings">
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Admin
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm ring-1 ring-black/5 bg-white dark:bg-card">
        <CardHeader className="pb-0 pt-6 px-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, email or UID..." 
                className="pl-10 h-11 bg-muted/30 border-none rounded-xl text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={filter === 'newest' ? 'default' : 'ghost'} 
                size="sm" 
                className="rounded-lg font-bold text-[10px] uppercase tracking-wider h-11 px-4"
                onClick={() => setFilter('newest')}
              >
                Newest
              </Button>
              <Button 
                variant={filter === 'active' ? 'default' : 'ghost'} 
                size="sm" 
                className="rounded-lg font-bold text-[10px] uppercase tracking-wider h-11 px-4"
                onClick={() => setFilter('active')}
              >
                Recently Active
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-black/5">
                <TableHead className="text-[10px] uppercase font-bold tracking-widest pl-6">User Identity</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-widest">Last Active</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-widest">Signup Date</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-widest text-center">Live Stats</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-widest text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary/30" />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/10 border-b border-black/5 group">
                  <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/5 text-primary flex items-center justify-center font-bold text-sm uppercase border border-primary/10">
                        {user.name?.[0] || user.email?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm leading-none mb-1 truncate">{user.name || 'N/A'}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Activity className="w-3 h-3 text-emerald-500" />
                      <span className="text-xs font-medium">{formatLastActive(user.lastActive)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-medium">
                      {safeFormatDate(user.createdAt)}
                    </p>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-primary">{user.stats?.totalExpenses || 0}</p>
                        <p className="text-[8px] uppercase font-bold text-muted-foreground tracking-tighter">Exp</p>
                      </div>
                      <div className="w-px h-6 bg-black/5" />
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-amber-600">{user.stats?.totalReminders || 0}</p>
                        <p className="text-[8px] uppercase font-bold text-muted-foreground tracking-tighter">Bills</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" className="w-9 h-9 rounded-xl border-black/5 shadow-sm hover:bg-primary/5 hover:border-primary/20 transition-all" asChild title="View Details">
                        <Link href={`/admin-dashboard/users/${user.id}`}>
                          <Eye className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                        </Link>
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" className="w-9 h-9 rounded-xl border-black/5 shadow-sm hover:bg-destructive/5 hover:border-destructive/20 group transition-all">
                            <Trash2 className="w-4 h-4 text-muted-foreground group-hover:text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[24px] p-8 border-none shadow-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-headline font-bold">Delete User Record?</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm mt-2">
                              This will remove the user's profile and data. <strong>The user will be blacklisted and permanently barred from re-registering or logging in.</strong>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="mt-8">
                            <AlertDialogCancel className="rounded-xl h-12 font-bold">Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteUser(user.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl h-12 font-bold"
                            >
                              Confirm Delete & Ban
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic text-sm">
                    No users found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
