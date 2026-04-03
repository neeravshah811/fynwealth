
'use server';
/**
 * @fileOverview Predicts upcoming heavy spending and compares month-over-month trends.
 * Optimized for speed by processing aggregated monthly totals.
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
  predictedNextMonthTotal: z.number().describe('The predicted total expense amount for the next month.'),
  percentageChange: z.number().describe('The percentage drop or increase compared to the previous recorded month.'),
  trendDirection: z.enum(['up', 'down', 'stable']).describe('The direction of spending.'),
  historicalComparison: z.string().describe('A brief comparison string.'),
});
export type HeavySpendingMonthPredictionOutput = z.infer<typeof HeavySpendingMonthPredictionOutputSchema>;

const prompt = ai.definePrompt({
  name: 'predictHeavySpendingMonthsPrompt',
  input: { schema: z.object({ expensesJson: z.string() }) },
  output: { schema: HeavySpendingMonthPredictionOutputSchema },
  prompt: `You are a precise financial analyst for FynWealth. Analyze aggregated monthly totals: {{{expensesJson}}}

Tasks:
1. Identify the most recent month and its total.
2. Compare it to the month immediately preceding it (if available).
3. Calculate the percentage increase/decrease between the most recent month and the preceding one. If only one month exists, use 0.
4. Predict exactly "predictedNextMonthTotal" for the following month by calculating the mathematical average of ALL monthly amounts provided in the input.
5. Provide a short MoM comparison string (max 15 words) explaining the trend between the last two recorded months.

Rules:
- Be concise.
- Use numeric values for calculations.
- No conversational filler.`,
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
      if (!output) throw new Error("No output generated");
      return output;
    } catch (err: any) {
      console.error("[predictHeavySpendingMonthsFlow] Error:", err.message);
      throw new Error("Failed to forecast spending. Please try again later.");
    }
  }
);

export async function predictHeavySpendingMonths(input: HeavySpendingMonthPredictionInput): Promise<HeavySpendingMonthPredictionOutput> {
  return predictHeavySpendingMonthsFlow(input);
}
