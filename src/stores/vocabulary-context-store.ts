"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  SpokenWordItem,
  WordPronunciationEvaluation,
  SentenceContextEvaluation,
} from "@/types/vocabulary-context";
import { INITIAL_DEFAULT_WORD } from "@/lib/foundation/vocabulary/default-word";

interface VocabularyStoreState {
  activeStep: 1 | 2;
  currentWord: SpokenWordItem;
  selectedSentenceIndex: number;
  recentWords: SpokenWordItem[];

  isSearching: boolean;
  isEvaluating: boolean;

  lastWordEvaluation: WordPronunciationEvaluation | null;
  lastSentenceEvaluation: SentenceContextEvaluation | null;

  // Actions
  setActiveStep: (step: 1 | 2) => void;
  setSelectedSentenceIndex: (index: number) => void;
  selectWord: (wordItem: SpokenWordItem) => void;
  shuffleRandomWord: (cefrLevel?: string) => Promise<void>;
  searchWord: (query: string, forceAI?: boolean) => Promise<void>;
  deepEnrichWithAI: () => Promise<void>;
  processWordEvaluation: (evalResult: WordPronunciationEvaluation) => void;
  processSentenceEvaluation: (evalResult: SentenceContextEvaluation) => void;
  resetEvaluations: () => void;
}

export const useVocabularyStore = create<VocabularyStoreState>()(
  persist(
    (set, get) => ({
      activeStep: 1,
      currentWord: INITIAL_DEFAULT_WORD,
      selectedSentenceIndex: 0,
      recentWords: [INITIAL_DEFAULT_WORD],

      isSearching: false,
      isEvaluating: false,

      lastWordEvaluation: null,
      lastSentenceEvaluation: null,

      setActiveStep: (activeStep) => {
        set({ activeStep, lastWordEvaluation: null, lastSentenceEvaluation: null });
      },

      setSelectedSentenceIndex: (selectedSentenceIndex) => {
        set({ selectedSentenceIndex, lastSentenceEvaluation: null });
      },

      selectWord: (wordItem) => {
        set({
          currentWord: wordItem,
          selectedSentenceIndex: 0,
          activeStep: 1,
          lastWordEvaluation: null,
          lastSentenceEvaluation: null,
        });
      },

      shuffleRandomWord: async (cefrLevel) => {
        set({ isSearching: true });
        try {
          const currentWordId = get().currentWord?.id;
          const res = await fetch("/api/foundation/vocabulary/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isRandom: true, cefrLevel, currentWordId }),
          });
          const data = await res.json();
          if (data.wordItem) {
            const { recentWords } = get();
            const exists = recentWords.some((w) => w.id === data.wordItem.id);
            const updatedRecents = exists
              ? recentWords
              : [data.wordItem, ...recentWords].slice(0, 10);

            set({
              currentWord: data.wordItem,
              selectedSentenceIndex: 0,
              activeStep: 1,
              lastWordEvaluation: null,
              lastSentenceEvaluation: null,
              recentWords: updatedRecents,
              isSearching: false,
            });
          } else {
            set({ isSearching: false });
          }
        } catch {
          set({ isSearching: false });
        }
      },

      searchWord: async (query: string, forceAI = false) => {
        const clean = query.trim();
        if (!clean) return;

        set({ isSearching: true });
        try {
          const res = await fetch("/api/foundation/vocabulary/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ word: clean, forceAI }),
          });
          const data = await res.json();
          if (data.wordItem) {
            const { recentWords } = get();
            const exists = recentWords.some((w) => w.id === data.wordItem.id);
            const updatedRecents = exists
              ? recentWords
              : [data.wordItem, ...recentWords].slice(0, 10);

            set({
              currentWord: data.wordItem,
              selectedSentenceIndex: 0,
              activeStep: 1,
              lastWordEvaluation: null,
              lastSentenceEvaluation: null,
              recentWords: updatedRecents,
              isSearching: false,
            });
          } else {
            set({ isSearching: false });
          }
        } catch {
          set({ isSearching: false });
        }
      },

      deepEnrichWithAI: async () => {
        const { currentWord } = get();
        if (!currentWord?.word) return;

        set({ isSearching: true });
        try {
          const res = await fetch("/api/foundation/vocabulary/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ word: currentWord.word, forceAI: true }),
          });
          const data = await res.json();
          if (data.wordItem) {
            const { recentWords } = get();
            const updatedRecents = recentWords.map((w) =>
              w.id === currentWord.id ? data.wordItem : w
            );
            set({
              currentWord: data.wordItem,
              recentWords: updatedRecents,
              isSearching: false,
            });
          } else {
            set({ isSearching: false });
          }
        } catch {
          set({ isSearching: false });
        }
      },

      processWordEvaluation: (evalResult) => {
        set({ lastWordEvaluation: evalResult });
        // Update mastery
        const { currentWord, recentWords } = get();
        const updated = {
          ...currentWord,
          wordMasteryScore: Math.max(currentWord.wordMasteryScore, evalResult.overallScore),
          isMastered: evalResult.overallScore >= 80,
          practiceCount: currentWord.practiceCount + 1,
        };
        const updatedList = recentWords.map((w) => (w.id === updated.id ? updated : w));
        set({ currentWord: updated, recentWords: updatedList });
      },

      processSentenceEvaluation: (evalResult) => {
        set({ lastSentenceEvaluation: evalResult });
        const { currentWord, recentWords } = get();
        const updated = {
          ...currentWord,
          sentenceMasteryScore: Math.max(currentWord.sentenceMasteryScore, evalResult.overallScore),
        };
        const updatedList = recentWords.map((w) => (w.id === updated.id ? updated : w));
        set({ currentWord: updated, recentWords: updatedList });
      },

      resetEvaluations: () => {
        set({ lastWordEvaluation: null, lastSentenceEvaluation: null });
      },
    }),
    {
      name: "vocabulary_context_store_v2",
      partialize: (s) => ({
        recentWords: s.recentWords,
        currentWord: s.currentWord,
        activeStep: s.activeStep,
      }),
    }
  )
);
