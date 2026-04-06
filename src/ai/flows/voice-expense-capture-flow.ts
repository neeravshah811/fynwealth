'use server';
/**
 * @fileOverview A Genkit flow for capturing expense details from voice input.
 * Strictly tuned for high-precision extraction following specific parsing rules.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VoiceExpenseCaptureInputSchema = z.object({
  audioDataUri: z.string().describe("Base64 encoded audio data uri."),
  today: z.string().describe("Today's date in YYYY-MM-DD format for reference."),
});

const VoiceExpenseCaptureOutputSchema = z.object({
  amount: z.number().describe('The extracted numeric amount. Return 0 if missing or unclear.'),
  category: z.enum(["food", "groceries", "travel", "shopping", "bills", "entertainment", "health", "other"]),
  description: z.string().describe('A short meaningful summary (max 5 words).'),
  date: z.string().describe('The transaction date in YYYY-MM-DD format.'),
});
export type VoiceExpenseCaptureOutput = z.infer<typeof VoiceExpenseCaptureOutputSchema>;

export async function voiceExpenseCapture(
  input: { audioDataUri: string, today: string }
): Promise<VoiceExpenseCaptureOutput> {
  return voiceExpenseCaptureFlow(input);
}

const extractFromAudioPrompt = ai.definePrompt({
  name: 'extractFromAudioPrompt',
  input: {
    schema: VoiceExpenseCaptureInputSchema,
  },
  output: {schema: VoiceExpenseCaptureOutputSchema},
  prompt: `Listen carefully to the audio and extract transaction details.

Return structured output strictly matching schema.

Rules:

* Amount:
  * Must be a NUMBER only
  * Convert spoken words to numbers (e.g. "two thousand" → 2000)
  * Convert formats like "1.5k" → 1500
  * Ignore currency words/symbols like rupees, ₹, dollars, etc.
  * If amount is unclear, return 0 (do NOT leave empty)

* Category:
  * Must be EXACTLY one of:
    food, groceries, travel, shopping, bills, entertainment, health, other
  * Map common brands/services:
    zomato, swiggy, restaurant → food
    uber, ola, petrol → travel
    amazon, flipkart → shopping

* Description:
  * Keep short (max 5 words)
  * Capture main purpose clearly

* Date:
  * Format: YYYY-MM-DD
  * If not mentioned, use: {{today}}

Instructions:
* Do NOT skip any field
* Do NOT return empty values
* Be precise and consistent

Audio: {{media url=audioDataUri}}`,
});

const voiceExpenseCaptureFlow = ai.defineFlow(
  {
    name: 'voiceExpenseCaptureFlow',
    inputSchema: VoiceExpenseCaptureInputSchema,
    outputSchema: VoiceExpenseCaptureOutputSchema,
  },
  async input => {
    try {
      const result = await extractFromAudioPrompt(input);

      if (!result.output) throw new Error("No output generated from AI");

      return result.output;
    } catch (err: any) {
      console.error("[voiceExpenseCaptureFlow] Error:", err.message);
      return {
        amount: 0,
        category: 'other',
        description: 'Voice entry',
        date: input.today,
      };
    }
  }
);
