"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ChunkRecord,
  ChunkChainTask,
  ChunkTrainingTask,
  ChunkEvaluationResult,
  ChunkChainEvaluationResult,
  ChunkSessionSummary,
  PragmaticStrategyType,
} from "@/types/chunk-automaticity";
import { SEED_CHUNK_LIBRARY } from "@/lib/foundation/chunks/seed-chunks";
import { resolveTopicForPrompt } from "@/lib/foundation/sentence-builder/topics";

interface ChunkStoreState {
  mode: "chain_builder" | "single_chunk";
  library: ChunkRecord[];
  currentChainTask: ChunkChainTask | null;
  currentSingleTask: ChunkTrainingTask | null;
  selectedChunk: ChunkRecord | null;
  selectedStrategy: PragmaticStrategyType | "all";

  // Topic selector
  selectedTopicId: string;
  customTopicText: string;

  // Session tracking
  completedTasksCount: number;
  currentTaskIndex: number;
  sessionHistory: Array<{
    task: ChunkChainTask | ChunkTrainingTask;
    evaluation: ChunkChainEvaluationResult | ChunkEvaluationResult;
  }>;
  isSessionCompleted: boolean;
  sessionSummary: ChunkSessionSummary | null;
  sessionStartedAt: string | null;

  isGenerating: boolean;
  isRegeneratingAI: boolean;
  isEvaluating: boolean;
  generationError: string | null;

  lastChainEvaluation: ChunkChainEvaluationResult | null;
  lastSingleEvaluation: ChunkEvaluationResult | null;

  // Actions
  setMode: (mode: "chain_builder" | "single_chunk") => void;
  setSelectedStrategy: (strategy: PragmaticStrategyType | "all") => void;
  setSelectedTopic: (topicId: string, customText?: string) => void;
  loadLibrary: () => void;
  fetchNextChainTask: (options?: string | { topic?: string; strategy?: PragmaticStrategyType; domain?: any; forceSource?: "bank" | "ai" | "auto" }) => Promise<void>;
  generateNewTaskWithAI: () => Promise<void>;
  fetchNextSingleTask: (chunk?: ChunkRecord) => Promise<void>;
  clearGenerationError: () => void;
  saveCustomChunk: (canonicalChunk: string, meaningVi: string, type?: string) => void;
  processChainEvaluation: (evalResult: ChunkChainEvaluationResult) => void;
  processSingleEvaluation: (evalResult: ChunkEvaluationResult) => void;
  setIsEvaluating: (val: boolean) => void;
  resetSession: () => void;
  finishSessionManually: () => void;
  dismissSummary: () => void;
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

      selectedTopicId: "random",
      customTopicText: "",

      completedTasksCount: 0,
      currentTaskIndex: 1,
      sessionHistory: [],
      isSessionCompleted: false,
      sessionSummary: null,
      sessionStartedAt: null,

      isGenerating: false,
      isRegeneratingAI: false,
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
          const { selectedTopicId, customTopicText } = get();
          const topic = resolveTopicForPrompt(selectedTopicId, customTopicText);
          get().fetchNextChainTask({
            topic,
            strategy: selectedStrategy === "all" ? undefined : selectedStrategy,
          });
        }
      },

      setSelectedTopic: (topicId, customText) => {
        set({ selectedTopicId: topicId, customTopicText: customText ?? "" });
        const topic = resolveTopicForPrompt(topicId, customText ?? "");
        const { mode, selectedStrategy } = get();
        if (mode === "chain_builder") {
          get().fetchNextChainTask({
            topic,
            strategy: selectedStrategy === "all" ? undefined : selectedStrategy,
          });
        } else {
          get().fetchNextSingleTask();
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
        // Start session tracking
        const { sessionStartedAt } = get();
        if (!sessionStartedAt) {
          set({ sessionStartedAt: new Date().toISOString() });
        }

        set({ isGenerating: true, lastChainEvaluation: null, generationError: null });

        const { selectedTopicId, customTopicText } = get();
        const effectiveTopic = typeof options === "string"
          ? options
          : options?.topic ?? resolveTopicForPrompt(selectedTopicId, customTopicText);

        const currentSelectedStrategy = get().selectedStrategy;
        const strategy =
          typeof options === "object" && options?.strategy
            ? options.strategy
            : currentSelectedStrategy !== "all"
            ? currentSelectedStrategy
            : undefined;
        const domain = typeof options === "object" ? options?.domain : undefined;
        const forceSource = typeof options === "object" ? options?.forceSource : undefined;

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
            body: JSON.stringify({ mode: "chain_builder", topic: effectiveTopic, strategy, domain, provider, model, forceSource }),
          });
          const data = await res.json();
          if (data.task) {
            set((s) => ({
              currentChainTask: data.task,
              isGenerating: false,
              generationError: null,
              currentTaskIndex: s.currentTaskIndex,
            }));
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

      generateNewTaskWithAI: async () => {
        set({ isRegeneratingAI: true, lastChainEvaluation: null, lastSingleEvaluation: null, generationError: null });
        try {
          if (get().mode === "chain_builder") {
            const { selectedTopicId, customTopicText, selectedStrategy } = get();
            const topic = resolveTopicForPrompt(selectedTopicId, customTopicText);
            await get().fetchNextChainTask({
              forceSource: "ai",
              topic,
              strategy: selectedStrategy === "all" ? undefined : selectedStrategy,
            });
          } else {
            await get().fetchNextSingleTask();
          }
        } finally {
          set({ isRegeneratingAI: false });
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
        const { currentChainTask, sessionHistory, completedTasksCount, currentTaskIndex } = get();
        const newHistory = currentChainTask
          ? [...sessionHistory, { task: currentChainTask, evaluation: evalResult }]
          : sessionHistory;
        set({
          lastChainEvaluation: evalResult,
          completedTasksCount: completedTasksCount + 1,
          currentTaskIndex: currentTaskIndex + 1,
          sessionHistory: newHistory,
        });
      },

      processSingleEvaluation: (evalResult) => {
        const { selectedChunk, library, currentSingleTask, sessionHistory, completedTasksCount, currentTaskIndex } = get();
        const newHistory = currentSingleTask
          ? [...sessionHistory, { task: currentSingleTask, evaluation: evalResult }]
          : sessionHistory;

        // Update mastery in library
        let updatedLib = library;
        if (selectedChunk) {
          const delta = evalResult.masteryDelta;
          updatedLib = library.map((c) =>
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
        }
        set({
          lastSingleEvaluation: evalResult,
          library: updatedLib,
          completedTasksCount: completedTasksCount + 1,
          currentTaskIndex: currentTaskIndex + 1,
          sessionHistory: newHistory,
        });
      },

      setIsEvaluating: (val) => set({ isEvaluating: val }),

      finishSessionManually: () => {
        const { sessionHistory, sessionStartedAt, completedTasksCount } = get();
        if (completedTasksCount === 0) return;

        const chainEvals = sessionHistory
          .filter((h) => "blocksUsedCount" in h.evaluation)
          .map((h) => h.evaluation as ChunkChainEvaluationResult);
        const singleEvals = sessionHistory
          .filter((h) => "chunkDetected" in h.evaluation)
          .map((h) => h.evaluation as ChunkEvaluationResult);

        const allScores = [
          ...chainEvals.map((e) => e.overallScore),
          ...singleEvals.map((e) => e.overallScore),
        ];
        const averageScore = allScores.length > 0
          ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
          : 0;

        const allLatencies = [
          ...chainEvals.map((e) => e.responseLatencyMs),
          ...singleEvals.map((e) => e.retrievalLatencyMs),
        ];
        const averageLatencyMs = allLatencies.length > 0
          ? Math.round(allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length)
          : 0;

        const blocksUsedTotal = chainEvals.reduce((sum, e) => sum + e.blocksUsedCount, 0);
        const fastRecallCount = singleEvals.filter((e) => e.retrievalLatencyMs < 2000).length;

        const strategyDistribution: Record<string, number> = {};
        sessionHistory.forEach((h) => {
          if ("pragmaticStrategy" in h.task) {
            const task = h.task as ChunkChainTask;
            const strategy = task.pragmaticStrategy || "opinion_defense";
            strategyDistribution[strategy] = (strategyDistribution[strategy] || 0) + 1;
          }
        });

        const summary: ChunkSessionSummary = {
          sessionId: `chunk_${Date.now()}`,
          startedAt: sessionStartedAt || new Date().toISOString(),
          completedAt: new Date().toISOString(),
          totalTasks: completedTasksCount,
          averageScore,
          averageLatencyMs,
          fastRecallCount,
          blocksUsedTotal,
          strategyDistribution,
          history: sessionHistory,
        };

        set({ isSessionCompleted: true, sessionSummary: summary });
      },

      dismissSummary: () => {
        set({
          isSessionCompleted: false,
          sessionSummary: null,
        });
      },

      resetSession: () => {
        set({
          lastChainEvaluation: null,
          lastSingleEvaluation: null,
          isGenerating: false,
          isEvaluating: false,
          completedTasksCount: 0,
          currentTaskIndex: 1,
          sessionHistory: [],
          isSessionCompleted: false,
          sessionSummary: null,
          sessionStartedAt: new Date().toISOString(),
        });
      },
    }),
    {
      name: "chunk_automaticity_store_v2",
      partialize: (s) => ({ library: s.library, selectedTopicId: s.selectedTopicId, selectedStrategy: s.selectedStrategy }),
    }
  )
);
