
'use server';
/**
 * @fileOverview An AI agent that generates concise saving tips for high-spend categories.
 * Optimized for rapid response by processing pre-calculated totals.
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
Provide exactly 1 concise, actionable savings tip for each category based on the volume spent.

Requirements:
1. For each category, provide 1 tip specific to that spending behavior.
2. If Subscriptions are high, suggest plan optimization. If Food is high, suggest meal prep.
3. Keep tips very short (max 10 words).

Categories:
{{#each categories}}
- Category: {{{categoryName}}}, Total: {{{totalSpent}}}
{{/each}}

Rules:
- No conversational filler.
- Be actionable and data-driven.`,
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
