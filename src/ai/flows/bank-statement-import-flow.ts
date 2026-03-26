
'use server';
/**
 * @fileOverview Hybrid Bank Statement Processing Engine.
 * deterministic parsing (Python) + Gemini intelligence layer.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, doc, getDoc, setDoc, increment, collection, addDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { format } from 'date-fns';

if (!getApps().length) {
  initializeApp(firebaseConfig);
}
const db = getFirestore();

const BankStatementInputSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  fileDataUri: z.string().describe("File as a data URI."),
  fileName: z.string().optional(),
});
export type BankStatementInput = z.infer<typeof BankStatementInputSchema>;

const TransactionSchema = z.object({
  id: z.string(),
  date: z.string(),
  description: z.string(),
  amount: z.number(),
  category: z.string(),
  confidence: z.number(),
  status: z.enum(['pending']),
  actions: z.object({
    canEdit: z.boolean(),
    canApprove: z.boolean(),
    canReject: z.boolean()
  })
});

const BankStatementOutputSchema = z.object({
  summary: z.object({
    totalTransactions: z.number(),
    totalExpense: z.number()
  }),
  review: z.object({
    editable: z.boolean(),
    bulkActions: z.object({
      approveAll: z.boolean(),
      rejectAll: z.boolean()
    }),
    instructions: z.string()
  }),
  transactions: z.array(TransactionSchema),
  insights: z.array(z.string()).optional(),
  anomalies: z.array(z.string()).optional()
});
export type BankStatementOutput = z.infer<typeof BankStatementOutputSchema>;

/**
 * Deterministic Parser Caller
 * In production, this calls a Python microservice using pdfplumber/pandas.
 */
async function callPythonParser(fileDataUri: string) {
  // Placeholder: In a real scenario, you'd fetch() your Python Cloud Run endpoint here.
  // For now, we simulate structured output from a deterministic parser.
  console.log("[PythonParser] Deterministically extracting data from file...");
  
  // Simulation of parser output
  return [
    { date: "2026-03-01", description: "SWIGGY-1234", amount: 450.00, type: "debit", balance: 10000 },
    { date: "2026-03-02", description: "AMAZON-RETAIL", amount: 1200.00, type: "debit", balance: 8800 },
    { date: "2026-03-03", description: "HDFC-EMI", amount: 5000.00, type: "debit", balance: 3800 },
    { date: "2026-03-04", description: "SALARY-CREDIT", amount: 50000.00, type: "credit", balance: 53800 },
  ];
}

/**
 * intelligencePrompt - Gemini Intelligence Layer
 */
const intelligencePrompt = ai.definePrompt({
  name: 'statementIntelligencePrompt',
  input: { schema: z.object({ transactions: z.array(z.any()) }) },
  output: { 
    schema: z.object({
      categorized: z.array(z.object({
        index: z.number(),
        category: z.string(),
        cleanDescription: z.string(),
        confidence: z.number()
      })),
      insights: z.array(z.string()),
      anomalies: z.array(z.string())
    })
  },
  prompt: `You are the financial intelligence layer for FynWealth.
Analyze the following DEBIT transactions parsed from a bank statement.

TASKS:
1. CATEGORIZE: Assign one: Food and Groceries, Shopping, Transportation, Essentials, Subscriptions, Health & Personal, Financial Commitments, Investments, Education / Kids, Life & Entertainment, Household & Family, Warranties, Personal, Miscellaneous.
2. CLEAN: Remove transaction IDs and codes.
3. INSIGHTS: Provide top categories or patterns (max 3).
4. ANOMALIES: Detect unusual spikes or non-recurring large transactions.

Transactions:
{{#each transactions}}
- Index: {{@index}}, Date: {{{date}}}, Desc: {{{description}}}, Amt: {{{amount}}}
{{/each}}`
});

export async function processBankStatement(input: BankStatementInput): Promise<BankStatementOutput> {
  const { userId, fileDataUri } = input;
  
  if (!userId) {
    throw new Error("Missing required User ID for statement processing.");
  }

  const month = format(new Date(), 'yyyy-MM');
  const usageId = `${userId}_${month}`;
  const usageRef = doc(db, 'ai_usage', usageId);

  try {
    // 1. Check Hybrid AI Usage (Limit 5 per month)
    const usageDoc = await getDoc(usageRef);
    const hybridCount = usageDoc.exists() ? (usageDoc.data().hybridStatementCount || 0) : 0;
    if (hybridCount >= 5) {
      throw new Error('Statement processing limit reached (5 per month)');
    }

    // 2. Deterministic Parsing (Python simulation)
    const parsedData = await callPythonParser(fileDataUri);
    const debitsOnly = parsedData.filter(t => t.type === "debit");

    if (debitsOnly.length === 0) {
      throw new Error("No debit transactions found in statement.");
    }

    // 3. Gemini Intelligence Layer (Single Batch Call)
    // We only send debits to save tokens and focus on expenses.
    let aiResponse;
    try {
      const { output } = await intelligencePrompt({ transactions: debitsOnly });
      aiResponse = output;
    } catch (aiErr) {
      console.warn("[HybridFlow] Gemini Intelligence failed, using fallback.", aiErr);
      // Fallback: No insights/anomalies, basic categorization
    }

    // 4. Map results back to structured schema
    const finalTransactions: any[] = debitsOnly.map((t, idx) => {
      const aiData = aiResponse?.categorized.find(c => c.index === idx);
      return {
        id: `txn_${idx}_${Date.now()}`,
        date: t.date,
        description: aiData?.cleanDescription || t.description,
        amount: t.amount,
        category: aiData?.category || "Miscellaneous",
        confidence: aiData?.confidence || 0.5,
        status: "pending",
        actions: { canEdit: true, canApprove: true, canReject: true }
      };
    });

    // 5. Store Insights/Anomalies in Firestore
    const uploadId = `up_${Date.now()}`;
    if (aiResponse) {
      await addDoc(collection(db, 'statement_results'), {
        userId,
        uploadId,
        insights: aiResponse.insights,
        anomalies: aiResponse.anomalies,
        processedAt: new Date().toISOString()
      });
    }

    // 6. Increment Usage
    await setDoc(usageRef, {
      userId,
      month,
      hybridStatementCount: increment(1),
      lastUpdated: new Date().toISOString()
    }, { merge: true });

    return {
      summary: {
        totalTransactions: finalTransactions.length,
        totalExpense: finalTransactions.reduce((s, t) => s + t.amount, 0)
      },
      review: {
        editable: true,
        bulkActions: { approveAll: true, rejectAll: true },
        instructions: "Deterministically parsed. AI categorization applied."
      },
      transactions: finalTransactions,
      insights: aiResponse?.insights,
      anomalies: aiResponse?.anomalies
    };

  } catch (err: any) {
    console.error("[processBankStatement] Error:", err.message);
    if (err.message.includes('limit reached')) throw err;
    if (err.message.includes('No debit transactions')) throw err;
    throw new Error(`Failed to process statement: ${err.message}`);
  }
}
