"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CircumlocutionTask,
  SurvivalScenarioTask,
  SurvivalEvaluationResult,
  SurvivalSessionSummary,
} from "@/types/survival-speaking";
import {
  SEED_CIRCUMLOCUTION_TASKS,
  SEED_SURVIVAL_SCENARIOS,
} from "@/lib/foundation/survival/seed-survival";

interface SurvivalStoreState {
  mode: "circumlocution" | "scenarios";
  currentCircumTask: CircumlocutionTask | null;
  currentScenarioTask: SurvivalScenarioTask | null;

  isGenerating: boolean;
  isEvaluating: boolean;
  generationError: string | null;

  lastEvaluation: SurvivalEvaluationResult | null;

  // Session stats
  sessionAttempts: number;
  sessionSuccesses: number;
  sessionLatencies: number[];

  // Actions
  setMode: (mode: "circumlocution" | "scenarios") => void;
  clearGenerationError: () => void;
  fetchNextCircumTask: (difficulty?: "easy" | "medium" | "hard") => Promise<void>;
  fetchNextScenarioTask: (context?: string) => Promise<void>;
  processEvaluation: (evalResult: SurvivalEvaluationResult) => void;
  resetSessionStats: () => void;
  getSessionSummary: () => SurvivalSessionSummary;
}

export const useSurvivalStore = create<SurvivalStoreState>()(
  persist(
    (set, get) => ({
      mode: "circumlocution",
      currentCircumTask: SEED_CIRCUMLOCUTION_TASKS[0],
      currentScenarioTask: SEED_SURVIVAL_SCENARIOS[0],

      isGenerating: false,
      isEvaluating: false,
      generationError: null,
      lastEvaluation: null,

      sessionAttempts: 0,
      sessionSuccesses: 0,
      sessionLatencies: [],

      setMode: (mode) => {
        set({ mode, lastEvaluation: null, generationError: null });
        if (mode === "circumlocution") get().fetchNextCircumTask();
        else get().fetchNextScenarioTask();
      },

      clearGenerationError: () => set({ generationError: null }),

      fetchNextCircumTask: async (difficulty = "medium") => {
        set({ isGenerating: true, lastEvaluation: null, generationError: null });

        let provider = "gemini";
        let model = "auto";
        try {
          const { useSettingsStore } = await import("@/stores/settings-store");
          const settings = useSettingsStore.getState();
          provider = settings.survivalSpeaking?.provider || settings.activeProvider || "gemini";
          model =
            settings.survivalSpeaking?.model ||
            (provider === "groq" ? settings.preferredGroqModel : settings.preferredGeminiModel) ||
            "auto";
        } catch {}

        try {
          const res = await fetch("/api/foundation/survival/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "circumlocution", difficulty, provider, model }),
          });
          const data = await res.json();
          if (data.task) {
            set({ currentCircumTask: data.task, isGenerating: false, generationError: null });
          } else {
            set({
              isGenerating: false,
              generationError: data.error || "Không thể tạo bài tập Circumlocution từ AI.",
            });
          }
        } catch (e: any) {
          set({
            isGenerating: false,
            generationError: e?.message || "Lỗi kết nối khi gọi AI tạo bài tập.",
          });
        }
      },

      fetchNextScenarioTask: async (context) => {
        set({ isGenerating: true, lastEvaluation: null, generationError: null });

        let provider = "gemini";
        let model = "auto";
        try {
          const { useSettingsStore } = await import("@/stores/settings-store");
          const settings = useSettingsStore.getState();
          provider = settings.survivalSpeaking?.provider || settings.activeProvider || "gemini";
          model =
            settings.survivalSpeaking?.model ||
            (provider === "groq" ? settings.preferredGroqModel : settings.preferredGeminiModel) ||
            "auto";
        } catch {}

        try {
          const res = await fetch("/api/foundation/survival/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "scenarios", context, provider, model }),
          });
          const data = await res.json();
          if (data.task) {
            set({ currentScenarioTask: data.task, isGenerating: false, generationError: null });
          } else {
            set({
              isGenerating: false,
              generationError: data.error || "Không thể tạo tình huống Survival Scenario từ AI.",
            });
          }
        } catch (e: any) {
          set({
            isGenerating: false,
            generationError: e?.message || "Lỗi kết nối khi gọi AI tạo bài tập.",
          });
        }
      },

      processEvaluation: (evalResult) => {
        const { sessionAttempts, sessionSuccesses, sessionLatencies } = get();
        set({
          lastEvaluation: evalResult,
          sessionAttempts: sessionAttempts + 1,
          sessionSuccesses: sessionSuccesses + (evalResult.isSuccessful ? 1 : 0),
          sessionLatencies: [...sessionLatencies, evalResult.repairInitiationLatencyMs],
        });
      },

      resetSessionStats: () => {
        set({
          sessionAttempts: 0,
          sessionSuccesses: 0,
          sessionLatencies: [],
          lastEvaluation: null,
          generationError: null,
        });
      },

      getSessionSummary: () => {
        const { sessionAttempts, sessionSuccesses, sessionLatencies } = get();
        const rate = sessionAttempts > 0 ? Math.round((sessionSuccesses / sessionAttempts) * 100) : 100;
        const avgLat =
          sessionLatencies.length > 0
            ? Math.round(sessionLatencies.reduce((a, b) => a + b, 0) / sessionLatencies.length)
            : 2000;

        return {
          totalAttempts: sessionAttempts,
          successfulAttempts: sessionSuccesses,
          recoveryRate: rate,
          averageLatencyMs: avgLat,
          strongestSkill: "Circumlocution",
          needsWorkSkill: "Buying Time",
        };
      },
    }),
    {
      name: "survival_speaking_store_v1",
      partialize: (s) => ({ mode: s.mode }),
    }
  )
);
