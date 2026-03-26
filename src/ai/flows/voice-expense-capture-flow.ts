'use server';
/**
 * @fileOverview A Genkit flow for capturing expense details from voice input.
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
  category: z
    .enum([
      'Food',
      'Transport',
      'Utilities',
      'Rent',
      'Subscriptions',
      'Shopping',
      'Entertainment',
      'Healthcare',
      'Education',
      'Other',
    ])
    .describe('The category of the expense.'),
  description: z.string().describe('A brief description of the expense.'),
  date: z
    .string()
    .describe(
      "The date the expense occurred, in YYYY-MM-DD format. If no date is specified, use today's date."
    ),
});
export type VoiceExpenseCaptureOutput = z.infer<typeof VoiceExpenseCaptureOutputSchema>;

export async function voiceExpenseCapture(
  input: VoiceExpenseCaptureInput
): Promise<VoiceExpenseCaptureOutput> {
  return voiceExpenseCaptureFlow(input);
}

// Single combined prompt to extract structured details directly from audio
const extractFromAudioPrompt = ai.definePrompt({
  name: 'extractFromAudioPrompt',
  input: {
    schema: z.object({
      audioDataUri: z.string(),
      today: z.string(),
    }),
  },
  output: {schema: VoiceExpenseCaptureOutputSchema},
  prompt: `You are an AI financial assistant called FynWealth. Listen to the provided audio and extract the following details: amount, category, description, and date.
      
Categories MUST be one of: 'Food', 'Transport', 'Utilities', 'Rent', 'Subscriptions', 'Shopping', 'Entertainment', 'Healthcare', 'Education', 'Other'. If the category is unclear, default to 'Other'.
The date should be in YYYY-MM-DD format. If no date is mentioned, use today's date: {{today}}.
The amount should be a numerical value. If no amount is clear, return 0.

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
      // Get current date for context
      const today = new Date().toISOString().split('T')[0];

      // Perform direct extraction from audio
      const result = await extractFromAudioPrompt({
        audioDataUri: input.audioDataUri,
        today,
      });

      if (!result.output) throw new Error("No output generated from AI");

      let {amount, category, description, date} = result.output;

      // Post-processing and validation for extracted fields
      if (!date || isNaN(new Date(date) as any)) {
        date = today;
      }

      if (typeof amount !== 'number' || isNaN(amount)) {
        amount = 0;
      }

      const validCategories: VoiceExpenseCaptureOutput['category'][] = [
        'Food',
        'Transport',
        'Utilities',
        'Rent',
        'Subscriptions',
        'Shopping',
        'Entertainment',
        'Healthcare',
        'Education',
        'Other',
      ];
      if (!validCategories.includes(category)) {
        category = 'Other';
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
      throw new Error("Failed to process voice input. Please speak clearly and try again.");
    }
  }
);
