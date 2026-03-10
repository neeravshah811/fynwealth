'use server';
/**
 * @fileOverview A Genkit flow for capturing expense details from voice input.
 *
 * - voiceExpenseCapture - A function that handles the voice-to-expense capture process.
 * - VoiceExpenseCaptureInput - The input type for the voiceExpenseCapture function.
 * - VoiceExpenseCaptureOutput - The return type for the voiceExpenseCapture function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

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

// Prompt to transcribe audio into text using a multimodal model.
const transcribeAudioPrompt = ai.definePrompt({
  name: 'transcribeAudioPrompt',
  input: {schema: VoiceExpenseCaptureInputSchema},
  output: {schema: z.string().describe('The transcribed text from the audio.')},
  model: googleAI.model('gemini-1.5-pro-latest'), // Using a multimodal model for audio input
  prompt: `Transcribe the following audio into text: {{media url=audioDataUri}}`,
});

// Prompt to extract structured expense details from transcribed text.
const extractExpenseDetailsPrompt = ai.definePrompt({
  name: 'extractExpenseDetailsPrompt',
  input: {
    schema: z.object({
      transcribedText: z.string().describe('The transcribed text containing expense details.'),
    }),
  },
  output: {schema: VoiceExpenseCaptureOutputSchema},
  prompt: `Given the following transcribed expense details, extract the amount, category, description, and date.
      
Categories should be one of: 'Food', 'Transport', 'Utilities', 'Rent', 'Subscriptions', 'Shopping', 'Entertainment', 'Healthcare', 'Education', 'Other'. If the category is unclear, default to 'Other'.
The date should be in YYYY-MM-DD format. If no date is mentioned, infer from context or use today's date.
The amount should be a numerical value. If no amount is clear, infer from context or return 0.

Transcribed text: {{{transcribedText}}}`,
});

const voiceExpenseCaptureFlow = ai.defineFlow(
  {
    name: 'voiceExpenseCaptureFlow',
    inputSchema: VoiceExpenseCaptureInputSchema,
    outputSchema: VoiceExpenseCaptureOutputSchema,
  },
  async input => {
    // Step 1: Transcribe the audio into text.
    const transcriptionResult = await transcribeAudioPrompt(input);
    const transcribedText = transcriptionResult.output!;

    // Step 2: Extract structured expense details from the transcribed text.
    const extractionResult = await extractExpenseDetailsPrompt({
      transcribedText,
    });

    let {amount, category, description, date} = extractionResult.output!;

    // Post-processing and validation for extracted fields

    // Validate and set default for date
    if (!date || isNaN(new Date(date) as any)) {
      date = new Date().toISOString().split('T')[0]; // Set to today's date in YYYY-MM-DD
    }

    // Validate and set default for amount
    if (typeof amount !== 'number' || isNaN(amount)) {
      amount = 0; // Default to 0 if not a valid number
    }

    // Validate and set default for category
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
      category = 'Other'; // Default to 'Other' if not a valid category
    }

    return {
      amount,
      category,
      description,
      date,
    };
  }
);
