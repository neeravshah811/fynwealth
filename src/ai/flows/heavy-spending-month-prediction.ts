
'use server';
/**
 * @fileOverview Predicts upcoming heavy spending and next month's totals based on historical comparisons.
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
  historicalComparison: z.string().describe('A brief comparison of current spending vs previous months.'),
  futureSpikes: z.array(z.object({
    month: z.string(),
    year: z.number(),
    reason: z.string(),
    confidence: z.number(),
  })).describe('Predictions for months with likely high spending.'),
  summary: z.string().describe('Overall spending trend forecast.'),
});
export type HeavySpendingMonthPredictionOutput = z.infer<typeof HeavySpendingMonthPredictionOutputSchema>;

const prompt = ai.definePrompt({
  name: 'predictHeavySpendingMonthsPrompt',
  input: { schema: z.object({ expensesJson: z.string() }) },
  output: { schema: HeavySpendingMonthPredictionOutputSchema },
  prompt: `You are a predictive financial analyst for FynWealth.
Analyze the provided historical expense data: {{{expensesJson}}}

Tasks:
1. Compare spending levels across the months provided in the data.
2. Predict the total expected expenditure for the very next month based on the average and recurring trends.
3. Identify future months (up to 12 months ahead) that are likely to have spending spikes based on patterns detected (e.g., annual subscriptions, holiday seasons, or periodic bills).
4. Provide a brief summary of whether the user's spending is increasing, decreasing, or stable compared to previous periods.

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
      if (err.message.includes('429')) throw new Error('AI Quota Exceeded.');
      throw new Error("Failed to forecast spending. Please try again later.");
    }
  }
);

export async function predictHeavySpendingMonths(input: HeavySpendingMonthPredictionInput): Promise<HeavySpendingMonthPredictionOutput> {
  return predictHeavySpendingMonthsFlow(input);
}
