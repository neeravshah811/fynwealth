'use server';
/**
 * @fileOverview An AI agent that generates behavioral savings tips from a 55-pillar registry.
 * Randomly selects 3 distinct strategies daily to help users master their financial mindset.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IdentifyUnnecessaryExpensesInputSchema = z.object({
  userId: z.string().optional(),
  month: z.string().optional(),
});
export type IdentifyUnnecessaryExpensesInput = z.infer<typeof IdentifyUnnecessaryExpensesInputSchema>;

const BehavioralTipSchema = z.object({
  title: z.string().describe('The name of the behavioral pattern.'),
  description: z.string().describe('Explanation of the behavior.'),
  solution: z.string().describe('Actionable step to fix the behavior.'),
});

const IdentifyUnnecessaryExpensesOutputSchema = z.object({
  behavioralTips: z.array(BehavioralTipSchema).max(3).describe('Top 3 randomly selected behavioral savings tips.'),
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
Your goal is to select and explain 3 random, distinct behavioral savings tips from the 55 core themes below. 
Do not use conversational filler. Be direct and actionable.

THEMES:
1. Spending Without Planning: Money spent randomly without a fixed budget. Solution: Create a proper monthly budget.
2. Ignoring Small Expenses: Frequent small amounts (₹100-300) like coffee or Swiggy. Solution: Track every small transaction.
3. Emotional or Impulse Shopping: Buying based on "Sale" or emotions rather than need. Solution: Understand Needs vs Wants.
4. Subscriptions and Auto Payments: Unused OTT or app memberships. Solution: Audit and cancel unused auto-payments.
5. No Habit of Saving and Investing: Spending first and saving what is left. Solution: Follow "Pay Yourself First" rule.
6. Not Tracking Expenses: Not knowing where money goes. Solution: Track every expense daily.
7. Lifestyle Inflation: Expenses increasing with income. Solution: Increase savings % instead of lifestyle.
8. Overusing Credit Cards: Easy swipe leading to hard repayment. Solution: Use credit only if you can pay in full.
9. Paying Only Minimum Due: Leads to heavy interest. Solution: Always pay full outstanding amount.
10. No Emergency Fund: Sudden expenses disturbing finances. Solution: Save 3–6 months of expenses.
11. Ignoring Insurance: Medical emergencies causing crisis. Solution: Get health + term insurance.
12. Buying for Status: Spending to impress others. Solution: Spend for value, not validation.
13. Not Comparing Prices: Paying more than needed. Solution: Always compare before buying.
14. No Financial Goals: Directionless spending. Solution: Set clear short & long-term goals.
15. Investing Without Knowledge: Following trends blindly. Solution: Understand before investing.
16. Delaying Investments: Waiting for "perfect time". Solution: Start early, even small.
17. No Retirement Planning: Future dependency risk. Solution: Start retirement fund early.
18. Depending on Single Income: Risky if income stops. Solution: Build multiple income sources.
19. Not Reviewing Bank Statements: Missing hidden charges or fraud. Solution: Check monthly statements.
20. Ignoring Tax Planning: Paying more tax than required. Solution: Use tax-saving options.
21. Overspending During Sales: Buying unnecessary items. Solution: Shop with a list.
22. Not Negotiating: Missing potential savings. Solution: Negotiate when possible.
23. Using BNPL Excessively: Future burden increases. Solution: Avoid unnecessary EMI.
24. No Budget Categories: Mixed-up expenses. Solution: Divide into needs/wants/savings.
25. Ignoring Small Discounts: Missing easy savings. Solution: Use coupons & cashback.
26. Eating Out Frequently: Major hidden expense. Solution: Limit dining out.
27. Not Planning Big Purchases: Impulsive high spending. Solution: Plan and save first.
28. Lending Money Without Boundaries: Leads to loss or stress. Solution: Lend only what you can afford to lose.
29. Not Automating Savings: Forgetting to save. Solution: Set auto-transfer to savings.
30. Ignoring Inflation: Savings losing value over time. Solution: Invest to beat inflation.
31. Keeping All Money in Savings: Low returns. Solution: Diversify into investments.
32. No Debt Strategy: Debt keeps increasing. Solution: Follow snowball or avalanche method.
33. Buying Extended Warranties Unnecessarily: Extra cost, little benefit. Solution: Evaluate before buying.
34. Subscribing to Trends: Social media influence spending. Solution: Stick to your financial plan.
35. Ignoring Cashback/Rewards: Missing free benefits. Solution: Use reward systems wisely.
36. No Monthly Financial Review: No progress control. Solution: Review monthly.
37. Buying Cheap but Low Quality: Frequent replacements. Solution: Buy value, not just cheap.
38. Not Using Public Transport: High maintenance costs. Solution: Use economical options.
39. Ignoring Side Hustles: Missing extra income. Solution: Build additional income streams.
40. Spending Windfalls Quickly: Wasted bonuses. Solution: Invest majority of windfalls.
41. Not Tracking Subscriptions: Money leakage. Solution: Audit subscriptions regularly.
42. Peer Pressure Spending: Spending to match others. Solution: Stay within your limits.
43. Ignoring Credit Score: Affects loans later. Solution: Maintain good credit habits.
44. No Will or Financial Planning: Future complications. Solution: Plan asset distribution.
45. Frequent Online Browsing: Leads to impulse buying. Solution: Avoid unnecessary browsing.
46. Not Setting Spending Limits: Overspending risk. Solution: Set category-wise limits.
47. Emotional Eating/Spending: Mood-based expenses. Solution: Identify triggers.
48. Ignoring Financial Education: Poor decisions. Solution: Learn basic finance regularly.
49. Not Using Budgeting Tools: Manual tracking fails. Solution: Use apps like FynWealth.
50. No Accountability: No discipline. Solution: Share goals or track publicly.
51. Delaying Financial Decisions: Missed opportunities. Solution: Take timely action.
52. Not Separating Personal & Business Money: Confusion. Solution: Maintain separate accounts.
53. Ignoring Long-Term Wealth Building: Short-term focus. Solution: Balance both.
54. Spending Before Saving: Nothing left to save. Solution: Save first, spend later.
55. No Clear Financial System: Chaos. Solution: Build a simple track-plan-save system.

Pick 3 distinct ones and return them in the specified format.`,
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
      // Robust Fallback
      return {
        behavioralTips: [
          {
            title: "Spending Without Planning",
            description: "Money gets spent randomly on online shopping and small desires without a fixed budget.",
            solution: "Create a proper fixed budget every month."
          },
          {
            title: "Ignoring Small Expenses",
            description: "Frequent small purchases like coffee or food delivery turn into thousands in monthly losses.",
            solution: "Track every small transaction to stop the leak."
          },
          {
            title: "Pay Yourself First",
            description: "Waiting to save what is 'left over' often results in zero savings at month end.",
            solution: "Invest a portion of your income as soon as it arrives."
          }
        ]
      };
    }
  }
);
