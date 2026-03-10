import { config } from 'dotenv';
config();

import '@/ai/flows/unnecessary-expense-identification.ts';
import '@/ai/flows/scan-bill-expense-capture.ts';
import '@/ai/flows/heavy-spending-month-prediction.ts';
import '@/ai/flows/voice-expense-capture-flow.ts';