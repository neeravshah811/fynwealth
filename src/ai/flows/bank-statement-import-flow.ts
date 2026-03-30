'use server';
/**
 * @fileOverview Manual Bank Statement Processing Engine.
 * Deterministic parsing and categorization without AI.
 */

import { z } from 'zod';

const BankStatementInputSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  transactions: z.array(z.object({
    date: z.string(),
    description: z.string(),
    amount: z.number(),
    type: z.enum(['debit', 'credit']),
  })),
});
export type BankStatementInput = z.infer<typeof BankStatementInputSchema>;

const TransactionSchema = z.object({
  id: z.string(),
  date: z.string(),
  description: z.string(),
  amount: z.number(),
  category: z.string(),
  confidence: z.number(),
  status: z.enum(['pending']),
  actions: z.object({
    canEdit: z.boolean(),
    canApprove: z.boolean(),
    canReject: z.boolean()
  })
});

const BankStatementOutputSchema = z.object({
  summary: z.object({
    totalTransactions: z.number(),
    totalExpense: z.number()
  }),
  review: z.object({
    editable: z.boolean(),
    bulkActions: z.object({
      approveAll: z.boolean(),
      rejectAll: z.boolean()
    }),
    instructions: z.string()
  }),
  transactions: z.array(TransactionSchema),
});
export type BankStatementOutput = z.infer<typeof BankStatementOutputSchema>;

/**
 * Manual Categorization Logic (Deterministic)
 */
function getCategory(description: string): string {
  const d = description.toLowerCase();
  
  if (d.includes('swiggy') || d.includes('zomato') || d.includes('restaurant') || d.includes('cafe') || d.includes('eat') || d.includes('food')) return 'Food and Groceries';
  if (d.includes('blinkit') || d.includes('bigbasket') || d.includes('dmart') || d.includes('grocery') || d.includes('reliance fresh') || d.includes('spencer')) return 'Food and Groceries';
  
  if (d.includes('amazon') || d.includes('flipkart') || d.includes('myntra') || d.includes('nykaa') || d.includes('shopping') || d.includes('ajio')) return 'Shopping';
  
  if (d.includes('uber') || d.includes('ola') || d.includes('irctc') || d.includes('fuel') || d.includes('petrol') || d.includes('taxi') || d.includes('travel') || d.includes('metro') || d.includes('indigo') || d.includes('airindia')) return 'Transportation';
  
  if (d.includes('electricity') || d.includes('recharge') || d.includes('airtel') || d.includes('jio') || d.includes('vodafone') || d.includes('water') || d.includes('gas') || d.includes('utility') || d.includes('bill')) return 'Essentials';
  
  if (d.includes('netflix') || d.includes('spotify') || d.includes('youtube') || d.includes('apple') || d.includes('prime') || d.includes('disney') || d.includes('hotstar')) return 'Subscriptions';
  
  if (d.includes('pharmacy') || d.includes('apollo') || d.includes('1mg') || d.includes('gym') || d.includes('cult.fit') || d.includes('doctor') || d.includes('hospital') || d.includes('medicine') || d.includes('health')) return 'Health & Personal';
  
  if (d.includes('emi') || d.includes('nach') || d.includes('loan') || d.includes('lic') || d.includes('insurance') || d.includes('policy') || d.includes('premium')) return 'Financial Commitments';
  
  if (d.includes('sip') || d.includes('mutual fund') || d.includes('zerodha') || d.includes('groww') || d.includes('stocks') || d.includes('equity') || d.includes('upstox') || d.includes('angelone')) return 'Investments';
  
  if (d.includes('school') || d.includes('tuition') || d.includes('fees') || d.includes('udemy') || d.includes('coursera') || d.includes('education')) return 'Education / Kids';
  
  if (d.includes('movies') || d.includes('pvr') || d.includes('inox') || d.includes('bookmyshow') || d.includes('events') || d.includes('travel') || d.includes('trip') || d.includes('holiday') || d.includes('gift')) return 'Life & Entertainment';
  
  if (d.includes('repair') || d.includes('maid') || d.includes('laundry') || d.includes('pet') || d.includes('urban company') || d.includes('cleaning')) return 'Household & Family';
  
  if (d.includes('apple store') || d.includes('croma') || d.includes('vijay sales') || d.includes('hardware')) return 'Warranties';

  return 'Miscellaneous';
}

/**
 * Clean Description (Deterministic)
 */
function cleanDescription(description: string): string {
  // Remove common transaction IDs, reference numbers, etc.
  return description
    .replace(/\d{5,}/g, '') // Remove long numbers
    .replace(/UPI\//gi, '')
    .replace(/IMPS\//gi, '')
    .replace(/NEFT\//gi, '')
    .replace(/RTGS\//gi, '')
    .replace(/TRANSFER\//gi, '')
    .replace(/-BLR|-MUM|-DEL|-HYD|-CHE/gi, '') // Common city codes
    .replace(/\s+/g, ' ')
    .trim();
}

export async function processBankStatementManual(input: BankStatementInput): Promise<BankStatementOutput> {
  const { userId, transactions } = input;
  
  if (!userId) {
    throw new Error("Missing required User ID for statement processing.");
  }

  // Filter ONLY debits
  const debitsOnly = transactions.filter(t => t.type === "debit");

  if (debitsOnly.length === 0) {
    // If absolutely no debits found, provide more context in the error
    throw new Error("No debit transactions found in statement. Please ensure your file contains expenses.");
  }

  const finalTransactions = debitsOnly.map((t, idx) => {
    const cleanedDesc = cleanDescription(t.description);
    return {
      id: `txn_${idx}_${Date.now()}`,
      date: t.date,
      description: cleanedDesc || t.description,
      amount: Math.abs(t.amount),
      category: getCategory(cleanedDesc || t.description),
      confidence: 1.0, // Manual code is 100% deterministic
      status: "pending" as const,
      actions: { canEdit: true, canApprove: true, canReject: true }
    };
  });

  return {
    summary: {
      totalTransactions: finalTransactions.length,
      totalExpense: finalTransactions.reduce((s, t) => s + t.amount, 0)
    },
    review: {
      editable: true,
      bulkActions: { approveAll: true, rejectAll: true },
      instructions: "Manual rule-based parsing applied. Review and save."
    },
    transactions: finalTransactions,
  };
}