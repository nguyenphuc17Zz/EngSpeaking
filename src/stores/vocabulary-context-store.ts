"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  SpokenWordItem,
  WordPronunciationEvaluation,
  SentenceContextEvaluation,
} from "@/types/vocabulary-context";
import { INITIAL_DEFAULT_WORD } from "@/lib/foundation/vocabulary/default-word";
import {
  getRandomLexiconWord,
  resolveWordFast,
} from "@/lib/foundation/vocabulary/lexicon-db.service";
import { useSettingsStore } from "@/stores/settings-store";
import { toast } from "@/lib/toast";

interface VocabularyStoreState {
  activeStep: 1 | 2;
  currentWord: SpokenWordItem;
  selectedSentenceIndex: number;
  recentWords: SpokenWordItem[];
  historyStack: SpokenWordItem[];

  isSearching: boolean;
  isEnrichingContext: boolean;
  isEvaluating: boolean;
  aiError: string | null;

  lastWordEvaluation: WordPronunciationEvaluation | null;
  lastSentenceEvaluation: SentenceContextEvaluation | null;

  // Filter settings
  selectedCefrFilter: string;
  selectedPosFilter: string;
  setCefrFilter: (level: string) => void;
  setPosFilter: (pos: string) => void;

  // Actions
  setActiveStep: (step: 1 | 2) => void;
  setSelectedSentenceIndex: (index: number) => void;
  selectWord: (wordItem: SpokenWordItem) => void;
  goToPreviousWord: () => void;
  clearAiError: () => void;
  shuffleRandomWord: (opts?: string | { cefrLevel?: string; partOfSpeech?: string }) => Promise<void>;
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
      historyStack: [],

      selectedCefrFilter: "all",
      selectedPosFilter: "all",

      isSearching: false,
      isEnrichingContext: false,
      isEvaluating: false,
      aiError: null,

      lastWordEvaluation: null,
      lastSentenceEvaluation: null,

      clearAiError: () => set({ aiError: null }),

      setCefrFilter: (level) => {
        set({ selectedCefrFilter: level });
        get().shuffleRandomWord({ cefrLevel: level });
      },

      setPosFilter: (pos) => {
        set({ selectedPosFilter: pos });
        get().shuffleRandomWord({ partOfSpeech: pos });
      },

      setActiveStep: (activeStep) => {
        set({ activeStep, lastWordEvaluation: null, lastSentenceEvaluation: null });
      },

      setSelectedSentenceIndex: (selectedSentenceIndex) => {
        set({ selectedSentenceIndex, lastSentenceEvaluation: null });
      },

      selectWord: (wordItem) => {
        const { currentWord, historyStack = [] } = get();
        const updatedHistory =
          currentWord && currentWord.id !== wordItem.id
            ? [currentWord, ...historyStack.filter((w) => w.id !== currentWord.id)].slice(0, 20)
            : historyStack;

        set({
          currentWord: wordItem,
          historyStack: updatedHistory,
          selectedSentenceIndex: 0,
          activeStep: 1,
          lastWordEvaluation: null,
          lastSentenceEvaluation: null,
          aiError: null,
        });
      },

      goToPreviousWord: () => {
        const { historyStack } = get();
        if (!historyStack || historyStack.length === 0) {
          toast.info("Không có từ trước đó trong lịch sử");
          return;
        }

        const [prevWord, ...remainingHistory] = historyStack;
        set({
          currentWord: prevWord,
          historyStack: remainingHistory,
          selectedSentenceIndex: 0,
          activeStep: 1,
          lastWordEvaluation: null,
          lastSentenceEvaluation: null,
          aiError: null,
        });
        toast.success(`Đã quay lại từ: "${prevWord.word}"`);
      },

      shuffleRandomWord: async (opts) => {
        const cefrOpt = typeof opts === "string" ? opts : opts?.cefrLevel;
        const posOpt = typeof opts === "object" ? opts?.partOfSpeech : undefined;

        const targetCefr = cefrOpt !== undefined ? cefrOpt : get().selectedCefrFilter;
        const targetPos = posOpt !== undefined ? posOpt : get().selectedPosFilter;

        // 1. Instant optimistic transition (0ms) so user can practice phonetics immediately
        const immediateWord = getRandomLexiconWord({
          cefrLevel: targetCefr !== "all" ? targetCefr : undefined,
          partOfSpeech: targetPos !== "all" ? targetPos : undefined,
          currentWordId: get().currentWord?.id,
        });

        const { currentWord, historyStack = [], recentWords } = get();
        const updatedHistory =
          currentWord && currentWord.id !== immediateWord.id
            ? [currentWord, ...historyStack.filter((w) => w.id !== currentWord.id)].slice(0, 20)
            : historyStack;

        const exists = recentWords.some(
          (w) => w.word.toLowerCase() === immediateWord.word.toLowerCase()
        );
        const updatedRecents = exists ? recentWords : [immediateWord, ...recentWords].slice(0, 10);

        set({
          currentWord: immediateWord,
          historyStack: updatedHistory,
          selectedSentenceIndex: 0,
          activeStep: 1,
          lastWordEvaluation: null,
          lastSentenceEvaluation: null,
          recentWords: updatedRecents,
          isEnrichingContext: true,
          aiError: null,
        });

        // 2. Background AI enrichment for tailored context sentences & collocations
        try {
          const settings = useSettingsStore.getState();
          const provider = settings.activeProvider;
          const model =
            provider === "groq"
              ? settings.preferredGroqModel
              : settings.preferredGeminiModel;

          const res = await fetch("/api/foundation/vocabulary/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              word: immediateWord.word,
              forceAI: true,
              provider,
              model,
            }),
          });
          const data = await res.json();
          if (res.ok && data?.wordItem) {
            // Only apply if user hasn't switched away to another word
            const current = get().currentWord;
            if (current.word.toLowerCase() === immediateWord.word.toLowerCase()) {
              const enriched = data.wordItem;
              const { recentWords: latestRecents } = get();
              const refreshedList = latestRecents.map((w) =>
                w.word.toLowerCase() === enriched.word.toLowerCase() ? enriched : w
              );

              set({
                currentWord: {
                  ...current,
                  ...enriched,
                  wordMasteryScore: Math.max(
                    current.wordMasteryScore,
                    enriched.wordMasteryScore || 0
                  ),
                  sentenceMasteryScore: Math.max(
                    current.sentenceMasteryScore,
                    enriched.sentenceMasteryScore || 0
                  ),
                },
                recentWords: refreshedList,
                isEnrichingContext: false,
                aiError: null,
              });
            } else {
              set({ isEnrichingContext: false });
            }
          } else {
            const errMsg = data?.error || `Lỗi AI (${provider} - ${model})`;
            set({ isEnrichingContext: false, aiError: errMsg });
            toast.error("Lỗi gọi AI", errMsg, 6000);
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : "Lỗi mạng khi kết nối tới AI";
          set({ isEnrichingContext: false, aiError: errMsg });
          toast.error("Lỗi gọi AI", errMsg, 6000);
        }
      },

      searchWord: async (query: string, forceAI = true) => {
        const clean = query.trim().toLowerCase();
        if (!clean) return;

        const { currentWord, historyStack = [], recentWords } = get();
        const updatedHistory =
          currentWord
            ? [currentWord, ...historyStack.filter((w) => w.id !== currentWord.id)].slice(0, 20)
            : historyStack;

        // 1. Tầng 1 & 2: Tra cứu tức thì từ từ điển Oxford hoặc Free Dictionary API (0ms - ~100ms)
        const fastWord = await resolveWordFast(clean);

        const exists = recentWords.some(
          (w) => w.word.toLowerCase() === fastWord.word.toLowerCase()
        );
        const updatedRecents = exists ? recentWords : [fastWord, ...recentWords].slice(0, 10);

        // HIỂN THỊ NGAY TỨC THÌ (0ms) - isSearching = false để không bao giờ khóa màn hình
        set({
          currentWord: fastWord,
          historyStack: updatedHistory,
          selectedSentenceIndex: 0,
          activeStep: 1,
          lastWordEvaluation: null,
          lastSentenceEvaluation: null,
          recentWords: updatedRecents,
          isSearching: false,
          isEnrichingContext: true,
          aiError: null,
        });

        // 2. Tầng 3: Background AI Enrichment cho 3 câu ngữ cảnh thực tế đời thường
        try {
          const settings = useSettingsStore.getState();
          const provider = settings.activeProvider;
          const model =
            provider === "groq"
              ? settings.preferredGroqModel
              : settings.preferredGeminiModel;

          const res = await fetch("/api/foundation/vocabulary/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ word: clean, forceAI: true, provider, model }),
          });
          const data = await res.json();
          if (res.ok && data?.wordItem) {
            // Chỉ hợp nhất nếu người dùng vẫn đang ở từ này
            if (get().currentWord.word.toLowerCase() === clean) {
              const enriched = data.wordItem;
              const { recentWords: latestRecents } = get();
              const refreshedList = latestRecents.map((w) =>
                w.word.toLowerCase() === enriched.word.toLowerCase() ? enriched : w
              );
              set({
                currentWord: {
                  ...enriched,
                  wordMasteryScore: Math.max(get().currentWord.wordMasteryScore, enriched.wordMasteryScore || 0),
                  sentenceMasteryScore: Math.max(get().currentWord.sentenceMasteryScore, enriched.sentenceMasteryScore || 0),
                },
                recentWords: refreshedList,
                isEnrichingContext: false,
                aiError: null,
              });
            } else {
              set({ isEnrichingContext: false });
            }
          } else {
            set({ isEnrichingContext: false });
          }
        } catch {
          set({ isEnrichingContext: false });
        }
      },

      deepEnrichWithAI: async () => {
        const { currentWord } = get();
        if (!currentWord?.word) return;

        set({ isEnrichingContext: true, aiError: null });
        try {
          const settings = useSettingsStore.getState();
          const provider = settings.activeProvider;
          const model =
            provider === "groq"
              ? settings.preferredGroqModel
              : settings.preferredGeminiModel;

          const res = await fetch("/api/foundation/vocabulary/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              word: currentWord.word,
              forceAI: true,
              bypassCache: true,
              provider,
              model,
            }),
          });
          const data = await res.json();
          if (res.ok && data.wordItem) {
            const { recentWords } = get();
            const updatedRecents = recentWords.map((w) =>
              w.id === currentWord.id ? data.wordItem : w
            );
            set({
              currentWord: data.wordItem,
              recentWords: updatedRecents,
              isEnrichingContext: false,
              aiError: null,
            });
            toast.success(`Đã làm mới câu ví dụ bằng AI (${provider})!`);
          } else {
            const errMsg = data?.error || `Lỗi gọi AI (${provider} - ${model})`;
            set({ isEnrichingContext: false, aiError: errMsg });
            toast.error("Lỗi làm mới câu ví dụ", errMsg, 6000);
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : "Lỗi kết nối khi làm mới câu bằng AI";
          set({ isEnrichingContext: false, aiError: errMsg });
          toast.error("Lỗi làm mới câu ví dụ", errMsg, 6000);
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
        historyStack: s.historyStack,
      }),
    }
  )
);
