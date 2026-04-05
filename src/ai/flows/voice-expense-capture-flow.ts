'use server';
/**
 * @fileOverview A Genkit flow for capturing expense details from voice input.
 * Uses strict parsing rules to extract amount, category, and description.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VoiceExpenseCaptureOutputSchema = z.object({
  amount: z.number().nullable().describe('The extracted numeric amount. Return null if missing.'),
  category: z.string().describe('The best matching category.'),
  description: z.string().describe('A short summary of the transaction.'),
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
  prompt: `Extract structured transaction data from the given audio for voice capture in expense using gemini 2.0 flash.

Input: {{media url=audioDataUri}}

Output strictly in JSON:
{
"amount": number | null,
"category": string,
"description": string
}

Rules:
- Extract exact numeric amount (convert words like "two thousand" to 2000)
- Identify best matching category (e.g. food, groceries, travel, shopping, bills, entertainment)
- Keep category lowercase and single word where possible
- Description should be short summary of the transaction
- If amount is missing, return null
- Do not add any explanation, only JSON`,
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
      // Fallback response
      return {
        amount: null,
        category: 'other',
        description: 'Voice entry',
      };
    }
  }
);
