"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FoundationExercise, FoundationSession, FoundationAttempt, FoundationEvaluation } from "@/types/foundation";

interface FoundationState {
  currentExercise: FoundationExercise | null;
  currentSession: FoundationSession | null;
  lastEvaluation: FoundationEvaluation | null;
  history: Array<{ exercise: FoundationExercise; evaluation: FoundationEvaluation; attempt: FoundationAttempt }>;
  isGenerating: boolean;
  isEvaluating: boolean;
  hintLevel: number;
  currentHint: string | null;
  // actions
  setExercise: (ex: FoundationExercise | null) => void;
  setSession: (s: FoundationSession | null) => void;
  setEvaluation: (e: FoundationEvaluation | null) => void;
  pushHistory: (h: { exercise: FoundationExercise; evaluation: FoundationEvaluation; attempt: FoundationAttempt }) => void;
  setGenerating: (v: boolean) => void;
  setEvaluating: (v: boolean) => void;
  setHint: (level: number, hint: string | null) => void;
  reset: () => void;
}

export const useFoundationStore = create<FoundationState>()(
  persist(
    (set) => ({
      currentExercise: null,
      currentSession: null,
      lastEvaluation: null,
      history: [],
      isGenerating: false,
      isEvaluating: false,
      hintLevel: 0,
      currentHint: null,
      setExercise: (ex) => set({ currentExercise: ex, hintLevel: 0, currentHint: null }),
      setSession: (s) => set({ currentSession: s }),
      setEvaluation: (e) => set({ lastEvaluation: e }),
      pushHistory: (h) => {
        try {
          set((st) => ({ history: [...st.history.slice(-49), h] }));
        } catch (e) {
          // QuotaExceededError: keep only last 20
          try { set((st) => ({ history: [...st.history.slice(-19), h] })); } catch {}
        }
      },
      setGenerating: (v) => set({ isGenerating: v }),
      setEvaluating: (v) => set({ isEvaluating: v }),
      setHint: (level, hint) => set({ hintLevel: level, currentHint: hint }),
      reset: () => set({ currentExercise: null, currentSession: null, lastEvaluation: null, hintLevel: 0, currentHint: null, isGenerating: false, isEvaluating: false }),
    }),
    { name: "foundation_store", version: 1, partialize: (s) => ({ history: s.history }) }
  )
);
