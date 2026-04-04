'use server';
/**
 * @fileOverview A Genkit flow for capturing expense details from voice input.
 * Uses strict parsing rules to extract amount, category, and description.
 * 
 * - voiceExpenseCapture - Extracts amount, category, and description from audio.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VoiceExpenseCaptureInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "Audio of expense details, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type VoiceExpenseCaptureInput = z.infer<typeof VoiceExpenseCaptureInputSchema>;

const VoiceExpenseCaptureOutputSchema = z.object({
  amount: z.number().describe('The numerical amount of the expense.'),
  category: z.enum(['food', 'transport', 'shopping', 'bills', 'entertainment', 'health', 'other']).describe('One of the standard categories.'),
  description: z.string().describe('A brief, concise description of the expense.'),
  date: z.string().describe("The date in YYYY-MM-DD format."),
});
export type VoiceExpenseCaptureOutput = z.infer<typeof VoiceExpenseCaptureOutputSchema>;

export async function voiceExpenseCapture(
  input: VoiceExpenseCaptureInput
): Promise<VoiceExpenseCaptureOutput> {
  return voiceExpenseCaptureFlow(input);
}

const extractFromAudioPrompt = ai.definePrompt({
  name: 'extractFromAudioPrompt',
  input: {
    schema: z.object({
      audioDataUri: z.string(),
      today: z.string(),
    }),
  },
  output: {schema: VoiceExpenseCaptureOutputSchema},
  system: `You are an expense parser AI.

Your job is to extract:
- amount (number only)
- category (one of: food, transport, shopping, bills, entertainment, health, other)
- description (concise description of the purchase)
- date (YYYY-MM-DD format)

STRICT RULES:
- Return ONLY valid JSON. No text, no explanation.
- Convert spoken numbers into digits (e.g., "two hundred" → 200, "one fifty" → 150, "five thousand" → 5000).
- If multiple numbers are present, choose the most likely total expense amount.
- Ignore currency words like rupees, rs, ₹, bucks, dollars.
- Map the input to exactly one of the allowed categories.
- If category is unclear, return "other".
- Do NOT guess randomly.
- Use today's date ({{{today}}}) if no date is mentioned in audio. If "yesterday" is mentioned, calculate it correctly.

Examples:
Input: spent 250 on lunch  
Output: {"amount": 250, "category": "food", "description": "Lunch", "date": "{{{today}}}"}

Input: auto 80 rupees  
Output: {"amount": 80, "category": "transport", "description": "Auto ride", "date": "{{{today}}}"}

Input: bought shirt for 999 yesterday
Output: {"amount": 999, "category": "shopping", "description": "Shirt purchase", "date": "calculated_yesterday_date"}`,
  prompt: `Today's date is: {{today}}.
Extract details from this audio: {{media url=audioDataUri}}`,
});

const voiceExpenseCaptureFlow = ai.defineFlow(
  {
    name: 'voiceExpenseCaptureFlow',
    inputSchema: VoiceExpenseCaptureInputSchema,
    outputSchema: VoiceExpenseCaptureOutputSchema,
  },
  async input => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await extractFromAudioPrompt({
        audioDataUri: input.audioDataUri,
        today,
      });

      if (!result.output) throw new Error("No output generated from AI");

      return result.output;
    } catch (err: any) {
      console.error("[voiceExpenseCaptureFlow] Error:", err.message);
      // Fallback response instead of failing
      return {
        amount: 0,
        category: 'other',
        description: 'Voice entry',
        date: new Date().toISOString().split('T')[0],
      };
    }
  }
);
