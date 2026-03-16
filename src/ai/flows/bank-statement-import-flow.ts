'use server';
/**
 * @fileOverview A Genkit flow to extract and categorize transactions from a bank statement.
 *
 * - processBankStatement - A function that handles the statement parsing process.
 * - BankStatementInput - The input type for the processBankStatement function.
 * - BankStatementOutput - The return type for the processBankStatement function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const BankStatementInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "A bank statement file (PDF or image), as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  categories: z.array(z.string()).describe("A list of valid expense categories to use for classification."),
});
export type BankStatementInput = z.infer<typeof BankStatementInputSchema>;

const TransactionSchema = z.object({
  date: z.string().describe('The date of the transaction in YYYY-MM-DD format.'),
  description: z.string().describe('The merchant name or transaction description.'),
  amount: z.number().describe('The numerical amount of the transaction.'),
  category: z.string().describe('The suggested category for the transaction.'),
  type: z.enum(['debit', 'credit']).describe('Whether the transaction is a debit (expense) or credit (income/refund).'),
});

const BankStatementOutputSchema = z.object({
  transactions: z.array(TransactionSchema).describe('A list of extracted transactions.'),
  summary: z.string().describe('A brief summary of the extraction process.'),
});
export type BankStatementOutput = z.infer<typeof BankStatementOutputSchema>;

export async function processBankStatement(input: BankStatementInput): Promise<BankStatementOutput> {
  return processBankStatementFlow(input);
}

const prompt = ai.definePrompt({
  name: 'processBankStatementPrompt',
  input: { schema: BankStatementInputSchema },
  output: { schema: BankStatementOutputSchema },
  prompt: `You are an expert financial auditor. Your task is to extract transactions from the provided bank statement.

Analyze the statement and extract:
1. Date (format as YYYY-MM-DD)
2. Description/Merchant
3. Amount (as a positive number)
4. Type (debit for expenses/outflow, credit for income/refunds)
5. Category: Choose the best fit from this list: {{{categories}}}

Focus primarily on debits. If a transaction looks like a refund, mark it as a credit but categorize it. 
If the year is not present on the statement, assume it is 2024.

Statement: {{media url=fileDataUri}}`,
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
