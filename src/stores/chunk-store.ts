"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ChunkRecord,
  ChunkChainTask,
  ChunkTrainingTask,
  ChunkEvaluationResult,
  ChunkChainEvaluationResult,
  PragmaticStrategyType,
} from "@/types/chunk-automaticity";
import { SEED_CHUNK_LIBRARY } from "@/lib/foundation/chunks/seed-chunks";

interface ChunkStoreState {
  mode: "chain_builder" | "single_chunk";
  library: ChunkRecord[];
  currentChainTask: ChunkChainTask | null;
  currentSingleTask: ChunkTrainingTask | null;
  selectedChunk: ChunkRecord | null;
  selectedStrategy: PragmaticStrategyType | "all";

  isGenerating: boolean;
  isEvaluating: boolean;
  generationError: string | null;

  lastChainEvaluation: ChunkChainEvaluationResult | null;
  lastSingleEvaluation: ChunkEvaluationResult | null;

  // Actions
  setMode: (mode: "chain_builder" | "single_chunk") => void;
  setSelectedStrategy: (strategy: PragmaticStrategyType | "all") => void;
  loadLibrary: () => void;
  fetchNextChainTask: (options?: string | { topic?: string; strategy?: PragmaticStrategyType; domain?: any }) => Promise<void>;
  fetchNextSingleTask: (chunk?: ChunkRecord) => Promise<void>;
  clearGenerationError: () => void;
  saveCustomChunk: (canonicalChunk: string, meaningVi: string, type?: string) => void;
  processChainEvaluation: (evalResult: ChunkChainEvaluationResult) => void;
  processSingleEvaluation: (evalResult: ChunkEvaluationResult) => void;
  setIsEvaluating: (val: boolean) => void;
  resetSession: () => void;
}

export const useChunkStore = create<ChunkStoreState>()(
  persist(
    (set, get) => ({
      mode: "chain_builder",
      library: SEED_CHUNK_LIBRARY,
      currentChainTask: null,
      currentSingleTask: null,
      selectedChunk: null,
      selectedStrategy: "all",

      isGenerating: false,
      isEvaluating: false,
      generationError: null,

      lastChainEvaluation: null,
      lastSingleEvaluation: null,

      setMode: (mode) => {
        set({ mode, lastChainEvaluation: null, lastSingleEvaluation: null, generationError: null });
        if (mode === "chain_builder") get().fetchNextChainTask();
        else get().fetchNextSingleTask();
      },

      setSelectedStrategy: (selectedStrategy) => {
        set({ selectedStrategy });
        if (get().mode === "chain_builder") {
          get().fetchNextChainTask({
            strategy: selectedStrategy === "all" ? undefined : selectedStrategy,
          });
        }
      },

      clearGenerationError: () => set({ generationError: null }),

      loadLibrary: () => {
        const stored = get().library;
        if (!stored || stored.length === 0) {
          set({ library: SEED_CHUNK_LIBRARY });
        }
      },

      fetchNextChainTask: async (options) => {
        set({ isGenerating: true, lastChainEvaluation: null, generationError: null });

        const topic = typeof options === "string" ? options : options?.topic;
        const currentSelectedStrategy = get().selectedStrategy;
        const strategy =
          typeof options === "object" && options?.strategy
            ? options.strategy
            : currentSelectedStrategy !== "all"
            ? currentSelectedStrategy
            : undefined;
        const domain = typeof options === "object" ? options?.domain : undefined;

        let provider = "gemini";
        let model = "auto";
        try {
          const { useSettingsStore } = await import("@/stores/settings-store");
          const settings = useSettingsStore.getState();
          provider = settings.generation?.provider || settings.activeProvider || "gemini";
          model =
            settings.generation?.model ||
            (provider === "groq" ? settings.preferredGroqModel : settings.preferredGeminiModel) ||
            "auto";
        } catch {}

        try {
          const res = await fetch("/api/foundation/chunks/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "chain_builder", topic, strategy, domain, provider, model }),
          });
          const data = await res.json();
          if (data.task) {
            set({ currentChainTask: data.task, isGenerating: false, generationError: null });
          } else {
            set({
              isGenerating: false,
              generationError: data.error || "Không thể tạo bài tập Chain Builder từ AI.",
            });
          }
        } catch (e: any) {
          set({
            isGenerating: false,
            generationError: e?.message || "Lỗi kết nối khi gọi AI tạo bài tập.",
          });
        }
      },

      fetchNextSingleTask: async (chunk) => {
        set({ isGenerating: true, lastSingleEvaluation: null, generationError: null });
        const target = chunk || get().selectedChunk || get().library[0];

        let provider = "gemini";
        let model = "auto";
        try {
          const { useSettingsStore } = await import("@/stores/settings-store");
          const settings = useSettingsStore.getState();
          provider = settings.generation?.provider || settings.activeProvider || "gemini";
          model =
            settings.generation?.model ||
            (provider === "groq" ? settings.preferredGroqModel : settings.preferredGeminiModel) ||
            "auto";
        } catch {}

        try {
          const res = await fetch("/api/foundation/chunks/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "single_chunk", chunk: target, provider, model }),
          });
          const data = await res.json();
          if (data.task) {
            set({
              currentSingleTask: data.task,
              selectedChunk: target,
              isGenerating: false,
              generationError: null,
            });
          } else {
            set({
              isGenerating: false,
              generationError: data.error || "Không thể tạo bài tập Single Chunk từ AI.",
            });
          }
        } catch (e: any) {
          set({
            isGenerating: false,
            generationError: e?.message || "Lỗi kết nối khi gọi AI tạo bài tập.",
          });
        }
      },

      saveCustomChunk: (canonicalChunk, meaningVi, type = "sentence_frame") => {
        const custom: ChunkRecord = {
          id: `chunk_custom_${Date.now()}`,
          familyKey: canonicalChunk.toLowerCase().replace(/[^a-z0-9]/g, "_"),
          canonicalChunk,
          meaningVi,
          type: type as ChunkRecord["type"],
          difficulty: 3,
          functionName: "Custom Learner Chunk",
          variants: [
            {
              id: "v1",
              expression: canonicalChunk,
              register: "neutral",
              exampleSentence: `You can use "${canonicalChunk}" in daily conversation.`,
            },
          ],
          exampleSentences: [`For example, ${canonicalChunk}`],
          masteryScore: 30,
          retrievalLatencyMs: 2500,
          stage: "exposure",
          practiceCount: 0,
          successCount: 0,
          independentSuccessCount: 0,
          isCustomUserChunk: true,
        };

        const updated = [custom, ...get().library];
        set({ library: updated });
      },

      processChainEvaluation: (evalResult) => {
        set({ lastChainEvaluation: evalResult });
      },

      processSingleEvaluation: (evalResult) => {
        set({ lastSingleEvaluation: evalResult });
        // Update mastery in library
        const { selectedChunk, library } = get();
        if (selectedChunk) {
          const delta = evalResult.masteryDelta;
          const updatedLib = library.map((c) =>
            c.id === selectedChunk.id
              ? {
                  ...c,
                  masteryScore: Math.min(100, Math.max(0, c.masteryScore + delta)),
                  practiceCount: c.practiceCount + 1,
                  successCount: c.successCount + (evalResult.isSuccessful ? 1 : 0),
                  retrievalLatencyMs: evalResult.retrievalLatencyMs,
                }
              : c
          );
          set({ library: updatedLib });
        }
      },

      setIsEvaluating: (val) => set({ isEvaluating: val }),

      resetSession: () => {
        set({
          lastChainEvaluation: null,
          lastSingleEvaluation: null,
          isGenerating: false,
          isEvaluating: false,
        });
      },
    }),
    {
      name: "chunk_automaticity_store_v1",
      partialize: (s) => ({ library: s.library }),
    }
  )
);
