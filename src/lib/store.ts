
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SUPPORTED_CURRENCIES } from "./constants";
import { format } from "date-fns";

export { SUPPORTED_CURRENCIES, SYSTEM_CATEGORIES } from "./constants";

export type Frequency = 'One-time' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Half-yearly' | 'Annually';

export type Currency = {
  code: string;
  symbol: string;
  name: string;
};

export interface Folder {
  id: string;
  name: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  subCategory?: string;
  description: string;
  date: string;
  status: 'paid' | 'unpaid';
  isRecurring?: boolean;
  frequency?: Frequency;
  reminderDate?: string;
  reminderTime?: string;
  productName?: string;
  purchaseDate?: string;
  warrantyExpiryDate?: string;
  invoiceUrl?: string;
  billImageData?: string; // Base64 data URI of the scanned bill
  serviceCenterContact?: string;
  notes?: string;
  billId?: string; // Linked bill ID
  folderId?: string | null; // Folder association
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  dueTime: string;
  createdAt: string;
  frequency: Frequency;
  category: string;
  subCategory?: string;
  notes?: string;
  status: 'pending' | 'paid';
  notified?: boolean;
  billImageData?: string;
}

export interface Budget {
  category: string;
  limit: number;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
}

export interface AIInsights {
  predictions: any | null;
  unnecessary: any | null;
  lastGenerated: string | null;
}

interface FynWealthState {
  expenses: Expense[];
  bills: Bill[];
  folders: Folder[];
  budgets: Budget[];
  currency: Currency;
  profile: UserProfile | null;
  customCategories: Record<string, string[]>;
  insights: AIInsights;
  viewMonth: number;
  viewYear: number;
  privacyMode: boolean;
  hasSeenTutorial: boolean;
  addExpense: (expense: Omit<Expense, 'id' | 'status'> & { status?: 'paid' | 'unpaid' }) => void;
  addExpenses: (expenses: (Omit<Expense, 'id' | 'status'> & { status?: 'paid' | 'unpaid' })[]) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  toggleExpenseStatus: (id: string) => void;
  addBill: (bill: Omit<Bill, 'id' | 'status' | 'createdAt'>) => void;
  deleteBill: (id: string) => void;
  markBillPaid: (id: string) => void;
  markBillNotified: (id: string) => void;
  updateBudget: (category: string, limit: number) => void;
  setCurrency: (code: string) => void;
  updateProfile: (profile: UserProfile) => void;
  addCustomCategory: (name: string) => void;
  addCustomSubCategory: (parent: string, name: string) => void;
  addFolder: (name: string) => void;
  deleteFolder: (id: string) => void;
  moveExpenseToFolder: (expenseId: string, folderId: string | null) => void;
  setViewDate: (month: number, year: number) => void;
  setInsights: (insights: Partial<AIInsights>) => void;
  togglePrivacyMode: () => void;
  setHasSeenTutorial: (seen: boolean) => void;
  rolloverRecurring: () => void;
  clearMonthlyExpenses: () => void;
  clearAllData: () => void;
}

export const useFynWealthStore = create<FynWealthState>()(
  persist(
    (set, get) => ({
      expenses: [],
      bills: [],
      folders: [],
      budgets: [],
      currency: SUPPORTED_CURRENCIES[0],
      profile: null,
      customCategories: {},
      insights: {
        predictions: null,
        unnecessary: null,
        lastGenerated: null,
      },
      viewMonth: new Date().getMonth(),
      viewYear: new Date().getFullYear(),
      privacyMode: false,
      hasSeenTutorial: false,
      addExpense: (expense) => {
        const id = Math.random().toString(36).substring(7);
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        
        const status = expense.status || (expense.date <= todayStr ? 'paid' : 'unpaid');

        set((state) => ({
          expenses: [
            ...state.expenses, 
            { 
              ...expense, 
              id,
              status,
              folderId: expense.folderId ?? null // Explicitly initialize as null if undefined
            }
          ]
        }));

        if (expense.isRecurring && expense.frequency) {
          const date = new Date(expense.date);
          if (expense.frequency === 'Monthly') date.setMonth(date.getMonth() + 1);
          else if (expense.frequency === 'Weekly') date.setDate(date.getDate() + 7);
          else if (expense.frequency === 'Quarterly') date.setMonth(date.getMonth() + 3);
          else if (expense.frequency === 'Half-yearly') date.setMonth(date.getMonth() + 6);
          else if (expense.frequency === 'Annually') date.setFullYear(date.getFullYear() + 1);
          
          const nextDateStr = format(date, 'yyyy-MM-dd');

          get().addBill({
            name: expense.description || `${expense.category} Recurring`,
            amount: expense.amount,
            dueDate: nextDateStr,
            dueTime: expense.reminderTime || "09:00",
            frequency: expense.frequency,
            category: expense.category,
            subCategory: expense.subCategory,
            notes: expense.notes,
            billImageData: expense.billImageData
          });
        }
      },
      addExpenses: (newExpenses) => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        set((state) => ({
          expenses: [
            ...state.expenses,
            ...newExpenses.map(exp => ({
              ...exp,
              id: Math.random().toString(36).substring(7),
              status: exp.status || (exp.date <= todayStr ? 'paid' : 'unpaid'),
              folderId: exp.folderId ?? null
            }))
          ]
        }));
      },
      updateExpense: (id, updatedFields) => set((state) => {
        const expense = state.expenses.find(e => e.id === id);
        const newExpenses = state.expenses.map((e) => e.id === id ? { ...e, ...updatedFields } : e);
        
        let newBills = state.bills;
        if (expense?.billId) {
          newBills = state.bills.map(b => b.id === expense.billId ? { 
            ...b, 
            amount: updatedFields.amount !== undefined ? updatedFields.amount : b.amount,
            name: updatedFields.description !== undefined ? updatedFields.description : b.name,
            dueDate: updatedFields.date !== undefined ? updatedFields.date : b.dueDate,
            category: updatedFields.category !== undefined ? updatedFields.category : b.category,
            subCategory: updatedFields.subCategory !== undefined ? updatedFields.subCategory : b.subCategory,
            billImageData: updatedFields.billImageData !== undefined ? updatedFields.billImageData : b.billImageData,
          } : b);
        }

        return { 
          expenses: newExpenses,
          bills: newBills
        };
      }),
      deleteExpense: (id) => set((state) => ({
        expenses: state.expenses.filter((e) => e.id !== id)
      })),
      toggleExpenseStatus: (id) => set((state) => ({
        expenses: state.expenses.map((e) => 
          e.id === id ? { ...e, status: e.status === 'paid' ? 'unpaid' : 'paid' } : e
        )
      })),
      addBill: (bill) => {
        const billId = Math.random().toString(36).substring(7);
        const expenseId = Math.random().toString(36).substring(7);
        
        set((state) => ({
          bills: [
            ...state.bills,
            {
              ...bill,
              id: billId,
              status: 'pending',
              notified: false,
              createdAt: new Date().toISOString()
            }
          ],
          expenses: [
            ...state.expenses,
            {
              id: expenseId,
              billId: billId,
              amount: bill.amount,
              description: bill.name,
              category: bill.category,
              subCategory: bill.subCategory,
              date: bill.dueDate,
              status: 'unpaid',
              notes: bill.notes,
              reminderTime: bill.dueTime,
              billImageData: bill.billImageData,
              folderId: null // Initialize Root for bill-linked expenses
            }
          ]
        }));
      },
      deleteBill: (id) => set((state) => ({
        bills: state.bills.filter((b) => b.id !== id),
        expenses: state.expenses.filter((e) => e.billId !== id)
      })),
      markBillPaid: (id) => set((state) => ({
        bills: state.bills.map((b) => 
          b.id === id ? { ...b, status: 'paid' } : b
        ),
        expenses: state.expenses.map((e) => 
          e.billId === id ? { ...e, status: 'paid' } : e
        )
      })),
      markBillNotified: (id) => set((state) => ({
        bills: state.bills.map((b) => b.id === id ? { ...b, notified: true } : b)
      })),
      updateBudget: (category, limit) => set((state) => {
        const budgets = [...state.budgets];
        const index = budgets.findIndex((b) => b.category === category);
        if (index !== -1) {
          budgets[index] = { ...budgets[index], limit };
        } else {
          budgets.push({ category, limit });
        }
        return { budgets };
      }),
      setCurrency: (code) => set((state) => ({
        currency: SUPPORTED_CURRENCIES.find(c => c.code === code) || state.currency
      })),
      updateProfile: (profile) => set({ profile }),
      addCustomCategory: (name) => set((state) => ({
        customCategories: { ...state.customCategories, [name]: [] }
      })),
      addCustomSubCategory: (parent, name) => set((state) => ({
        customCategories: { 
          ...state.customCategories, 
          [parent]: [...(state.customCategories[parent] || []), name] 
        }
      })),
      addFolder: (name) => set((state) => ({
        folders: [
          ...state.folders,
          {
            id: Math.random().toString(36).substring(7),
            name,
            createdAt: new Date().toISOString()
          }
        ]
      })),
      deleteFolder: (id) => set((state) => ({
        folders: state.folders.filter((f) => f.id !== id),
        expenses: state.expenses.map((e) => e.folderId === id ? { ...e, folderId: null } : e)
      })),
      moveExpenseToFolder: (expenseId, folderId) => set((state) => ({
        expenses: state.expenses.map((e) => e.id === expenseId ? { ...e, folderId } : e)
      })),
      setViewDate: (month, year) => set({ viewMonth: month, viewYear: year }),
      setInsights: (newInsights) => set((state) => ({
        insights: { ...state.insights, ...newInsights, lastGenerated: new Date().toISOString() }
      })),
      togglePrivacyMode: () => set((state) => ({ privacyMode: !state.privacyMode })),
      setHasSeenTutorial: (seen) => set({ hasSeenTutorial: seen }),
      rolloverRecurring: () => {
        const state = get();
        const { expenses, viewMonth, viewYear } = state;
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        
        const recurringTemplates = expenses.filter(e => e.isRecurring && e.frequency === 'Monthly');
        
        if (recurringTemplates.length === 0) return;

        const uniqueTemplates = recurringTemplates.reduce((acc, curr) => {
          const key = `${curr.category}-${curr.description}`;
          if (!acc[key] || new Date(curr.date) > new Date(acc[key].date)) {
            acc[key] = curr;
          }
          return acc;
        }, {} as Record<string, Expense>);

        const existingInView = expenses.filter(e => {
          const d = new Date(e.date);
          return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
        }).map(e => `${e.category}-${e.description}`);

        const newEntries: Omit<Expense, 'id'>[] = Object.values(uniqueTemplates)
          .filter(t => !existingInView.includes(`${t.category}-${t.description}`))
          .map(t => {
            const originalDay = new Date(t.date).getDate();
            const lastDayOfViewMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
            const safeDay = Math.min(originalDay, lastDayOfViewMonth);
            
            const newDate = new Date(viewYear, viewMonth, safeDay);
            const newDateStr = format(newDate, 'yyyy-MM-dd');
            
            return {
              ...t,
              date: newDateStr,
              status: newDateStr <= todayStr ? 'paid' : 'unpaid',
              reminderDate: newDateStr,
              reminderTime: t.reminderTime || "09:00",
              folderId: t.folderId ?? null
            };
          });

        if (newEntries.length > 0) {
          state.addExpenses(newEntries as any);
        }
      },
      clearMonthlyExpenses: () => set((state) => ({
        expenses: state.expenses.filter((e) => {
          const d = new Date(e.date);
          return !(d.getMonth() === state.viewMonth && d.getFullYear() === state.viewYear);
        })
      })),
      clearAllData: () => set({ 
        expenses: [], 
        bills: [],
        folders: [],
        budgets: [], 
        customCategories: {}, 
        profile: null, 
        privacyMode: false,
        hasSeenTutorial: false,
        insights: {
          predictions: null,
          unnecessary: null,
          lastGenerated: null,
        },
        viewMonth: new Date().getMonth(), 
        viewYear: new Date().getFullYear() 
      }),
    }),
    {
      name: 'fynwealth_persistent_storage_v3',
    }
  )
);
