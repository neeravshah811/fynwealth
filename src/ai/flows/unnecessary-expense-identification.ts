
'use server';
/**
 * @fileOverview An AI agent that analyzes spending patterns to identify high-spend categories and calculated saving opportunities.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExpenseSchema = z.object({
  date: z.string().describe('The date of the expense in YYYY-MM-DD format.'),
  description: z.string().describe('A brief description of the expense.'),
  amount: z.number().describe('The amount of the expense.'),
  category: z.string().describe('The category of the expense.'),
});

const IdentifyUnnecessaryExpensesInputSchema = z.object({
  expenses: z.array(ExpenseSchema).describe('A list of recorded expenses for analysis.'),
});
export type IdentifyUnnecessaryExpensesInput = z.infer<typeof IdentifyUnnecessaryExpensesInputSchema>;

const IdentifiedCategorySchema = z.object({
  categoryName: z.string().describe('The name of the high-spend category.'),
  totalSpent: z.number().describe('Total amount spent in this category.'),
  potentialSavings: z.number().describe('Calculated estimate of how much the user could realistically save next month (numeric).'),
  savingTip: z.string().describe('Actionable advice to reduce spending (e.g., "You can save ₹500 by optimizing OTT plans").'),
  reason: z.string().describe('Why this category was flagged.'),
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
  prompt: `You are an expert financial auditor for FynWealth.
Analyze the provided expenses. Focus on CATEGORY level trends.

CRITICAL: 
1. Provide specific, numeric "potentialSavings" for each flagged category.
2. The "savingTip" should be punchy and valuable, e.g., "You can save ₹1,200 next month by optimizing Subscriptions and Recharge plans 📊".
3. Group items like "Financial Commitments" or "Financial Commit" together under "Financial Commit".

Expenses:
{{#each expenses}}
- Date: {{{date}}}, Description: {{{description}}}, Amount: {{{amount}}}, Category: {{{category}}}
{{/each}}

Identify categories with high volume and provide actionable, numeric savings strategies.`,
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
