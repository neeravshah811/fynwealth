
'use server';
/**
 * @fileOverview Predicts upcoming heavy spending and compares month-over-month trends.
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
  prompt: `You are a precise financial analyst for FynWealth. Analyze historical data: {{{expensesJson}}}

Tasks:
1. Calculate percentage increase/decrease from the most recent full month to the previous one.
2. Predict exactly "predictedNextMonthTotal" based on trends.
3. Provide a short MoM comparison string.

Rules:
- Be concise.
- Use strictly numeric values.
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
