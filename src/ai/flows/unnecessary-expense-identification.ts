
'use server';
/**
 * @fileOverview An AI agent that analyzes spending patterns to identify top spending categories and concise saving tips.
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
  savingTip: z.string().describe('Exactly 1 concise, actionable tip.'),
});

const IdentifyUnnecessaryExpensesOutputSchema = z.object({
  highSpendCategories: z.array(IdentifiedCategorySchema).max(4).describe('Top 4 spending categories with specific tips.'),
});
export type IdentifyUnnecessaryExpensesOutput = z.infer<typeof IdentifyUnnecessaryExpensesOutputSchema>;

export async function identifyUnnecessaryExpenses(input: IdentifyUnnecessaryExpensesInput): Promise<IdentifyUnnecessaryExpensesOutput> {
  return unnecessaryExpenseIdentificationFlow(input);
}

const unnecessaryExpenseIdentificationPrompt = ai.definePrompt({
  name: 'unnecessaryExpenseIdentificationPrompt',
  input: {schema: IdentifyUnnecessaryExpensesInputSchema},
  output: {schema: IdentifyUnnecessaryExpensesOutputSchema},
  prompt: `You are a precise financial auditor for FynWealth.
Analyze the provided expenses and output exactly the TOP 4 highest spending categories.

Requirements:
1. Identify the top 4 categories by volume.
2. For each, provide exactly 1 concise savings tip.
3. Use currency context from data.

Expenses:
{{#each expenses}}
- Date: {{{date}}}, Description: {{{description}}}, Amount: {{{amount}}}, Category: {{{category}}}
{{/each}}

Rules:
- Strictly top 4 categories only.
- Tips must be concise and actionable.
- No explanations or extra headings.`,
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
