'use server';
/**
 * @fileOverview An AI agent that generates behavioral savings tips.
 * Focuses on 5 core pillars: Unplanned Spending, Small Expenses, Impulse Shopping, Subscriptions, and Saving Habits.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IdentifyUnnecessaryExpensesInputSchema = z.object({
  userId: z.string().optional(),
  month: z.string().optional(),
});
export type IdentifyUnnecessaryExpensesInput = z.infer<typeof IdentifyUnnecessaryExpensesInputSchema>;

const BehavioralTipSchema = z.object({
  title: z.string().describe('The name of the behavioral pattern (e.g., Spending Without Planning).'),
  description: z.string().describe('Explanation of why this behavior happens.'),
  examples: z.string().optional().describe('Specific examples like coffee, online orders, or sales.'),
  solution: z.string().describe('Actionable step to fix the behavior.'),
});

const IdentifyUnnecessaryExpensesOutputSchema = z.object({
  behavioralTips: z.array(BehavioralTipSchema).max(3).describe('Top 3 relevant behavioral savings tips.'),
});
export type IdentifyUnnecessaryExpensesOutput = z.infer<typeof IdentifyUnnecessaryExpensesOutputSchema>;

export async function identifyUnnecessaryExpenses(input: IdentifyUnnecessaryExpensesInput): Promise<IdentifyUnnecessaryExpensesOutput> {
  return unnecessaryExpenseIdentificationFlow(input);
}

const unnecessaryExpenseIdentificationPrompt = ai.definePrompt({
  name: 'unnecessaryExpenseIdentificationPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: IdentifyUnnecessaryExpensesInputSchema},
  output: {schema: IdentifyUnnecessaryExpensesOutputSchema},
  prompt: `You are a behavioral finance coach for FynWealth. 
Your goal is to select and explain 3 random behavioral savings tips from the 5 core themes below. 
Do not use conversational filler. Be direct and actionable.

THEMES:
1. Spending Without Planning
   Context: Random spending on online shopping, eating out, and small desires.
   Solution: Create a proper fixed budget every month.

2. Ignoring Small Expenses
   Context: Frequent small amounts (e.g., ₹100, ₹200) like coffee, tea, or online food delivery.
   Examples: Coffee outside, Swiggy/Zomato, unplanned snacks.
   Solution: Track even the smallest spends; they turn into thousands per month.

3. Emotional or Impulse Shopping
   Context: Buying things based on emotions or "Sale/Discount" offers rather than need.
   Solution: Understand the difference between needs and wants.

4. Subscriptions and Auto Payments
   Context: Automatic charges for OTT, app memberships, or online services that go unused.
   Solution: Regularly review and cancel unused automated payments.

5. No Habit of Saving and Investing
   Context: Spending everything first and only saving what is left.
   Solution: Follow the "Pay Yourself First" rule — save/invest immediately upon receiving income.

Return 3 of these themes in a structured format.`,
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
      if (!output || !output.behavioralTips) {
        throw new Error("No output generated");
      }
      return output;
    } catch (err: any) {
      console.error("[unnecessaryExpenseIdentificationFlow] Error:", err.message);
      return {
        behavioralTips: [
          {
            title: "Spending Without Planning",
            description: "Random spending on online shopping or eating out adds up quickly.",
            solution: "Create a fixed monthly budget to gain control."
          },
          {
            title: "Ignoring Small Expenses",
            description: "Frequent small purchases like coffee or food delivery turn into major monthly losses.",
            solution: "Track every small transaction to stop the leak."
          },
          {
            title: "Pay Yourself First",
            description: "Waiting to save what is 'left over' often results in zero savings.",
            solution: "Invest a portion of your income as soon as it arrives."
          }
        ]
      };
    }
  }
);
