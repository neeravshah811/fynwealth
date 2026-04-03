'use server';
/**
 * @fileOverview An AI agent that generates concise saving tips for high-spend categories.
 * Now receives pre-calculated totals to ensure 100% mathematical accuracy.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategoryInputSchema = z.object({
  categoryName: z.string().describe('The name of the high-spend category.'),
  totalSpent: z.number().describe('Total amount spent in this category for the month.'),
});

const IdentifyUnnecessaryExpensesInputSchema = z.object({
  categories: z.array(CategoryInputSchema).max(4).describe('Top 4 highest spending categories.'),
});
export type IdentifyUnnecessaryExpensesInput = z.infer<typeof IdentifyUnnecessaryExpensesInputSchema>;

const IdentifiedCategorySchema = z.object({
  categoryName: z.string().describe('The name of the category.'),
  totalSpent: z.number().describe('The amount passed in.'),
  savingTip: z.string().describe('Exactly 1 concise, actionable tip for this category.'),
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
Provide exactly 1 concise, actionable savings tip for each of the following top spending categories.

Requirements:
1. Use the provided category names and amounts exactly as they are.
2. For each category, provide exactly 1 tip that is specific to that category's typical behavior.
3. Keep tips very short (max 12 words).

Categories:
{{#each categories}}
- Category: {{{categoryName}}}, Amount Spent: {{{totalSpent}}}
{{/each}}

Rules:
- Output exactly 4 categories if 4 are provided.
- Tips must be concise and actionable.
- No conversational filler.`,
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
      throw new Error("Failed to generate saving tips. Please try again later.");
    }
  }
);
