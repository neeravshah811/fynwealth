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
  status: z.literal('pending'),
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
  }),
  review: z.object({
    editable: z.boolean().default(true),
    bulkActions: z.object({
      approveAll: z.boolean().default(true),
      rejectAll: z.boolean().default(true)
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
4. No duplicates. ALL status = "pending".

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
      return output!;
    } catch (err: any) {
      if (err.message.includes('429')) throw new Error('AI Quota Exceeded. Please try again in a few seconds.');
      throw err;
    }
  }
);
