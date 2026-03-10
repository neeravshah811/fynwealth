'use server';
/**
 * @fileOverview A Genkit flow for predicting upcoming heavy spending months based on historical expense data.
 *
 * - predictHeavySpendingMonths - A function that predicts heavy spending months.
 * - HeavySpendingMonthPredictionInput - The input type for the predictHeavySpendingMonths function.
 * - HeavySpendingMonthPredictionOutput - The return type for the predictHeavySpendingMonths function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExpenseSchema = z.object({
  date: z.string().describe('The date of the expense in YYYY-MM-DD format.'),
  amount: z.number().describe('The amount of the expense.'),
});

const HeavySpendingMonthPredictionInputSchema = z.object({
  expenses: z.array(ExpenseSchema).describe('A list of historical expenses with date and amount.'),
});
export type HeavySpendingMonthPredictionInput = z.infer<typeof HeavySpendingMonthPredictionInputSchema>;

const PredictedHeavySpendingMonthSchema = z.object({
  month: z.string().describe('The full name of the predicted heavy spending month (e.g., "January").'),
  year: z.number().describe('The year of the predicted heavy spending month.'),
  reason: z.string().describe('The reason for the predicted heavy spending, based on historical patterns in the provided expenses.'),
});

const HeavySpendingMonthPredictionOutputSchema = z.object({
  predictions: z.array(PredictedHeavySpendingMonthSchema).describe('A list of predicted heavy spending months.'),
  summary: z.string().describe('A summary of the predictions and overall insights regarding potential heavy spending periods.'),
});
export type HeavySpendingMonthPredictionOutput = z.infer<typeof HeavySpendingMonthPredictionOutputSchema>;

const predictHeavySpendingMonthsPrompt = ai.definePrompt({
  name: 'predictHeavySpendingMonthsPrompt',
  input: {
    schema: z.object({
      expensesJson: z.string().describe('A JSON string of historical expenses.'),
    }),
  },
  output: {schema: HeavySpendingMonthPredictionOutputSchema},
  prompt: `You are an AI financial analyst specializing in predicting spending patterns. Your task is to analyze the provided historical expense data and identify upcoming months where expenses are likely to be unusually high based on recurring patterns or significant past events.\n\nThe historical expenses are provided as a JSON array of objects, each with a 'date' (YYYY-MM-DD) and 'amount' (number).\n\nAnalyze the following historical expenses:\n{{{expensesJson}}}\n\nBased on this data, predict which upcoming months are likely to have unusually high expenses. Focus on patterns and reasons that can be inferred directly from the provided data. Provide a list of these months with the full month name, the year, and a clear, concise reason for the prediction based on the patterns observed in the data. Also, provide a general summary of your overall insights regarding the spending patterns.\n\nEnsure your output strictly adheres to the JSON schema provided.`,
});

const predictHeavySpendingMonthsFlow = ai.defineFlow(
  {
    name: 'predictHeavySpendingMonthsFlow',
    inputSchema: HeavySpendingMonthPredictionInputSchema,
    outputSchema: HeavySpendingMonthPredictionOutputSchema,
  },
  async (input) => {
    // Stringify the expenses array to pass it as a single string to the prompt
    const expensesJson = JSON.stringify(input.expenses);
    const {output} = await predictHeavySpendingMonthsPrompt({expensesJson});
    return output!;
  }
);

export async function predictHeavySpendingMonths(
  input: HeavySpendingMonthPredictionInput
): Promise<HeavySpendingMonthPredictionOutput> {
  return predictHeavySpendingMonthsFlow(input);
}
