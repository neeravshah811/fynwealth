'use server';
/**
 * @fileOverview A Genkit flow to extract expense details from a scanned bill or invoice.
 *
 * - scanBillExpenseCapture - A function that handles the extraction process.
 * - ScanBillExpenseCaptureInput - The input type for the scanBillExpenseCapture function.
 * - ScanBillExpenseCaptureOutput - The return type for the scanBillExpenseCapture function.
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
  merchantName: z.string().nullable().describe('The name of the merchant from the bill or invoice. Returns null if not found.'),
  totalAmount: z.number().nullable().describe('The total amount of the bill or invoice. Returns null if not found.'),
  transactionDate: z.string().nullable().describe('The date of the transaction in YYYY-MM-DD format. Returns null if not found.'),
  currency: z.string().nullable().describe('The currency symbol (e.g., $, €, ₹) of the total amount. Returns null if not found.'),
  categorySuggestion: z.string().nullable().describe('A suggested category for the expense based on the bill content. Returns null if no category can be suggested.'),
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
Extract the following details from the provided image of a bill or invoice. Ensure the transaction date is in YYYY-MM-DD format. If a specific piece of information is not found on the bill, return null for that field.

Bill Image: {{media url=billImage}}`,
});

const scanBillExpenseCaptureFlow = ai.defineFlow(
  {
    name: 'scanBillExpenseCaptureFlow',
    inputSchema: ScanBillExpenseCaptureInputSchema,
    outputSchema: ScanBillExpenseCaptureOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
