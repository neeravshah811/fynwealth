'use server';
/**
 * @fileOverview A specialized Genkit flow for processing bank statements into structured debit transactions.
 * 
 * - processBankStatement - Extracts cleaned debit transactions with mandatory category mapping.
 * - BankStatementInput - Input containing file URI or raw text.
 * - BankStatementOutput - Return type with summary and categorized transactions for review.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const BankStatementInputSchema = z.object({
  fileDataUri: z
    .string()
    .optional()
    .describe("A bank statement file (PDF or image) as a data URI."),
  rawText: z
    .string()
    .optional()
    .describe("The raw text content of a statement."),
});
export type BankStatementInput = z.infer<typeof BankStatementInputSchema>;

const TransactionSchema = z.object({
  id: z.string().describe('A unique identifier for this transaction (e.g., txn_1).'),
  date: z.string().describe('The date of the transaction in YYYY-MM-DD format.'),
  description: z.string().describe('The cleaned merchant name without transaction IDs, numbers, or codes.'),
  amount: z.number().describe('The absolute numerical value of the debit.'),
  category: z.enum([
    'Education / Kids',
    'Essentials',
    'Financial Commitments',
    'Food and Groceries',
    'Health & Personal',
    'Household & Family',
    'Investments',
    'Life & Entertainment',
    'Warranties',
    'Transportation',
    'Subscriptions',
    'Shopping',
    'Personal',
    'Miscellaneous'
  ]).describe('One of the mandatory categories.'),
  confidence: z.number().min(0).max(1).describe('The confidence level of the extraction and classification.'),
  status: z.literal('pending').describe('All transactions must start as pending.'),
  actions: z.object({
    canEdit: z.boolean().default(true),
    canApprove: z.boolean().default(true),
    canReject: z.boolean().default(true)
  })
});

const BankStatementOutputSchema = z.object({
  summary: z.object({
    totalTransactions: z.number(),
    totalExpense: z.number()
  }).describe('Aggregated totals for the processed debit transactions.'),
  review: z.object({
    editable: z.boolean().default(true),
    bulkActions: z.object({
      approveAll: z.boolean().default(true),
      rejectAll: z.boolean().default(true)
    }),
    instructions: z.string()
  }),
  transactions: z.array(TransactionSchema).describe('List of structured debit transactions for review.'),
});
export type BankStatementOutput = z.infer<typeof BankStatementOutputSchema>;

export async function processBankStatement(input: BankStatementInput): Promise<BankStatementOutput> {
  return processBankStatementFlow(input);
}

const prompt = ai.definePrompt({
  name: 'processBankStatementPrompt',
  input: { schema: BankStatementInputSchema },
  output: { schema: BankStatementOutputSchema },
  prompt: `You are the transaction processing engine for the FynWealth app.
Your task is to process bank transactions and return structured DEBIT entries for user review.

STRICT PROCESSING RULES:
1. ONLY include transactions where DEBIT > 0. 
   - Debits may be in columns labeled "Withdrawal", "Debit", "DR", "Out", or shown as negative values.
   - If a transaction is a "Credit", "Deposit", "CR", or "In", IGNORE IT.
2. IGNORE: Salary entries, refunds, interest credits, and deposits.
3. Remove exact duplicates (same date + amount + description).
4. Description Cleaning: Remove transaction IDs, numbers, and codes (like UPI IDs or reference numbers). Keep only the meaningful merchant name in a readable format.
   Example: "UPI-SWIGGY-12345-BLR" → "Swiggy"

CATEGORY RULES (MANDATORY):
Assign ONLY one category from this specific list:
- Food and Groceries: swiggy, zomato, restaurant, cafe, blinkit, bigbasket, dmart, grocery, dining
- Shopping: amazon, flipkart, myntra, clothes, fashion
- Transportation: uber, ola, irctc, fuel, petrol, shell
- Essentials: electricity, recharge, airtel, jio, water, gas
- Subscriptions: netflix, spotify, youtube, prime, hotstar
- Health & Personal: pharmacy, apollo, 1mg, gym, cult.fit, doctor
- Financial Commitments: emi, nach, loan, lic, insurance, policy, premium
- Investments: sip, mutual fund, zerodha, groww, stocks, upstox
- Education / Kids: school, fees, tuition, books
- Life & Entertainment: movies, pvr, trips, travel bookings, events
- Household & Family: repairs, helper, maid, pets
- Warranties: electronics protection, extended warranty
- Personal: personal care, salon, spa
- Miscellaneous: If unsure or generic (upi, imps, neft, bank transfer without merchant)

OUTPUT BEHAVIOR:
- ALL transactions status = "pending".
- Return valid JSON only. NO explanations.

Statement Data:
{{#if fileDataUri}}{{media url=fileDataUri}}{{/if}}
{{#if rawText}}
Raw Text Content:
{{{rawText}}}
{{/if}}`,
});

const processBankStatementFlow = ai.defineFlow(
  {
    name: 'processBankStatementFlow',
    inputSchema: BankStatementInputSchema,
    outputSchema: BankStatementOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
