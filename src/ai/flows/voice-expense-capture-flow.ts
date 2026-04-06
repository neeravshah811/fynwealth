'use server';
/**
 * @fileOverview A Genkit flow for capturing expense details from voice input.
 * Strictly tuned for high-precision extraction following specific parsing rules.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VoiceExpenseCaptureOutputSchema = z.object({
  amount: z.number().nullable().describe('The extracted numeric amount. Return null if missing.'),
  category: z.enum(["food", "groceries", "travel", "shopping", "bills", "entertainment", "health", "other"]),
  description: z.string().describe('A short meaningful summary (max 5 words).'),
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
  prompt: `You are a JSON generator. Extract transaction details from the given voice input.

Input: {{media url=audioDataUri}}

Return ONLY a raw JSON object. Do NOT include:
* markdown
* code blocks
* backticks
* explanations
* extra text

Output format:
{
"amount": number,
"category": "food | groceries | travel | shopping | bills | entertainment | health | other",
"description": string
}

Strict Rules:
* Output must start with { and end with }
* No text before or after JSON
* Amount must be a number only (no symbols, no text)
* Convert words to numbers (e.g. "two thousand" → 2000)
* Convert formats like "1k" → 1000, "1.5k" → 1500
* Ignore currency symbols like ₹, $, etc.
* Category must be EXACTLY one from the list
* Category must be lowercase
* Description must be short (max 5 words)
* If amount is missing, return null
* If category is unclear, return "other"

Example:
Input: Spent 1200 on groceries from Dmart
Output:
{
"amount": 1200,
"category": "groceries",
"description": "dmart groceries"
}`,
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
      return {
        amount: null,
        category: 'other',
        description: 'Voice entry',
      };
    }
  }
);
