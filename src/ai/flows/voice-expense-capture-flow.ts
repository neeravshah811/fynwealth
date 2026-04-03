'use server';
/**
 * @fileOverview A Genkit flow for capturing expense details from voice input.
 * Optimized for low-latency transcription and extraction.
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
  category: z.string().describe('Suggested category name.'),
  description: z.string().describe('A brief description.'),
  date: z
    .string()
    .describe(
      "The date in YYYY-MM-DD format. Default to today if missing."
    ),
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
  prompt: `Listen and extract: amount (number), category, description, date (YYYY-MM-DD). 
Use today's date if not mentioned: {{today}}. 
Use 0 for unknown amount.

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
      const today = new Date().toISOString().split('T')[0];
      const result = await extractFromAudioPrompt({
        audioDataUri: input.audioDataUri,
        today,
      });

      if (!result.output) throw new Error("No output generated from AI");

      let {amount, category, description, date} = result.output;

      if (!date || isNaN(new Date(date) as any)) {
        date = today;
      }

      if (typeof amount !== 'number' || isNaN(amount)) {
        amount = 0;
      }

      return {
        amount,
        category,
        description,
        date,
      };
    } catch (err: any) {
      console.error("[voiceExpenseCaptureFlow] Error:", err.message);
      if (err.message.includes('429')) throw new Error('AI Quota Exceeded. Please try again.');
      throw new Error("Failed to process voice input. Please speak clearly.");
    }
  }
);
