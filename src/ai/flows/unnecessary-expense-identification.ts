'use server';
/**
 * @fileOverview An AI agent that analyzes spending patterns to identify recurring or potentially unnecessary expenses.
 *
 * - identifyUnnecessaryExpenses - A function that handles the expense analysis process.
 * - IdentifyUnnecessaryExpensesInput - The input type for the identifyUnnecessaryExpenses function.
 * - IdentifyUnnecessaryExpensesOutput - The return type for the identifyUnnecessaryExpenses function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExpenseSchema = z.object({
  date: z.string().describe('The date of the expense in YYYY-MM-DD format.'),
  description: z.string().describe('A brief description of the expense.'),
  amount: z.number().describe('The amount of the expense.'),
  category: z.string().describe('The category of the expense (e.g., "Subscription", "Dining", "Utilities").'),
});

const IdentifyUnnecessaryExpensesInputSchema = z.object({
  expenses: z.array(ExpenseSchema).describe('A list of recorded expenses for analysis.'),
});
export type IdentifyUnnecessaryExpensesInput = z.infer<typeof IdentifyUnnecessaryExpensesInputSchema>;

const IdentifiedExpenseSchema = z.object({
  description: z.string().describe('The description of the potentially unnecessary or recurring expense.'),
  amount: z.number().describe('The amount of the expense.'),
  category: z.string().describe('The category of the expense.'),
  reason: z.string().describe('The reason why this expense is considered potentially unnecessary or recurring, or a pattern of recurrence.'),
});

const IdentifyUnnecessaryExpensesOutputSchema = z.object({
  unnecessaryExpenses: z.array(IdentifiedExpenseSchema).describe('A list of expenses identified as potentially unnecessary or recurring.'),
  summary: z.string().describe('A general summary of the identified patterns and suggestions for the user.'),
});
export type IdentifyUnnecessaryExpensesOutput = z.infer<typeof IdentifyUnnecessaryExpensesOutputSchema>;

export async function identifyUnnecessaryExpenses(input: IdentifyUnnecessaryExpensesInput): Promise<IdentifyUnnecessaryExpensesOutput> {
  return unnecessaryExpenseIdentificationFlow(input);
}

const unnecessaryExpenseIdentificationPrompt = ai.definePrompt({
  name: 'unnecessaryExpenseIdentificationPrompt',
  input: {schema: IdentifyUnnecessaryExpensesInputSchema},
  output: {schema: IdentifyUnnecessaryExpensesOutputSchema},
  prompt: `You are an AI financial assistant called FynWealth, specialized in helping users identify unnecessary expenses and find saving opportunities.
Analyze the following list of expenses. Identify recurring expenses and any expenses that could be considered unnecessary or could be optimized.
For each identified expense, provide a clear reason why it is considered potentially unnecessary or recurring.

Expenses:
{{#each expenses}}
- Date: {{{date}}}, Description: {{{description}}}, Amount: {{{amount}}}, Category: {{{category}}}
{{/each}}

Based on the provided expenses, list all identified unnecessary or recurring expenses with a reason, and provide a general summary of your findings and suggestions for the user.`,
});

const unnecessaryExpenseIdentificationFlow = ai.defineFlow(
  {
    name: 'unnecessaryExpenseIdentificationFlow',
    inputSchema: IdentifyUnnecessaryExpensesInputSchema,
    outputSchema: IdentifyUnnecessaryExpensesOutputSchema,
  },
  async (input) => {
    const {output} = await unnecessaryExpenseIdentificationPrompt(input);
    return output!;
  }
);
