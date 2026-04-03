'use server';
/**
 * @fileOverview Predicts upcoming spending based on strict historical averaging.
 * Optimized for accuracy using pre-aggregated monthly totals.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AggregatedExpenseSchema = z.object({
  date: z.string().describe('The month in YYYY-MM format.'),
  amount: z.number().describe('The total expense for that month.'),
});

const HeavySpendingMonthPredictionInputSchema = z.object({
  expenses: z.array(AggregatedExpenseSchema),
});
export type HeavySpendingMonthPredictionInput = z.infer<typeof HeavySpendingMonthPredictionInputSchema>;

const HeavySpendingMonthPredictionOutputSchema = z.object({
  currentMonthExpected: z.number().describe('Average of total spending from all previous months.'),
  nextMonthExpected: z.number().describe('Average of total spending including the current month.'),
  percentageChange: z.number().describe('Percentage increase or decrease between Current Month Expected vs Last Month Actual Spend.'),
});
export type HeavySpendingMonthPredictionOutput = z.infer<typeof HeavySpendingMonthPredictionOutputSchema>;

const prompt = ai.definePrompt({
  name: 'predictHeavySpendingMonthsPrompt',
  input: { schema: z.object({ expensesJson: z.string() }) },
  output: { schema: HeavySpendingMonthPredictionOutputSchema },
  prompt: `You are a precise financial calculator for FynWealth. Analyze aggregated monthly totals: {{{expensesJson}}}

Strict Logic:
1. Identify the 'current month' (the most recent month in the input).
2. "Current Month Expected": Calculate the mathematical average of all months EXCEPT the current month. If no previous months exist, use the current month's total.
3. "Next Month Expected": Calculate the mathematical average of ALL months in the input (including the current month).
4. "Percentage Change": Calculate the percentage change between the "Current Month Expected" and the "Last Month Actual Spend" (the month immediately preceding the current one). 
   Formula: ((CurrentMonthExpected - LastMonthActual) / LastMonthActual) * 100.
   If only one month exists, percentage is 0.

Rules:
- Round all values to 2 decimal places.
- No explanations, no extra text.
- Use accurate calculations based on provided data.`,
});

const predictHeavySpendingMonthsFlow = ai.defineFlow(
  {
    name: 'predictHeavySpendingMonthsFlow',
    inputSchema: HeavySpendingMonthPredictionInputSchema,
    outputSchema: HeavySpendingMonthPredictionOutputSchema,
  },
  async (input) => {
    try {
      if (!input.expenses || input.expenses.length === 0) {
        return {
          currentMonthExpected: 0,
          nextMonthExpected: 0,
          percentageChange: 0
        };
      }

      const expensesJson = JSON.stringify(input.expenses);
      const {output} = await prompt({expensesJson});
      
      if (!output) {
        // Fallback calculation if AI fails
        const total = input.expenses.reduce((s, e) => s + e.amount, 0);
        const avgAll = total / input.expenses.length;
        return {
          currentMonthExpected: avgAll,
          nextMonthExpected: avgAll,
          percentageChange: 0
        };
      }
      
      return output;
    } catch (err: any) {
      console.error("[predictHeavySpendingMonthsFlow] Error:", err.message);
      const total = input.expenses?.length > 0 ? input.expenses.reduce((s, e) => s + e.amount, 0) : 0;
      const avg = input.expenses?.length > 0 ? total / input.expenses.length : 0;
      return {
        currentMonthExpected: avg,
        nextMonthExpected: avg,
        percentageChange: 0
      };
    }
  }
);

export async function predictHeavySpendingMonths(input: HeavySpendingMonthPredictionInput): Promise<HeavySpendingMonthPredictionOutput> {
  return predictHeavySpendingMonthsFlow(input);
}
