'use server';
/**
 * @fileOverview A Genkit flow for capturing expense details from voice input.
 * Uses strict parsing rules to extract amount, category, and description.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VoiceExpenseCaptureOutputSchema = z.object({
  amount: z.number().nullable().describe('The extracted numeric amount. Return null if missing.'),
  category: z.enum(["food", "groceries", "travel", "shopping", "bills", "entertainment", "health", "other"]),
  description: z.string().describe('A short meaningful summary (max 5-6 words).'),
});
export type VoiceExpenseCaptureOutput = z.infer<typeof VoiceExpenseCaptureOutputSchema>;

export async function voiceExpenseCapture(
  input: { audioDataUri: string }
): Promise<VoiceExpenseCaptureOutput> {
  return voiceExpenseCaptureFlow(input);
}

const extractFromAudioPrompt = ai.definePrompt({
  name: 'extractFromAudioPrompt',
  input: {
    schema: z.object({
      audioDataUri: z.string(),
    }),
  },
  output: {schema: VoiceExpenseCaptureOutputSchema},
  prompt: `Extract transaction details from the given voice input.

Input: {{media url=audioDataUri}}

Return ONLY valid JSON (no explanation, no extra text).

Rules:
- Extract the exact amount as a number
- Convert words to numbers (e.g. "two thousand" → 2000)
- Convert formats like "1k" → 1000, "1.5k" → 1500
- Ignore currency symbols like ₹, $, etc.
- Choose ONLY one category from the given list: food, groceries, travel, shopping, bills, entertainment, health, other
- Keep category in lowercase
- Description should be short and meaningful (max 5–6 words)
- If amount is not found, return null
- If category is unclear, return "other"
- Output must be strictly valid JSON (no text before or after)`,
});

const voiceExpenseCaptureFlow = ai.defineFlow(
  {
    name: 'voiceExpenseCaptureFlow',
    inputSchema: z.object({ audioDataUri: z.string() }),
    outputSchema: VoiceExpenseCaptureOutputSchema,
  },
  async input => {
    try {
      const result = await extractFromAudioPrompt({
        audioDataUri: input.audioDataUri,
      });

      if (!result.output) throw new Error("No output generated from AI");

      return result.output;
    } catch (err: any) {
      console.error("[voiceExpenseCaptureFlow] Error:", err.message);
      // Fallback response following the rules
      return {
        amount: null,
        category: 'other',
        description: 'Voice entry',
      };
    }
  }
);
