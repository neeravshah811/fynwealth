
'use server';
/**
 * @fileOverview A specialized Genkit flow for generating financial insights with usage tracking.
 * 
 * - generateAIInsight - Main function to generate insights.
 * - generateAIInsightFlow - The Genkit flow definition.
 * 
 * This implementation acts as a server-side "callable" function within the Next.js environment.
 * It enforces a monthly quota of 20 requests per user and uses Gemini 2.0 Flash.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { format } from 'date-fns';

// Initialize Firebase Client SDK for server-side use in this flow
if (!getApps().length) {
  initializeApp(firebaseConfig);
}
const db = getFirestore();

const AIInsightInputSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  prompt: z.string().min(1, "Prompt is required"),
});
export type AIInsightInput = z.infer<typeof AIInsightInputSchema>;

const AIInsightOutputSchema = z.object({
  insight: z.string().describe('The generated financial insight.'),
  count: z.number().describe('The updated usage count for the current month.'),
});
export type AIInsightOutput = z.infer<typeof AIInsightOutputSchema>;

/**
 * generateAIInsight - Main server action acting as an HTTPS callable.
 * Checks usage limits and generates a concise financial insight using Gemini.
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
    const { userId, prompt: userPrompt } = input;
    
    // Usage tracking logic: Key by userId and current month (YYYY-MM)
    const month = format(new Date(), 'yyyy-MM');
    const usageId = `${userId}_${month}`;
    const usageRef = doc(db, 'ai_usage', usageId);

    try {
      // 1. Check user's monthly AI usage from Firestore
      const usageDoc = await getDoc(usageRef);
      const currentCount = usageDoc.exists() ? usageDoc.data().count : 0;

      // 2. Limit usage to 20 requests per user per month
      if (currentCount >= 20) {
        throw new Error('AI usage limit reached');
      }

      // 3. Call Gemini API via Genkit using gemini-2.0-flash
      // Optimized for low cost with concise prompt and token limits
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

      // 4. Store usage: Increment count in Firestore
      await setDoc(usageRef, {
        userId,
        month,
        count: increment(1),
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      return {
        insight: insightText,
        count: currentCount + 1
      };

    } catch (error: any) {
      console.error("[generateAIInsight] Error:", error.message);
      // Log specific AI usage limit error
      if (error.message === 'AI usage limit reached') {
        throw error;
      }
      throw new Error("Failed to generate AI insight. Please try again later.");
    }
  }
);
