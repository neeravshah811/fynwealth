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
    .optional()
    .describe(
      "A bank statement file (PDF or image), as a data URI."
    ),
  rawText: z
    .string()
    .optional()
    .describe("The raw text content of a statement (e.g. from a CSV file)."),
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

Analyze the provided data and extract every transaction.
1. Date: Ensure it is in YYYY-MM-DD format. If the year is missing, assume it is 2024 or 2025 based on context.
2. Description: The merchant name or transaction details.
3. Amount: The absolute numerical value.
4. Type: Mark as 'debit' for payments/expenses and 'credit' for income/refunds.
5. Category: Choose the best fit from this list: {{{categories}}}.

CRITICAL INSTRUCTIONS:
- Focus primarily on capturing DEBITS (expenses).
- Only include CREDITS if they appear to be REFUNDS for a previous expense. Ignore salary, transfers-in, or general income.
- If the format is a CSV or table, parse the columns carefully to identify Date, Description, and Amount.
- If multiple pages are present, process all of them.

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
    // Rely on the default model configured in the ai instance
    const { output } = await prompt(input);
    return output!;
  }
);
