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
  historicalComparison: z.string().describe('A brief comparison, e.g., "Your total monthly expense dropped 12% from last month 👏".'),
  futureSpikes: z.array(z.object({
    month: z.string(),
    year: z.number(),
    reason: z.string(),
    confidence: z.number(),
  })).describe('Predictions for future heavy months.'),
  summary: z.string().describe('Overall spending trend forecast.'),
});
export type HeavySpendingMonthPredictionOutput = z.infer<typeof HeavySpendingMonthPredictionOutputSchema>;

const prompt = ai.definePrompt({
  name: 'predictHeavySpendingMonthsPrompt',
  input: { schema: z.object({ expensesJson: z.string() }) },
  output: { schema: HeavySpendingMonthPredictionOutputSchema },
  prompt: `You are a predictive financial analyst for FynWealth.
Analyze the historical data: {{{expensesJson}}}

Tasks:
1. Calculate the percentage change from the most recent full month to the previous one.
2. Provide a "historicalComparison" string like: "Your total monthly expense dropped 15% from last month 👏" or "Spending increased by 5% 📊".
3. Predict the exact "predictedNextMonthTotal".
4. Identify future seasonal spikes.

Format the output strictly according to the schema.`,
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
