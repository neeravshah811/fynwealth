
'use server';
/**
 * @fileOverview A specialized Genkit flow for processing bank statements into structured debit transactions.
 * 
 * - processBankStatement - Extracts cleaned debit transactions with mandatory category mapping.
 * - BankStatementInput - Input containing file URI or raw text.
 * - BankStatementOutput - Return type with summary and categorized transactions.
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
  date: z.string().describe('The date of the transaction in YYYY-MM-DD format.'),
  description: z.string().describe('The cleaned merchant name without transaction IDs or codes.'),
  amount: z.number().describe('The absolute numerical value of the debit.'),
  category: z.enum([
    'Food & Dining',
    'Groceries',
    'Shopping',
    'Travel',
    'Bills & Utilities',
    'Rent',
    'Entertainment',
    'Health & Fitness',
    'Subscriptions',
    'Transfers',
    'EMI & Loans',
    'Insurance',
    'Investments',
    'Miscellaneous'
  ]).describe('One of the mandatory categories.'),
  confidence: z.number().min(0).max(1).describe('The confidence level of the extraction and classification.'),
});

const BankStatementOutputSchema = z.object({
  summary: z.object({
    totalTransactions: z.number(),
    totalExpense: z.number()
  }).describe('Aggregated totals for the processed debit transactions.'),
  transactions: z.array(TransactionSchema).describe('List of structured debit transactions.'),
});
export type BankStatementOutput = z.infer<typeof BankStatementOutputSchema>;

export async function processBankStatement(input: BankStatementInput): Promise<BankStatementOutput> {
  return processBankStatementFlow(input);
}

const prompt = ai.definePrompt({
  name: 'processBankStatementPrompt',
  input: { schema: BankStatementInputSchema },
  output: { schema: BankStatementOutputSchema },
  prompt: `You are a financial data processing engine for the FynWealth app.
Your task is to process uploaded bank statement data and return structured expense transactions.

STRICT RULES:
1. ONLY process DEBIT transactions. Ignore all CREDIT entries (salary, refunds, interest, deposits, etc).
2. Extract and normalize each transaction into the requested format.
3. Category mapping (MANDATORY): Map every transaction into EXACTLY ONE of these categories:
   - Food & Dining
   - Groceries
   - Shopping
   - Travel
   - Bills & Utilities
   - Rent
   - Entertainment
   - Health & Fitness
   - Subscriptions
   - Transfers
   - EMI & Loans
   - Insurance
   - Investments
   - Miscellaneous

4. Smart classification rules:
   - Swiggy, Zomato, Starbucks, McDonald's → Food & Dining
   - Blinkit, BigBasket, Dmart, Zepto, MilkBasket → Groceries
   - Amazon, Flipkart, Myntra, Ajio, Nykaa → Shopping
   - Uber, Ola, IRCTC, Petrol, Diesel, Indigo, Air India → Travel
   - Electricity, Gas, Water, Mobile recharge, Broadband, WiFi → Bills & Utilities
   - Netflix, Spotify, YouTube, Prime, Disney+ → Subscriptions
   - Gym, Cult.fit, Pharmacy, Medical, Doctor → Health & Fitness
   - Bank transfer to person, UPI to friend → Transfers
   - EMI, NACH, Loan payment, Mortgage → EMI & Loans
   - Insurance premium, LIC, ICICI Lombard → Insurance
   - Mutual fund, Zerodha, Groww, Stocks, SIP → Investments

5. Clean description: Remove transaction IDs, reference numbers, and IFSC codes. Keep only the meaningful merchant name (e.g., "Amazon" instead of "AMZN*123456789-BLR").
6. Remove exact duplicates if they occur on the same date with the same amount.
7. Return valid JSON only. DO NOT include explanations.

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
