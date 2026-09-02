"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  SentenceBuilderTask,
  SentenceBuilderEvaluation,
  SentenceBuilderSkillMastery,
  SentenceBuilderSessionConfig,
  SentenceBuilderSessionSummary,
  SessionMode,
} from "@/types/sentence-builder";
import {
  AdaptiveState,
  INITIAL_ADAPTIVE_STATE,
  INITIAL_SKILL_MASTERY,
  updateAdaptiveProgression,
  updateSkillMastery,
} from "@/lib/foundation/sentence-builder/adaptive-engine";
import { recordErrorsFromEvaluation, getTopWeakness } from "@/lib/foundation/sentence-builder/error-bank.service";
import { updateFoundationProfileFromScore } from "@/lib/foundation/services/progress.service";

interface SentenceBuilderStoreState {
  // Current Task & Queue
  currentTask: SentenceBuilderTask | null;
  nextTask: SentenceBuilderTask | null;
  isGenerating: boolean;
  isEvaluating: boolean;
  isPreloadingNext: boolean;

  // Session State
  sessionConfig: SentenceBuilderSessionConfig;
  sessionStartedAt: string | null;
  completedTasksCount: number;
  currentTaskIndex: number;
  sessionTasksHistory: Array<{
    task: SentenceBuilderTask;
    evaluation: SentenceBuilderEvaluation;
    attemptsCount: number;
  }>;
  isSessionCompleted: boolean;
  sessionSummary: SentenceBuilderSessionSummary | null;

  // Interactive State
  hintTier: 0 | 1 | 2 | 3 | 4;
  attemptCount: number;
  lastEvaluation: SentenceBuilderEvaluation | null;
  autoStartMic: boolean;
  prepCountdown: number | null;
  isCountingDown: boolean;

  // Adaptive & Profile Progress
  adaptiveState: AdaptiveState;
  skillMastery: SentenceBuilderSkillMastery;

  generationError: string | null;

  // Actions
  initSession: (mode: SessionMode) => Promise<void>;
  fetchFirstTask: () => Promise<void>;
  preloadNextTask: () => Promise<void>;
  processEvaluation: (evaluation: SentenceBuilderEvaluation) => void;
  advanceToNextTask: () => void;
  setHintTier: (tier: 0 | 1 | 2 | 3 | 4) => void;
  incrementAttempt: () => void;
  setAutoStartMic: (val: boolean) => void;
  setPrepCountdown: (val: number | null) => void;
  setIsCountingDown: (val: boolean) => void;
  clearGenerationError: () => void;
  resetSession: () => void;
}

const DEFAULT_SESSION_CONFIGS: Record<SessionMode, SentenceBuilderSessionConfig> = {
  quick: { mode: "quick", targetCount: 4, autoStartMic: true, prepTimeSec: 3.0 },
  standard: { mode: "standard", targetCount: 10, autoStartMic: true, prepTimeSec: 3.0 },
  deep: { mode: "deep", targetCount: 20, autoStartMic: true, prepTimeSec: 3.0 },
  weakness_focus: { mode: "weakness_focus", targetCount: 8, autoStartMic: true, prepTimeSec: 3.0 },
};

export const useSentenceBuilderStore = create<SentenceBuilderStoreState>()(
  persist(
    (set, get) => ({
      currentTask: null,
      nextTask: null,
      isGenerating: false,
      isEvaluating: false,
      isPreloadingNext: false,

      sessionConfig: DEFAULT_SESSION_CONFIGS.standard,
      sessionStartedAt: null,
      completedTasksCount: 0,
      currentTaskIndex: 0,
      sessionTasksHistory: [],
      isSessionCompleted: false,
      sessionSummary: null,

      hintTier: 0,
      attemptCount: 1,
      lastEvaluation: null,
      autoStartMic: true,
      prepCountdown: null,
      isCountingDown: false,

      adaptiveState: INITIAL_ADAPTIVE_STATE,
      skillMastery: INITIAL_SKILL_MASTERY,

      generationError: null,

      initSession: async (mode: SessionMode) => {
        const topWeakness = getTopWeakness();
        const config = {
          ...DEFAULT_SESSION_CONFIGS[mode],
          weaknessFocusSkill: topWeakness?.patternKey,
        };

        set({
          sessionConfig: config,
          sessionStartedAt: new Date().toISOString(),
          completedTasksCount: 0,
          currentTaskIndex: 0,
          sessionTasksHistory: [],
          isSessionCompleted: false,
          sessionSummary: null,
          currentTask: null,
          nextTask: null,
          generationError: null,
          lastEvaluation: null,
          hintTier: 0,
          attemptCount: 1,
          adaptiveState: {
            ...INITIAL_ADAPTIVE_STATE,
            prepTimeSec: config.prepTimeSec,
          },
        });

        await get().fetchFirstTask();
      },

      fetchFirstTask: async () => {
        set({ isGenerating: true, generationError: null });
        const { adaptiveState, sessionConfig } = get();
        const settings = typeof window !== "undefined" ? (await import("@/stores/settings-store")).useSettingsStore.getState() : null;
        const provider = settings?.sentenceBuilderGen?.provider || settings?.activeProvider || "gemini";
        const model =
          settings?.sentenceBuilderGen?.model ||
          (provider === "groq" ? settings?.preferredGroqModel : settings?.preferredGeminiModel) ||
          "auto";

        try {
          const res = await fetch("/api/foundation/sentence-builder/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              controlLevel: adaptiveState.currentLevel,
              targetDifficulty: adaptiveState.currentDifficulty,
              weakSkills: sessionConfig.weaknessFocusSkill ? [sessionConfig.weaknessFocusSkill] : adaptiveState.recentErrors,
              recentErrors: adaptiveState.recentErrors,
              recentPrompts: adaptiveState.recentPrompts,
              prepTimeSec: adaptiveState.prepTimeSec,
              provider,
              model,
            }),
          });

          const data = await res.json();
          if (data.success && data.task) {
            set({
              currentTask: data.task,
              isGenerating: false,
              generationError: null,
              hintTier: 0,
              attemptCount: 1,
              lastEvaluation: null,
            });
            // Preload the next task in background
            get().preloadNextTask();
          } else {
            set({
              isGenerating: false,
              generationError: data.error || "Không thể tạo bài tập bằng AI.",
            });
          }
        } catch (e) {
          set({
            isGenerating: false,
            generationError: e instanceof Error ? e.message : "Mất kết nối với máy chủ AI.",
          });
        }
      },

      preloadNextTask: async () => {
        const { adaptiveState, isPreloadingNext, sessionConfig, currentTaskIndex } = get();
        if (isPreloadingNext || currentTaskIndex + 1 >= sessionConfig.targetCount) return;

        set({ isPreloadingNext: true });
        const settings = typeof window !== "undefined" ? (await import("@/stores/settings-store")).useSettingsStore.getState() : null;
        const provider = settings?.sentenceBuilderGen?.provider || settings?.activeProvider || "gemini";
        const model =
          settings?.sentenceBuilderGen?.model ||
          (provider === "groq" ? settings?.preferredGroqModel : settings?.preferredGeminiModel) ||
          "auto";

        try {
          const res = await fetch("/api/foundation/sentence-builder/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              controlLevel: adaptiveState.currentLevel,
              targetDifficulty: adaptiveState.currentDifficulty,
              weakSkills: adaptiveState.recentErrors,
              recentErrors: adaptiveState.recentErrors,
              recentPrompts: adaptiveState.recentPrompts,
              prepTimeSec: adaptiveState.prepTimeSec,
              provider,
              model,
            }),
          });
          const data = await res.json();
          if (data.task) {
            set({ nextTask: data.task, isPreloadingNext: false });
          } else {
            set({ isPreloadingNext: false });
          }
        } catch {
          set({ isPreloadingNext: false });
        }
      },

      processEvaluation: (evaluation: SentenceBuilderEvaluation) => {
        const { currentTask, adaptiveState, skillMastery, sessionTasksHistory, attemptCount } = get();
        if (!currentTask) return;

        // 1. Record error bank
        recordErrorsFromEvaluation(evaluation);

        // 2. Update adaptive ladder
        const updatedAdaptive = updateAdaptiveProgression(adaptiveState, evaluation, currentTask);

        // 3. Update 5-D skill mastery
        const updatedMastery = updateSkillMastery(skillMastery, evaluation);

        // 4. Update foundation profile progress
        try {
          updateFoundationProfileFromScore("controlled_speaking", evaluation.overallScore);
          updateFoundationProfileFromScore("sentence_retrieval", evaluation.retrievalScore);
          updateFoundationProfileFromScore("sentence_construction", evaluation.grammarScore);
        } catch {}

        set({
          lastEvaluation: evaluation,
          adaptiveState: updatedAdaptive,
          skillMastery: updatedMastery,
          sessionTasksHistory: [
            ...sessionTasksHistory,
            { task: currentTask, evaluation, attemptsCount: attemptCount },
          ],
        });
      },

      advanceToNextTask: () => {
        const {
          currentTaskIndex,
          sessionConfig,
          nextTask,
          sessionTasksHistory,
          sessionStartedAt,
          skillMastery,
          adaptiveState,
        } = get();

        const nextIndex = currentTaskIndex + 1;

        if (nextIndex >= sessionConfig.targetCount) {
          // Complete session
          const firstAttempts = sessionTasksHistory.filter((h) => h.attemptsCount === 1 && h.evaluation.isSuccessful).length;
          const accuracy = Math.round((firstAttempts / Math.max(1, sessionTasksHistory.length)) * 100);
          const avgLatency = Math.round(
            sessionTasksHistory.reduce((acc, h) => acc + h.evaluation.latencyMs, 0) / Math.max(1, sessionTasksHistory.length)
          );
          const avgIndependence = Math.round(
            sessionTasksHistory.reduce((acc, h) => acc + h.evaluation.independenceScore, 0) / Math.max(1, sessionTasksHistory.length)
          );
          const avgOverall = Math.round(
            sessionTasksHistory.reduce((acc, h) => acc + h.evaluation.overallScore, 0) / Math.max(1, sessionTasksHistory.length)
          );

          const topWeakness = getTopWeakness();

          const summary: SentenceBuilderSessionSummary = {
            sessionId: `sb_sess_${Date.now()}`,
            mode: sessionConfig.mode,
            startedAt: sessionStartedAt || new Date().toISOString(),
            completedAt: new Date().toISOString(),
            totalTasks: sessionConfig.targetCount,
            completedTasks: sessionTasksHistory.length,
            firstAttemptSuccessCount: firstAttempts,
            firstAttemptAccuracy: accuracy,
            averageResponseLatencyMs: avgLatency,
            averageIndependence: avgIndependence,
            averageOverallScore: avgOverall,
            masteryDelta: Math.min(10, Math.max(2, Math.round(avgOverall / 15))),
            practicedSkills: ["Sentence Construction", "Spoken Retrieval", "Conversational English"],
            topWeaknessIdentified: topWeakness ? topWeakness.labelVi : "Past Tense Retrieval",
            recommendedNextAction: "Luyện thêm 5 phút bài tập tập trung: " + (topWeakness ? topWeakness.labelVi : "Khôi phục câu tức thì"),
            history: sessionTasksHistory,
          };

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
            completedTasksCount: sessionTasksHistory.length,
            hintTier: 0,
            attemptCount: 1,
            lastEvaluation: null,
          });
          // Preload the subsequent task
          get().preloadNextTask();
        } else {
          set({
            currentTaskIndex: nextIndex,
            completedTasksCount: sessionTasksHistory.length,
            hintTier: 0,
            attemptCount: 1,
            lastEvaluation: null,
          });
          get().fetchFirstTask();
        }
      },

      setHintTier: (tier) => set({ hintTier: tier }),
      incrementAttempt: () => set((s) => ({ attemptCount: s.attemptCount + 1, lastEvaluation: null })),
      setAutoStartMic: (val) => set({ autoStartMic: val }),
      setPrepCountdown: (val) => set({ prepCountdown: val }),
      setIsCountingDown: (val) => set({ isCountingDown: val }),
      clearGenerationError: () => set({ generationError: null }),
      resetSession: () =>
        set({
          currentTask: null,
          nextTask: null,
          isGenerating: false,
          isEvaluating: false,
          isSessionCompleted: false,
          sessionSummary: null,
          generationError: null,
          hintTier: 0,
          attemptCount: 1,
          lastEvaluation: null,
          prepCountdown: null,
          isCountingDown: false,
        }),
    }),
    {
      name: "sentence_builder_store_v1",
      partialize: (s) => ({
        skillMastery: s.skillMastery,
        adaptiveState: s.adaptiveState,
        autoStartMic: s.autoStartMic,
      }),
    }
  )
);
