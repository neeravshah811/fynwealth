'use server';
/**
 * @fileOverview Bank Statement Processing Engine - Processes debit-only transactions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const BankStatementInputSchema = z.object({
  fileDataUri: z.string().optional().describe("File as a data URI."),
  rawText: z.string().optional().describe("Raw text content."),
});
export type BankStatementInput = z.infer<typeof BankStatementInputSchema>;

const TransactionSchema = z.object({
  id: z.string(),
  date: z.string(),
  description: z.string(),
  amount: z.number(),
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
  ]),
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

export async function processBankStatement(input: BankStatementInput): Promise<BankStatementOutput> {
  return processBankStatementFlow(input);
}

const prompt = ai.definePrompt({
  name: 'processBankStatementPrompt',
  input: { schema: BankStatementInputSchema },
  output: { schema: BankStatementOutputSchema },
  prompt: `You are the transaction processing engine for FynWealth.
Process bank data and return ONLY structured DEBIT entries.

STRICT RULES:
1. ONLY include DEBIT > 0. IGNORE Credits, Salary, Refunds, Interest.
2. CATEGORIES (Mandatory): Assign one from the list: Food and Groceries, Shopping, Transportation, Essentials, Subscriptions, Health & Personal, Financial Commitments, Investments, Education / Kids, Life & Entertainment, Household & Family, Warranties, Personal, Miscellaneous.
3. CLEAN Description: Remove transaction IDs and codes. Keep clean merchant names (e.g., "Swiggy" not "UPI-SWIGGY-1234").
4. No duplicates. ALL status = "pending". ALL actions (canEdit, canApprove, canReject) should be set to true.

Statement Data:
{{#if fileDataUri}}{{media url=fileDataUri}}{{/if}}
{{#if rawText}}{{{rawText}}}{{/if}}`,
});

const processBankStatementFlow = ai.defineFlow(
  {
    name: 'processBankStatementFlow',
    inputSchema: BankStatementInputSchema,
    outputSchema: BankStatementOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await prompt(input);
      if (!output) throw new Error("No output generated from AI");
      return output;
    } catch (err: any) {
      console.error("[processBankStatementFlow] Error:", err.message);
      if (err.message.includes('429')) throw new Error('AI Quota Exceeded. Please try again in a few seconds.');
      if (err.message.includes('Invalid JSON payload')) throw new Error('AI Schema Mismatch. Please contact support.');
      throw new Error('Failed to process statement. Please try again later.');
    }
  }
);
