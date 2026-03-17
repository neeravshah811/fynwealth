
'use client';

import { useFirestore } from '@/firebase';
import { collection, query, getDocs, orderBy, limit, startAfter, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Eye, 
  Trash2, 
  ChevronRight, 
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
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasNext, setHasNext] = useState(true);
  const [filter, setFilter] = useState<'newest' | 'active'>('newest');

  const fetchUsers = async (isNext = false) => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      let q = query(
        usersRef, 
        orderBy(filter === 'newest' ? 'createdAt' : 'lastActive', 'desc'), 
        limit(10)
      );

      if (isNext && lastDoc) {
        q = query(
          usersRef, 
          orderBy(filter === 'newest' ? 'createdAt' : 'lastActive', 'desc'), 
          startAfter(lastDoc), 
          limit(10)
        );
      }

      const snapshot = await getDocs(q);
      const fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (isNext) {
        setUsers(prev => [...prev, ...fetchedUsers]);
      } else {
        setUsers(fetchedUsers);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasNext(snapshot.docs.length === 10);
    } catch (error: any) {
      const permissionError = new FirestorePermissionError({
        path: 'users',
        operation: 'list',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      toast({ variant: "destructive", title: "Query Failed", description: "Could not retrieve user list." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const handleDeleteUser = async (userId: string) => {
    try {
      const userToDelete = users.find(u => u.id === userId);
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
      
      setUsers(users.filter(u => u.id !== userId));
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
    return users.filter(u => 
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id.includes(searchTerm)
    );
  }, [users, searchTerm]);

  const safeFormatDate = (dateValue: any, formatStr: string = 'MMM dd, yyyy') => {
    if (!dateValue) return 'N/A';
    
    let date: Date;
    if (typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    } else {
      date = new Date(dateValue);
    }

    return isValid(date) ? format(date, formatStr) : 'N/A';
  };

  const formatLastActive = (dateValue: any) => {
    if (!dateValue) return 'N/A';
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
          <p className="text-sm text-muted-foreground">Manage and monitor all application accounts.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-11 rounded-xl bg-white shadow-sm border-black/5 font-bold">
            <Filter className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button className="h-11 rounded-xl shadow-lg shadow-primary/20 font-bold">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Admin
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
                <TableHead className="text-[10px] uppercase font-bold tracking-widest text-center">Stats</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-widest text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/10 border-b border-black/5">
                  <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm uppercase">
                        {user.name?.[0] || user.email?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm leading-none mb-1 truncate">{user.name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
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
                      <Button variant="outline" size="icon" className="w-9 h-9 rounded-xl border-black/5 shadow-sm" asChild title="View Details">
                        <Link href={`/admin-dashboard/users/${user.id}`}>
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </Link>
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" className="w-9 h-9 rounded-xl border-black/5 shadow-sm hover:bg-destructive/5 hover:border-destructive/20 group">
                            <Trash2 className="w-4 h-4 text-muted-foreground group-hover:text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User Record?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the user's document and stats from the database. <strong>The user will also be blacklisted and barred from logging in again.</strong> This action is permanent.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl h-11">Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteUser(user.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl h-11"
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
              {filteredUsers.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic text-sm">
                    No users found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {hasNext && (
            <div className="p-6 flex justify-center border-t border-black/5">
              <Button 
                variant="ghost" 
                onClick={() => fetchUsers(true)} 
                disabled={loading}
                className="text-primary font-bold text-xs uppercase tracking-widest hover:bg-primary/5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ChevronRight className="w-4 h-4 mr-2" />}
                Load More Users
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
