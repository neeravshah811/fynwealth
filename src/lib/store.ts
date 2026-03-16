
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SUPPORTED_CURRENCIES } from "./constants";

export { SUPPORTED_CURRENCIES, SYSTEM_CATEGORIES } from "./constants";

export type Frequency = 'One-time' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Half-yearly' | 'Annually';

export type Currency = {
  code: string;
  symbol: string;
  name: string;
};

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
}

export interface AIInsights {
  predictions: any | null;
  unnecessary: any | null;
  lastGenerated: string | null;
}

interface FynWealthState {
  currency: Currency;
  profile: UserProfile | null;
  insights: AIInsights;
  viewMonth: number;
  viewYear: number;
  privacyMode: boolean;
  hasSeenTutorial: boolean;
  tutorialCompleted: boolean;
  tourStepIndex: number;
  setCurrency: (code: string) => void;
  updateProfile: (profile: UserProfile) => void;
  setViewDate: (month: number, year: number) => void;
  setInsights: (insights: Partial<AIInsights>) => void;
  togglePrivacyMode: () => void;
  setHasSeenTutorial: (seen: boolean) => void;
  setTutorialCompleted: (completed: boolean) => void;
  setTourStepIndex: (index: number) => void;
  clearAllData: () => void;
}

/**
 * Zustand Store now only manages ephemeral UI state and user preferences.
 * All transactional data (expenses, bills, budgets) has been moved to Firestore
 * to ensure real-time synchronization across multiple devices.
 */
export const useFynWealthStore = create<FynWealthState>()(
  persist(
    (set) => ({
      currency: SUPPORTED_CURRENCIES[0],
      profile: null,
      insights: {
        predictions: null,
        unnecessary: null,
        lastGenerated: null,
      },
      viewMonth: new Date().getMonth(),
      viewYear: new Date().getFullYear(),
      privacyMode: false,
      hasSeenTutorial: false,
      tutorialCompleted: false,
      tourStepIndex: 0,
      setCurrency: (code) => set((state) => ({
        currency: SUPPORTED_CURRENCIES.find(c => c.code === code) || state.currency
      })),
      updateProfile: (profile) => set({ profile }),
      setViewDate: (month, year) => set({ viewMonth: month, viewYear: year }),
      setInsights: (newInsights) => set((state) => ({
        insights: { ...state.insights, ...newInsights, lastGenerated: new Date().toISOString() }
      })),
      togglePrivacyMode: () => set((state) => ({ privacyMode: !state.privacyMode })),
      setHasSeenTutorial: (seen) => set({ hasSeenTutorial: seen }),
      setTutorialCompleted: (completed) => set({ 
        tutorialCompleted: completed,
        // Reset index when completing or starting a tour
        tourStepIndex: 0 
      }),
      setTourStepIndex: (tourStepIndex) => set({ tourStepIndex }),
      clearAllData: () => set({ 
        profile: null, privacyMode: false,
        hasSeenTutorial: false, tutorialCompleted: false, tourStepIndex: 0,
        insights: { predictions: null, unnecessary: null, lastGenerated: null },
        viewMonth: new Date().getMonth(), viewYear: new Date().getFullYear() 
      }),
    }),
    { name: 'fynwealth_ui_preferences_v1' }
  )
);
