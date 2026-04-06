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
  prompt: `Listen to the audio and extract transaction details.

Return structured data strictly matching the schema.

Rules:
* Extract amount as a number (e.g. "two thousand" → 2000, "1.5k" → 1500)
* Ignore currency symbols like ₹, $, etc.
* If amount is unclear, return 0
* Category must be ONE of: food, groceries, travel, shopping, bills, entertainment, health, other
* Description should be short (max 5 words)
* If date is not mentioned, use today's date: {{today}}

Be highly accurate. Do not leave fields empty.

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
