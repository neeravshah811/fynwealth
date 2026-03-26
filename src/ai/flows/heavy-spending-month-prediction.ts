'use server';
/**
 * @fileOverview Predicts upcoming heavy spending months based on historical data.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExpenseSchema = z.object({
  date: z.string(),
  amount: z.number(),
});

const HeavySpendingMonthPredictionInputSchema = z.object({
  expenses: z.array(ExpenseSchema),
});
export type HeavySpendingMonthPredictionInput = z.infer<typeof HeavySpendingMonthPredictionInputSchema>;

const HeavySpendingMonthPredictionOutputSchema = z.object({
  predictions: z.array(z.object({
    month: z.string(),
    year: z.number(),
    reason: z.string(),
  })),
  summary: z.string(),
});
export type HeavySpendingMonthPredictionOutput = z.infer<typeof HeavySpendingMonthPredictionOutputSchema>;

const prompt = ai.definePrompt({
  name: 'predictHeavySpendingMonthsPrompt',
  input: { schema: z.object({ expensesJson: z.string() }) },
  output: { schema: HeavySpendingMonthPredictionOutputSchema },
  prompt: `Analyze these expenses and predict upcoming heavy spend months: {{{expensesJson}}}`,
});

const predictHeavySpendingMonthsFlow = ai.defineFlow(
  {
    name: 'predictHeavySpendingMonthsFlow',
    inputSchema: HeavySpendingMonthPredictionInputSchema,
    outputSchema: HeavySpendingMonthPredictionOutputSchema,
  },
  async (input) => {
    try {
      const expensesJson = JSON.stringify(input.expenses);
      const {output} = await prompt({expensesJson});
      return output!;
    } catch (err: any) {
      if (err.message.includes('429')) throw new Error('AI Quota Exceeded.');
      throw err;
    }
  }
);

export async function predictHeavySpendingMonths(input: HeavySpendingMonthPredictionInput): Promise<HeavySpendingMonthPredictionOutput> {
  return predictHeavySpendingMonthsFlow(input);
}
