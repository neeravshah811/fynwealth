'use server';
/**
 * @fileOverview A Genkit flow to extract expense details from a scanned bill or invoice.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ScanBillExpenseCaptureInputSchema = z.object({
  billImage: z
    .string()
    .describe(
      "A photo of a bill or invoice, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ScanBillExpenseCaptureInput = z.infer<typeof ScanBillExpenseCaptureInputSchema>;

const ScanBillExpenseCaptureOutputSchema = z.object({
  merchantName: z.string().describe('The name of the merchant. Use an empty string if not found.'),
  totalAmount: z.number().describe('The total amount. Use 0 if not found.'),
  transactionDate: z.string().describe('The date in YYYY-MM-DD format. Use today\'s date if not found.'),
  currency: z.string().describe('The currency symbol. Use an empty string if not found.'),
  categorySuggestion: z.string().describe('A suggested category. Use an empty string if not found.'),
});
export type ScanBillExpenseCaptureOutput = z.infer<typeof ScanBillExpenseCaptureOutputSchema>;

export async function scanBillExpenseCapture(input: ScanBillExpenseCaptureInput): Promise<ScanBillExpenseCaptureOutput> {
  return scanBillExpenseCaptureFlow(input);
}

const prompt = ai.definePrompt({
  name: 'scanBillExpensePrompt',
  input: { schema: ScanBillExpenseCaptureInputSchema },
  output: { schema: ScanBillExpenseCaptureOutputSchema },
  prompt: `You are an AI assistant specialized in extracting financial information from invoices and bills.
Extract the following details from the provided image of a bill or invoice. Ensure the transaction date is in YYYY-MM-DD format. 
If a specific piece of information is not found on the bill, return an empty string for text fields or 0 for numerical fields.

Bill Image: {{media url=billImage}}`,
});

const scanBillExpenseCaptureFlow = ai.defineFlow(
  {
    name: 'scanBillExpenseCaptureFlow',
    inputSchema: ScanBillExpenseCaptureInputSchema,
    outputSchema: ScanBillExpenseCaptureOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await prompt(input);
      if (!output) throw new Error("No output generated");
      return output;
    } catch (err: any) {
      console.error("[scanBillExpenseCaptureFlow] Error:", err.message);
      if (err.message.includes('429')) throw new Error('AI Quota Exceeded. Please try again.');
      throw new Error("Failed to scan bill. Please ensure the image is clear and try again.");
    }
  }
);
