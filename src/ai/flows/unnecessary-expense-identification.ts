
'use server';
/**
 * @fileOverview An AI agent that analyzes spending patterns to identify high-spend categories and saving opportunities.
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

const IdentifiedCategorySchema = z.object({
  categoryName: z.string().describe('The name of the high-spend category.'),
  totalSpent: z.number().describe('Total amount spent in this category.'),
  savingTip: z.string().describe('Actionable advice to reduce spending in this specific category.'),
  reason: z.string().describe('Why this category was flagged for optimization.'),
});

const IdentifyUnnecessaryExpensesOutputSchema = z.object({
  highSpendCategories: z.array(IdentifiedCategorySchema).describe('Analysis of top spending categories.'),
  summary: z.string().describe('A general financial health summary.'),
});
export type IdentifyUnnecessaryExpensesOutput = z.infer<typeof IdentifyUnnecessaryExpensesOutputSchema>;

export async function identifyUnnecessaryExpenses(input: IdentifyUnnecessaryExpensesInput): Promise<IdentifyUnnecessaryExpensesOutput> {
  return unnecessaryExpenseIdentificationFlow(input);
}

const unnecessaryExpenseIdentificationPrompt = ai.definePrompt({
  name: 'unnecessaryExpenseIdentificationPrompt',
  input: {schema: IdentifyUnnecessaryExpensesInputSchema},
  output: {schema: IdentifyUnnecessaryExpensesOutputSchema},
  prompt: `You are an AI financial assistant called FynWealth.
Analyze the following list of expenses. 

CRITICAL INSTRUCTION: Do not provide insights on specific high-end individual transactions. Instead, aggregate the data by category.
Identify categories where the user is spending the most money or where spending seems disproportionately high relative to a typical balanced budget.

For each flagged category, provide:
1. The total spent in that category.
2. A specific, actionable saving tip to optimize that category (e.g., 'Consider meal prepping to reduce Dining Out expenses').
3. The reason why this category stands out.

Expenses:
{{#each expenses}}
- Date: {{{date}}}, Description: {{{description}}}, Amount: {{{amount}}}, Category: {{{category}}}
{{/each}}

Provide a general summary of the user's financial health based on these category trends.`,
});

const unnecessaryExpenseIdentificationFlow = ai.defineFlow(
  {
    name: 'unnecessaryExpenseIdentificationFlow',
    inputSchema: IdentifyUnnecessaryExpensesInputSchema,
    outputSchema: IdentifyUnnecessaryExpensesOutputSchema,
  },
  async (input) => {
    try {
      const {output} = await unnecessaryExpenseIdentificationPrompt(input);
      if (!output) throw new Error("No output generated");
      return output;
    } catch (err: any) {
      console.error("[unnecessaryExpenseIdentificationFlow] Error:", err.message);
      throw new Error("Failed to identify category trends. Please try again later.");
    }
  }
);
