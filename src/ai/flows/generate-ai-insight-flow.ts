
'use server';
/**
 * @fileOverview generateAIInsight - Genkit flow for financial insights.
 * Note: Usage tracking is handled by the calling client component to respect Firestore Security Rules.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AIInsightInputSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  prompt: z.string().min(1, "Prompt is required"),
});
export type AIInsightInput = z.infer<typeof AIInsightInputSchema>;

const AIInsightOutputSchema = z.object({
  insight: z.string().describe('The generated financial insight.'),
});
export type AIInsightOutput = z.infer<typeof AIInsightOutputSchema>;

/**
 * generateAIInsight - Server action acting as an HTTPS callable.
 */
export async function generateAIInsight(input: AIInsightInput): Promise<AIInsightOutput> {
  return generateAIInsightFlow(input);
}

const generateAIInsightFlow = ai.defineFlow(
  {
    name: 'generateAIInsightFlow',
    inputSchema: AIInsightInputSchema,
    outputSchema: AIInsightOutputSchema,
  },
  async (input) => {
    const { prompt: userPrompt } = input;
    
    try {
      // Call Gemini API via Genkit using gemini-2.0-flash
      const response = await ai.generate({
        model: 'googleai/gemini-2.0-flash',
        prompt: `You are a concise financial advisor for FynWealth. 
        Provide a short, structured financial insight based on the input.
        Format: Insight: [Short observation]. Action: [Actionable step].
        Limit to max 30 words.
        
        User input: ${userPrompt}`,
        config: {
          maxOutputTokens: 100,
          temperature: 0.7,
        }
      });

      const insightText = response.text || "No insight generated. Please try a different prompt.";

      return {
        insight: insightText
      };

    } catch (error: any) {
      console.error("[generateAIInsight] Server Error:", error.message);
      throw new Error("Failed to generate AI insight. Please try again later.");
    }
  }
);
