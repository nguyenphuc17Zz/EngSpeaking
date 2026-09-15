"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AdvancedEvaluation,
  AdvancedLevel,
  AdvancedSessionConfig,
  AdvancedSessionMode,
  AdvancedSessionSummary,
  AdvancedSkillMastery,
  AdvancedTask,
  AdvancedTrack,
  AdvancedTrainingType,
} from "@/types/advanced";
import {
  ADVANCED_LEVEL_CONFIG,
  AdvancedAdaptiveState,
  INITIAL_ADVANCED_ADAPTIVE_STATE,
  INITIAL_ADVANCED_MASTERY,
  updateAdvancedAdaptiveState,
  updateAdvancedMastery,
} from "@/lib/advanced/adaptive-engine";
import { defaultSkillTagForTrack } from "@/lib/advanced/track-map";
import { updateFoundationProfileFromScore } from "@/lib/foundation/services/progress.service";
import { resolveTopicForPrompt } from "@/lib/foundation/sentence-builder/topics";

interface AdvancedStoreState {
  selectedTrack: AdvancedTrack;
  selectedLevel: AdvancedLevel;
  selectedTopicId: string;
  customTopicText: string;
  setTrackLevel: (track: AdvancedTrack, level: AdvancedLevel) => void;
  setSelectedTopic: (topicId: string, customText?: string) => void;

  currentTask: AdvancedTask | null;
  isGenerating: boolean;
  isEvaluating: boolean;
  isRegeneratingAI: boolean;

  sessionConfig: AdvancedSessionConfig;
  sessionStartedAt: string | null;
  completedTasksCount: number;
  currentTaskIndex: number;
  sessionHistory: Array<{ task: AdvancedTask; evaluation: AdvancedEvaluation; attemptsCount: number }>;
  isSessionCompleted: boolean;
  sessionSummary: AdvancedSessionSummary | null;

  hintTier: 0 | 1 | 2 | 3 | 4;
  attemptCount: number;
  lastEvaluation: AdvancedEvaluation | null;
  autoStartMic: boolean;
  prepCountdown: number | null;
  isCountingDown: boolean;
  generationError: string | null;

  adaptiveState: AdvancedAdaptiveState;
  skillMastery: AdvancedSkillMastery;

  initSession: (opts?: {
    mode?: AdvancedSessionMode;
    track?: AdvancedTrack;
    level?: AdvancedLevel;
    skillTag?: AdvancedTrainingType;
  }) => Promise<void>;
  finishSessionManually: () => void;
  fetchFirstTask: (opts?: { forceSource?: "ai" | "bank" | "auto" }) => Promise<void>;
  generateNewTaskWithAI: () => Promise<void>;
  processEvaluation: (evaluation: AdvancedEvaluation) => void;
  advanceToNextTask: () => void;
  setHintTier: (tier: 0 | 1 | 2 | 3 | 4) => void;
  incrementAttempt: () => void;
  setAutoStartMic: (val: boolean) => void;
  setPrepCountdown: (val: number | null) => void;
  setIsCountingDown: (val: boolean) => void;
  setIsEvaluating: (val: boolean) => void;
  clearGenerationError: () => void;
  resetSession: () => void;
}

const DEFAULT_COUNTS: Record<AdvancedSessionMode, number> = {
  endless: 0,
  quick: 4,
  standard: 8,
  deep: 14,
  weakness_focus: 8,
};

function buildConfig(
  mode: AdvancedSessionMode,
  track: AdvancedTrack,
  level: AdvancedLevel,
  adaptive?: AdvancedAdaptiveState
): AdvancedSessionConfig {
  const cfg = ADVANCED_LEVEL_CONFIG[level];
  return {
    mode,
    track,
    level,
    targetCount: DEFAULT_COUNTS[mode],
    autoStartMic: false,
    prepTimeSec: adaptive?.prepTimeSec ?? cfg.prepTimeSec,
    blitzLimitSec: adaptive?.blitzLimitSec ?? cfg.blitzLimitSec,
  };
}

export const useAdvancedStore = create<AdvancedStoreState>()(
  persist(
    (set, get) => ({
      selectedTrack: "reflex",
      selectedLevel: "L1",
      selectedTopicId: "random",
      customTopicText: "",
      setTrackLevel: (track, level) => set({ selectedTrack: track, selectedLevel: level }),
      setSelectedTopic: (topicId, customText = "") => set({ selectedTopicId: topicId, customTopicText: customText }),

      currentTask: null,
      isGenerating: false,
      isEvaluating: false,
      isRegeneratingAI: false,

      sessionConfig: buildConfig("endless", "reflex", "L1"),
      sessionStartedAt: null,
      completedTasksCount: 0,
      currentTaskIndex: 0,
      sessionHistory: [],
      isSessionCompleted: false,
      sessionSummary: null,

      hintTier: 0,
      attemptCount: 1,
      lastEvaluation: null,
      autoStartMic: false,
      prepCountdown: null,
      isCountingDown: false,
      generationError: null,

      adaptiveState: INITIAL_ADVANCED_ADAPTIVE_STATE,
      skillMastery: INITIAL_ADVANCED_MASTERY,

      initSession: async (opts) => {
        const mode = opts?.mode || "endless";
        const track = opts?.track || get().selectedTrack;
        const level = opts?.level || get().adaptiveState.currentLevel || get().selectedLevel;
        const cfg = ADVANCED_LEVEL_CONFIG[level];
        set({
          selectedTrack: track,
          selectedLevel: level,
          sessionConfig: buildConfig(mode, track, level, undefined),
          sessionStartedAt: new Date().toISOString(),
          completedTasksCount: 0,
          currentTaskIndex: 0,
          sessionHistory: [],
          isSessionCompleted: false,
          sessionSummary: null,
          currentTask: null,
          lastEvaluation: null,
          hintTier: 0,
          attemptCount: 1,
          generationError: null,
          adaptiveState: {
            ...get().adaptiveState,
            currentLevel: level,
            currentDifficulty: cfg.difficulty,
            prepTimeSec: cfg.prepTimeSec,
            blitzLimitSec: cfg.blitzLimitSec,
          },
        });
        await get().fetchFirstTask();
      },

      fetchFirstTask: async (opts) => {
        set({ isGenerating: true, generationError: null });
        const { adaptiveState, sessionConfig, selectedTopicId, customTopicText } = get();
        const effectiveTopic = resolveTopicForPrompt(selectedTopicId, customTopicText);
        let provider = "gemini";
        let model = "auto";
        try {
          const { useSettingsStore } = await import("@/stores/settings-store");
          const s = useSettingsStore.getState();
          provider = s.activeProvider || "gemini";
          model = (provider === "groq" ? s.preferredGroqModel : s.preferredGeminiModel) || "auto";
        } catch {}
        let recentErrors: string[] = [];
        let pedagogicalConstraint: string | undefined;
        try {
          const { getCompactErrorContextPack, buildErrorBankPedagogicalPrompt } = await import(
            "@/lib/foundation/error-bank/error-bank.service"
          );
          const pack = getCompactErrorContextPack();
          recentErrors = pack.topWeaknesses.map((w) => w.patternKey || w.labelVi).filter(Boolean);
          pedagogicalConstraint = buildErrorBankPedagogicalPrompt() || undefined;
        } catch {}

        try {
          const res = await fetch("/api/advanced/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              track: sessionConfig.track,
              level: adaptiveState.currentLevel,
              skillTag: defaultSkillTagForTrack(sessionConfig.track),
              targetDifficulty: adaptiveState.currentDifficulty,
              topic: effectiveTopic,
              prepTimeSec: adaptiveState.prepTimeSec,
              blitzLimitSec: adaptiveState.blitzLimitSec,
              recentErrors,
              pedagogicalConstraint,
              provider,
              model,
              forceSource: opts?.forceSource,
            }),
          });
          const data = await res.json();
          if (data.success && data.task) {
            set({ currentTask: data.task, isGenerating: false, hintTier: 0, attemptCount: 1, lastEvaluation: null });
          } else {
            set({ isGenerating: false, generationError: data.error || "Không thể tạo thử thách Advanced." });
          }
        } catch (e) {
          set({ isGenerating: false, generationError: e instanceof Error ? e.message : "Mất kết nối AI." });
        }
      },

      generateNewTaskWithAI: async () => {
        set({ isRegeneratingAI: true });
        const { adaptiveState, sessionConfig, selectedTopicId, customTopicText } = get();
        const effectiveTopic = resolveTopicForPrompt(selectedTopicId, customTopicText);
        let provider = "gemini";
        let model = "auto";
        try {
          const { useSettingsStore } = await import("@/stores/settings-store");
          const s = useSettingsStore.getState();
          provider = s.activeProvider || "gemini";
          model = (provider === "groq" ? s.preferredGroqModel : s.preferredGeminiModel) || "auto";
        } catch {}
        try {
          const res = await fetch("/api/advanced/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              track: sessionConfig.track,
              level: adaptiveState.currentLevel,
              skillTag: defaultSkillTagForTrack(sessionConfig.track),
              targetDifficulty: adaptiveState.currentDifficulty,
              topic: effectiveTopic,
              prepTimeSec: adaptiveState.prepTimeSec,
              blitzLimitSec: adaptiveState.blitzLimitSec,
              provider,
              model,
              forceSource: "ai",
            }),
          });
          const data = await res.json();
          if (data.success && data.task) {
            set({ currentTask: data.task, isRegeneratingAI: false, hintTier: 0, attemptCount: 1, lastEvaluation: null });
          } else {
            set({ isRegeneratingAI: false, generationError: data.error || "Không thể tạo thử thách mới." });
          }
        } catch (e) {
          set({ isRegeneratingAI: false, generationError: e instanceof Error ? e.message : "Mất kết nối AI." });
        }
      },

      processEvaluation: (evaluation) => {
        const { currentTask, adaptiveState, skillMastery, sessionHistory, attemptCount, sessionConfig } = get();
        if (!currentTask) return;
        try {
          const { normalizeEvaluatedErrors } = require("@/lib/foundation/error-bank/normalize-batch.service") as typeof import("@/lib/foundation/error-bank/normalize-batch.service");
          const { ingestEvaluatedErrors } = require("@/lib/foundation/error-bank/error-bank.service") as typeof import("@/lib/foundation/error-bank/error-bank.service");
          const occurrences = normalizeEvaluatedErrors(
            evaluation.errors.map((e) => ({ ...e, type: e.type === "article" || e.type === "preposition" ? "grammar" : e.type })),
            {
              fallbackUserTranscript: evaluation.userTranscript,
              fallbackCorrection: evaluation.betterVersion,
              contextSentence: currentTask.promptVi,
              latencyMs: evaluation.responseLatencyMs,
              communicativelyValid: evaluation.isCommunicativelyValid,
            }
          );
          if (occurrences.length > 0) {
            ingestEvaluatedErrors(occurrences, {
              sourceModule: "advanced" as never,
              responseLatencyMs: evaluation.responseLatencyMs,
              wasRetried: attemptCount > 1,
              retrySucceeded: evaluation.isSuccessful,
            });
          }
        } catch {}
        const updatedAdaptive = updateAdvancedAdaptiveState(adaptiveState, evaluation, currentTask);
        const updatedMastery = updateAdvancedMastery(skillMastery, evaluation, sessionConfig.track);
        try {
          updateFoundationProfileFromScore("controlled_speaking", evaluation.overallScore);
          updateFoundationProfileFromScore("sentence_retrieval", evaluation.retrievalScore);
        } catch {}
        set({
          lastEvaluation: evaluation,
          adaptiveState: updatedAdaptive,
          skillMastery: updatedMastery,
          sessionHistory: [...sessionHistory, { task: currentTask, evaluation, attemptsCount: attemptCount }],
        });
      },

      advanceToNextTask: () => {
        const { currentTaskIndex, sessionConfig, sessionHistory, sessionStartedAt } = get();
        const nextIndex = currentTaskIndex + 1;
        if (sessionConfig.mode !== "endless" && sessionConfig.targetCount > 0 && nextIndex >= sessionConfig.targetCount) {
          const firstOk = sessionHistory.filter((h) => h.attemptsCount === 1 && h.evaluation.isSuccessful).length;
          const count = Math.max(1, sessionHistory.length);
          const indep = sessionHistory.filter((h) => h.evaluation.hintTierUsed === 0 && h.evaluation.isSuccessful).length;
          const avgLatency = Math.round(sessionHistory.reduce((a, h) => a + h.evaluation.responseLatencyMs, 0) / count);
          const avgOverall = Math.round(sessionHistory.reduce((a, h) => a + h.evaluation.overallScore, 0) / count);
          const avgToulmin = Math.round(sessionHistory.reduce((a, h) => a + (h.evaluation.toulmin?.toulminScore || 0), 0) / count);
          const summary: AdvancedSessionSummary = {
            sessionId: `adv_sess_${Date.now()}`,
            mode: sessionConfig.mode,
            track: sessionConfig.track,
            level: get().adaptiveState.currentLevel,
            startedAt: sessionStartedAt || new Date().toISOString(),
            completedAt: new Date().toISOString(),
            totalTasks: sessionConfig.targetCount,
            completedTasks: sessionHistory.length,
            firstAttemptSuccessCount: firstOk,
            firstAttemptAccuracy: Math.round((firstOk / count) * 100),
            independentSuccessRate: Math.round((indep / count) * 100),
            averageResponseLatencyMs: avgLatency,
            averageOverallScore: avgOverall,
            averageToulminScore: avgToulmin,
            masteryDelta: Math.min(10, Math.max(2, Math.round(avgOverall / 15))),
            practicedSkills: [sessionConfig.track, ...sessionHistory.slice(-3).flatMap((h) => h.task.skills).slice(0, 3)],
            topWeaknessIdentified: get().adaptiveState.recentErrors[0] || "Lập luận Toulmin",
            recommendedNextAction: "Tiếp tục track tiếp theo hoặc lên level khi streak ≥3.",
            history: sessionHistory,
          };
          set({ isSessionCompleted: true, sessionSummary: summary });
          return;
        }
        set({
          currentTaskIndex: nextIndex,
          completedTasksCount: sessionHistory.length,
          hintTier: 0,
          attemptCount: 1,
          lastEvaluation: null,
        });
        void get().fetchFirstTask();
      },

      finishSessionManually: () => {
        const { sessionConfig, sessionHistory, sessionStartedAt } = get();
        const count = Math.max(1, sessionHistory.length);
        const firstOk = sessionHistory.filter((h) => h.attemptsCount === 1 && h.evaluation?.isSuccessful).length;
        const indep = sessionHistory.filter((h) => h.evaluation?.hintTierUsed === 0 && h.evaluation?.isSuccessful).length;
        const avgLatency = Math.round(sessionHistory.reduce((a, h) => a + (h.evaluation?.responseLatencyMs || 0), 0) / count);
        const avgOverall = Math.round(sessionHistory.reduce((a, h) => a + (h.evaluation?.overallScore || 0), 0) / count);
        const avgToulmin = Math.round(sessionHistory.reduce((a, h) => a + (h.evaluation?.toulmin?.toulminScore || 0), 0) / count);
        const summary: AdvancedSessionSummary = {
          sessionId: `adv_sess_${Date.now()}`,
          mode: sessionConfig.mode,
          track: sessionConfig.track,
          level: get().adaptiveState.currentLevel,
          startedAt: sessionStartedAt || new Date().toISOString(),
          completedAt: new Date().toISOString(),
          totalTasks: sessionHistory.length,
          completedTasks: sessionHistory.length,
          firstAttemptSuccessCount: firstOk,
          firstAttemptAccuracy: Math.round((firstOk / count) * 100),
          independentSuccessRate: Math.round((indep / count) * 100),
          averageResponseLatencyMs: avgLatency,
          averageOverallScore: avgOverall,
          averageToulminScore: avgToulmin,
          masteryDelta: Math.min(10, Math.max(2, Math.round(avgOverall / 15))),
          practicedSkills: [sessionConfig.track],
          topWeaknessIdentified: get().adaptiveState.recentErrors[0] || "Phản xạ nâng cao",
          recommendedNextAction: "Duy trì luyện tập mỗi ngày để giữ streak.",
          history: sessionHistory,
        };
        set({ isSessionCompleted: true, sessionSummary: summary });
      },

      setHintTier: (tier) => set({ hintTier: tier }),
      incrementAttempt: () => set((s) => ({ attemptCount: s.attemptCount + 1, lastEvaluation: null })),
      setAutoStartMic: (val) => set({ autoStartMic: val }),
      setPrepCountdown: (val) => set({ prepCountdown: val }),
      setIsCountingDown: (val) => set({ isCountingDown: val }),
      setIsEvaluating: (val) => set({ isEvaluating: val }),
      clearGenerationError: () => set({ generationError: null }),
      resetSession: () =>
        set({
          currentTask: null,
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
      name: "advanced_store_v1",
      partialize: (s) => ({
        skillMastery: s.skillMastery,
        adaptiveState: s.adaptiveState,
        autoStartMic: s.autoStartMic,
        selectedTrack: s.selectedTrack,
        selectedLevel: s.selectedLevel,
        selectedTopicId: s.selectedTopicId,
        customTopicText: s.customTopicText,
      }),
    }
  )
);
