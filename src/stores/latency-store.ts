"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  LatencyTask,
  LatencyEvaluation,
  LatencyDrillMode,
  LatencySessionSummary,
} from "@/types/latency-training";
import {
  LatencyState,
  INITIAL_LATENCY_STATE,
  updateAdaptiveLatencyState,
  buildLatencySessionSummary,
} from "@/lib/foundation/latency/adaptive-latency-engine";
import { updateFoundationProfileFromScore } from "@/lib/foundation/services/progress.service";

interface LatencyStoreState {
  currentTask: LatencyTask | null;
  nextTask: LatencyTask | null;
  isGenerating: boolean;
  isEvaluating: boolean;
  isPreloadingNext: boolean;

  currentDrillMode: LatencyDrillMode;
  targetCount: number;
  currentTaskIndex: number;
  sessionStartedAt: string | null;
  sessionHistory: Array<{ task: LatencyTask; evaluation: LatencyEvaluation }>;
  isSessionCompleted: boolean;
  sessionSummary: LatencySessionSummary | null;

  lastEvaluation: LatencyEvaluation | null;
  adaptiveState: LatencyState;
  generationError: string | null;

  // Actions
  clearGenerationError: () => void;
  initSession: (mode: LatencyDrillMode, targetCount?: number) => Promise<void>;
  fetchFirstTask: () => Promise<void>;
  preloadNextTask: () => Promise<void>;
  processEvaluation: (evaluation: LatencyEvaluation) => void;
  advanceToNextTask: () => void;
  setIsEvaluating: (val: boolean) => void;
  resetSession: () => void;
}

const DEFAULT_COUNTS: Record<LatencyDrillMode, number> = {
  open_response: 8,
  rapid_retrieval: 12,
  timed_countdown: 10,
  baseline_test: 10,
};

export const useLatencyStore = create<LatencyStoreState>()(
  persist(
    (set, get) => ({
      currentTask: null,
      nextTask: null,
      isGenerating: false,
      isEvaluating: false,
      isPreloadingNext: false,
      generationError: null,

      currentDrillMode: "open_response",
      targetCount: 8,
      currentTaskIndex: 0,
      sessionStartedAt: null,
      sessionHistory: [],
      isSessionCompleted: false,
      sessionSummary: null,

      lastEvaluation: null,
      adaptiveState: INITIAL_LATENCY_STATE,

      clearGenerationError: () => set({ generationError: null }),

      initSession: async (mode: LatencyDrillMode, targetCount?: number) => {
        const count = targetCount || DEFAULT_COUNTS[mode];
        set({
          currentDrillMode: mode,
          targetCount: count,
          currentTaskIndex: 0,
          sessionStartedAt: new Date().toISOString(),
          sessionHistory: [],
          isSessionCompleted: false,
          sessionSummary: null,
          currentTask: null,
          nextTask: null,
          lastEvaluation: null,
          generationError: null,
        });

        await get().fetchFirstTask();
      },

      fetchFirstTask: async () => {
        set({ isGenerating: true, generationError: null });
        const { currentDrillMode, adaptiveState } = get();

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
          const res = await fetch("/api/foundation/latency/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              drillMode: currentDrillMode,
              targetDifficulty: adaptiveState.currentDifficulty,
              targetLatencyMs: adaptiveState.currentTargetLatencyMs,
              provider,
              model,
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.task) {
            throw new Error(data.error || "Không thể tải câu hỏi phản xạ từ AI");
          }

          set({
            currentTask: data.task,
            isGenerating: false,
            lastEvaluation: null,
            generationError: null,
          });
          // Do NOT preload concurrently to avoid Groq 8000 TPM limit
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Lỗi kết nối AI khi tạo tình huống phản xạ.";
          set({ isGenerating: false, generationError: msg });
        }
      },

      preloadNextTask: async () => {
        // Kept no-op to prevent Groq 429 TPM rate limits
      },

      processEvaluation: (evaluation: LatencyEvaluation) => {
        const { currentTask, adaptiveState, sessionHistory } = get();
        if (!currentTask) return;

        const updatedAdaptive = updateAdaptiveLatencyState(adaptiveState, evaluation);

        // Update Profile
        try {
          const speedScore = Math.max(10, Math.min(100, Math.round(100 - evaluation.responseLatencyMs / 50)));
          updateFoundationProfileFromScore("response_speed", speedScore);
          updateFoundationProfileFromScore("sentence_retrieval", evaluation.accuracyScore);
        } catch {}

        set({
          lastEvaluation: evaluation,
          adaptiveState: updatedAdaptive,
          sessionHistory: [...sessionHistory, { task: currentTask, evaluation }],
        });
      },

      advanceToNextTask: () => {
        const {
          currentTaskIndex,
          targetCount,
          nextTask,
          sessionHistory,
          sessionStartedAt,
          currentDrillMode,
          adaptiveState,
        } = get();

        const nextIndex = currentTaskIndex + 1;

        if (nextIndex >= targetCount) {
          const summary = buildLatencySessionSummary(
            `lat_sess_${Date.now()}`,
            currentDrillMode,
            sessionStartedAt || new Date().toISOString(),
            sessionHistory,
            adaptiveState.baselineMedianMs
          );

          set({
            isSessionCompleted: true,
            sessionSummary: summary,
          });
          return;
        }

        if (nextTask) {
          set({
            currentTask: nextTask,
            nextTask: null,
            currentTaskIndex: nextIndex,
            lastEvaluation: null,
          });
          get().preloadNextTask();
        } else {
          set({
            currentTaskIndex: nextIndex,
            lastEvaluation: null,
          });
          get().fetchFirstTask();
        }
      },

      setIsEvaluating: (val) => set({ isEvaluating: val }),

      resetSession: () =>
        set({
          currentTask: null,
          nextTask: null,
          isGenerating: false,
          isEvaluating: false,
          isSessionCompleted: false,
          sessionSummary: null,
          lastEvaluation: null,
        }),
    }),
    {
      name: "latency_training_store_v1",
      partialize: (s) => ({ adaptiveState: s.adaptiveState }),
    }
  )
);
