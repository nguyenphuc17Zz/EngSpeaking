"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CircumlocutionTask,
  SurvivalScenarioTask,
  SurvivalEvaluationResult,
  SurvivalSessionSummary,
  SurvivalSessionConfig,
  SurvivalSessionMode,
  SurvivalKind,
  SurvivalAdaptiveState,
  SurvivalSkillMastery,
  SurvivalSessionHistoryEntry,
} from "@/types/survival-speaking";
import {
  SEED_CIRCUMLOCUTION_TASKS,
  SEED_SURVIVAL_SCENARIOS,
} from "@/lib/foundation/survival/seed-survival";
import {
  INITIAL_SURVIVAL_ADAPTIVE_STATE,
  INITIAL_SURVIVAL_MASTERY,
  updateSurvivalAdaptiveProgression,
  updateSurvivalMastery,
} from "@/lib/foundation/survival/adaptive-engine";
import { updateFoundationProfileFromScore } from "@/lib/foundation/services/progress.service";
import { resolveTopicForPrompt } from "@/lib/foundation/sentence-builder/topics";

interface SurvivalStoreState {
  // Kind (giữ key `mode` để tương thích UI cũ) + session
  mode: SurvivalKind;
  sessionMode: SurvivalSessionMode;
  sessionConfig: SurvivalSessionConfig;
  sessionStartedAt: string | null;
  completedTasksCount: number;
  currentTaskIndex: number;
  sessionHistory: SurvivalSessionHistoryEntry[];
  isSessionCompleted: boolean;
  sessionSummary: SurvivalSessionSummary | null;

  // Topic (chuẩn SB/VN-EN)
  selectedTopicId: string;
  customTopicText: string;
  setSelectedTopic: (topicId: string, customText?: string) => void;

  currentCircumTask: CircumlocutionTask | null;
  currentScenarioTask: SurvivalScenarioTask | null;

  isGenerating: boolean;
  isPreloadingNext: boolean;
  isRegeneratingAI: boolean;
  isEvaluating: boolean;
  generationError: string | null;

  // Interactive (chuẩn SB/VN-EN, đưa từ page local state vào store)
  hintTier: 0 | 1 | 2 | 3 | 4;
  attemptCount: number;
  lastEvaluation: SurvivalEvaluationResult | null;
  autoStartMic: boolean;
  prepCountdown: number | null;
  isCountingDown: boolean;
  isSayItBetterMode: boolean;

  // Legacy session stats (giữ để không vỡ summary modal cũ)
  sessionAttempts: number;
  sessionSuccesses: number;
  sessionLatencies: number[];

  adaptiveState: SurvivalAdaptiveState;
  skillMastery: SurvivalSkillMastery;

  // Actions
  setMode: (mode: SurvivalKind) => void;
  clearGenerationError: () => void;
  initSession: (mode?: SurvivalSessionMode) => Promise<void>;
  finishSessionManually: () => void;
  fetchNextCircumTask: (
    difficulty?: "easy" | "medium" | "hard",
    forceSource?: "bank" | "ai" | "auto"
  ) => Promise<void>;
  fetchNextScenarioTask: (
    context?: string,
    forceSource?: "bank" | "ai" | "auto"
  ) => Promise<void>;
  fetchCurrentKindTask: (forceSource?: "bank" | "ai" | "auto") => Promise<void>;
  generateNewTaskWithAI: () => Promise<void>;
  preloadNextTask: () => Promise<void>;
  processEvaluation: (evalResult: SurvivalEvaluationResult) => void;
  advanceToNextTask: () => void;
  setHintTier: (tier: 0 | 1 | 2 | 3 | 4) => void;
  incrementAttempt: (isSayItBetter?: boolean) => void;
  setAutoStartMic: (val: boolean) => void;
  setPrepCountdown: (val: number | null) => void;
  setIsCountingDown: (val: boolean) => void;
  setIsEvaluating: (val: boolean) => void;
  resetSessionStats: () => void;
  resetSession: () => void;
  getSessionSummary: () => SurvivalSessionSummary;
}

const DEFAULT_SESSION_CONFIGS: Record<SurvivalSessionMode, Omit<SurvivalSessionConfig, "kind">> = {
  endless: { mode: "endless", targetCount: 0, autoStartMic: false, prepTimeSec: 2.5 },
  quick: { mode: "quick", targetCount: 4, autoStartMic: false, prepTimeSec: 2.5 },
  standard: { mode: "standard", targetCount: 10, autoStartMic: false, prepTimeSec: 2.5 },
  deep: { mode: "deep", targetCount: 20, autoStartMic: false, prepTimeSec: 2.0 },
};

async function readProviderModel() {
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
  return { provider, model };
}

function buildSummary(
  history: SurvivalSessionHistoryEntry[],
  sessionStartedAt: string | null,
  sessionConfig: SurvivalSessionConfig,
  kind: SurvivalKind
): SurvivalSessionSummary {
  const totalAttempts = history.length;
  const successfulAttempts = history.filter((h) => h.evaluation.isSuccessful).length;
  const recoveryRate =
    totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 100;
  const avgLat =
    totalAttempts > 0
      ? Math.round(
          history.reduce((a, h) => a + (h.evaluation.repairInitiationLatencyMs || 0), 0) / totalAttempts
        )
      : 2000;
  const firstAttemptSuccessCount = history.filter(
    (h) => h.attemptsCount === 1 && h.evaluation.isSuccessful
  ).length;
  const firstAttemptAccuracy =
    totalAttempts > 0 ? Math.round((firstAttemptSuccessCount / totalAttempts) * 100) : 100;
  const avgIndependence =
    totalAttempts > 0
      ? Math.round(
          history.reduce((a, h) => a + (h.evaluation.independenceScore ?? 100), 0) / totalAttempts
        )
      : 100;
  const avgOverall =
    totalAttempts > 0
      ? Math.round(history.reduce((a, h) => a + h.evaluation.overallScore, 0) / totalAttempts)
      : 0;

  const tabooSlips = history.filter((h) => h.evaluation.targetWordAvoided === false).length;
  const missingGenus = history.filter((h) => h.evaluation.genusDetected === false).length;
  const topWeaknessIdentified =
    tabooSlips >= 2
      ? `Lỡ nói từ cấm (${tabooSlips} lần)`
      : missingGenus >= 2
        ? "Thiếu khung chủng loại Genus (It's a kind of...)"
        : avgIndependence < 70
          ? "Phụ thuộc gợi ý, cần tự lập hơn"
          : "Phản xạ cứu cánh theo bối cảnh";

  return {
    totalAttempts,
    successfulAttempts,
    recoveryRate,
    averageLatencyMs: avgLat,
    strongestSkill: kind === "circumlocution" ? "Circumlocution" : "Buying Time",
    needsWorkSkill: topWeaknessIdentified,
    sessionId: `surv_sess_${Date.now()}`,
    mode: sessionConfig.mode,
    kind,
    startedAt: sessionStartedAt || new Date().toISOString(),
    completedAt: new Date().toISOString(),
    completedTasks: totalAttempts,
    firstAttemptSuccessCount,
    firstAttemptAccuracy,
    averageIndependence: avgIndependence,
    averageOverallScore: avgOverall,
    masteryDelta: Math.min(10, Math.max(2, Math.round(avgOverall / 15))),
    practicedSkills:
      kind === "circumlocution"
        ? ["Circumlocution", "Genus + Differentia", "Spoken Retrieval"]
        : ["Buying Time", "Clarification", "Spoken Retrieval"],
    topWeaknessIdentified,
    recommendedNextAction:
      tabooSlips > 0
        ? "Luyện lại với hint T3 (khung câu) rồi giảm dần về T0 để cai từ cấm."
        : "Duy trì 5 phút mỗi ngày, giảm prep-time dần về 1.5s.",
    history,
  };
}

export const useSurvivalStore = create<SurvivalStoreState>()(
  persist(
    (set, get) => ({
      mode: "circumlocution",
      sessionMode: "endless",
      sessionConfig: { mode: "endless", kind: "circumlocution", targetCount: 0, autoStartMic: false, prepTimeSec: 2.5 },
      sessionStartedAt: null,
      completedTasksCount: 0,
      currentTaskIndex: 0,
      sessionHistory: [],
      isSessionCompleted: false,
      sessionSummary: null,

      selectedTopicId: "random",
      customTopicText: "",
      setSelectedTopic: (topicId: string, customText: string = "") =>
        set({ selectedTopicId: topicId, customTopicText: customText }),

      currentCircumTask: SEED_CIRCUMLOCUTION_TASKS[0],
      currentScenarioTask: SEED_SURVIVAL_SCENARIOS[0],

      isGenerating: false,
      isPreloadingNext: false,
      isRegeneratingAI: false,
      isEvaluating: false,
      generationError: null,

      hintTier: 0,
      attemptCount: 1,
      lastEvaluation: null,
      autoStartMic: false,
      prepCountdown: null,
      isCountingDown: false,
      isSayItBetterMode: false,

      sessionAttempts: 0,
      sessionSuccesses: 0,
      sessionLatencies: [],

      adaptiveState: INITIAL_SURVIVAL_ADAPTIVE_STATE,
      skillMastery: INITIAL_SURVIVAL_MASTERY,

      setMode: (mode) => {
        const { sessionConfig } = get();
        set({
          mode,
          sessionConfig: { ...sessionConfig, kind: mode },
          lastEvaluation: null,
          generationError: null,
          hintTier: 0,
          attemptCount: 1,
          isSayItBetterMode: false,
        });
        get().fetchCurrentKindTask();
      },

      clearGenerationError: () => set({ generationError: null }),

      initSession: async (mode: SurvivalSessionMode = "endless") => {
        const kind = get().mode;
        const config = {
          ...DEFAULT_SESSION_CONFIGS[mode],
          kind,
        };
        set({
          sessionMode: mode,
          sessionConfig: config,
          autoStartMic: false,
          sessionStartedAt: new Date().toISOString(),
          completedTasksCount: 0,
          currentTaskIndex: 0,
          sessionHistory: [],
          isSessionCompleted: false,
          sessionSummary: null,
          lastEvaluation: null,
          hintTier: 0,
          attemptCount: 1,
          isSayItBetterMode: false,
          generationError: null,
          sessionAttempts: 0,
          sessionSuccesses: 0,
          sessionLatencies: [],
          prepCountdown: null,
          isCountingDown: false,
        });
        await get().fetchCurrentKindTask();
      },

      finishSessionManually: () => {
        const { sessionHistory, sessionStartedAt, sessionConfig, mode } = get();
        const summary = buildSummary(sessionHistory, sessionStartedAt, sessionConfig, mode);
        set({ isSessionCompleted: true, sessionSummary: summary });
      },

      fetchNextCircumTask: async (difficulty, forceSource) => {
        set({ isGenerating: true, lastEvaluation: null, generationError: null });
        const { adaptiveState, selectedTopicId, customTopicText } = get();
        const { provider, model } = await readProviderModel();
        const effectiveTopic = resolveTopicForPrompt(selectedTopicId, customTopicText);
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
          const res = await fetch("/api/foundation/survival/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: "circumlocution",
              difficulty,
              targetDifficulty: adaptiveState.currentDifficulty,
              topic: effectiveTopic,
              prepTimeSec: adaptiveState.prepTimeSec,
              recentPrompts: adaptiveState.recentPrompts,
              recentErrors,
              pedagogicalConstraint,
              provider,
              model,
              forceSource,
            }),
          });
          const data = await res.json();
          if (data.task) {
            set({
              currentCircumTask: data.task,
              isGenerating: false,
              generationError: null,
              hintTier: 0,
              attemptCount: 1,
              lastEvaluation: null,
              isSayItBetterMode: false,
            });
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

      fetchNextScenarioTask: async (context, forceSource) => {
        set({ isGenerating: true, lastEvaluation: null, generationError: null });
        const { adaptiveState, selectedTopicId, customTopicText } = get();
        const { provider, model } = await readProviderModel();
        const effectiveTopic = resolveTopicForPrompt(selectedTopicId, customTopicText);
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
          const res = await fetch("/api/foundation/survival/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: "scenarios",
              context,
              targetDifficulty: adaptiveState.currentDifficulty,
              topic: effectiveTopic,
              prepTimeSec: adaptiveState.prepTimeSec,
              recentPrompts: adaptiveState.recentPrompts,
              recentErrors,
              pedagogicalConstraint,
              provider,
              model,
              forceSource,
            }),
          });
          const data = await res.json();
          if (data.task) {
            set({
              currentScenarioTask: data.task,
              isGenerating: false,
              generationError: null,
              hintTier: 0,
              attemptCount: 1,
              lastEvaluation: null,
              isSayItBetterMode: false,
            });
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

      fetchCurrentKindTask: async (forceSource) => {
        if (get().mode === "circumlocution") {
          await get().fetchNextCircumTask(undefined, forceSource);
        } else {
          await get().fetchNextScenarioTask(undefined, forceSource);
        }
      },

      generateNewTaskWithAI: async () => {
        set({ isRegeneratingAI: true, lastEvaluation: null, generationError: null });
        try {
          await get().fetchCurrentKindTask("ai");
          const { toast } = await import("@/lib/toast");
          toast.success("Đã tạo thử thách mới bằng AI", "Thử thách sinh tồn hoàn toàn mới");
        } catch (e: any) {
          const { toast } = await import("@/lib/toast");
          toast.error("Lỗi gọi AI", e?.message || "Không thể tạo thử thách mới");
        } finally {
          set({ isRegeneratingAI: false });
        }
      },

      preloadNextTask: async () => {
        // No-op để tránh Groq 429 (chuẩn SB/VN-EN)
      },

      processEvaluation: (evalResult) => {
        const {
          mode,
          sessionHistory,
          sessionAttempts,
          sessionSuccesses,
          sessionLatencies,
          adaptiveState,
          skillMastery,
          attemptCount,
        } = get();
        const currentTask =
          mode === "circumlocution" ? get().currentCircumTask : get().currentScenarioTask;
        if (!currentTask) {
          set({ lastEvaluation: evalResult });
          return;
        }

        // 1. Error-bank chia sẻ (map survival error → SB format)
        try {
          const { recordErrorsFromEvaluation } = require("@/lib/foundation/sentence-builder/error-bank.service") as typeof import("@/lib/foundation/sentence-builder/error-bank.service");
          recordErrorsFromEvaluation({
            overallScore: evalResult.overallScore,
            meaningScore: evalResult.conceptClarityScore,
            grammarScore: evalResult.naturalnessScore,
            naturalnessScore: evalResult.naturalnessScore,
            fluencyScore: evalResult.fluencyScore ?? 75,
            retrievalScore: evalResult.retrievalScore ?? 75,
            independenceScore: evalResult.independenceScore ?? 100,
            isCommunicativelyValid: evalResult.communicationRecovered,
            isSuccessful: evalResult.isSuccessful,
            needsRetry: !evalResult.isSuccessful,
            userTranscript: evalResult.userTranscript,
            cleanTranscript: evalResult.cleanTranscript || evalResult.userTranscript,
            latencyMs: evalResult.repairInitiationLatencyMs,
            speechDurationMs: evalResult.speechDurationMs ?? 2500,
            errors: (evalResult.errors || []).map((e) => ({
              type:
                e.type === "taboo"
                  ? ("vocabulary" as const)
                  : e.type === "strategy"
                    ? ("naturalness" as const)
                    : (e.type as "grammar" | "vocabulary" | "naturalness" | "omission"),
              severity: e.severity,
              userText: e.userText,
              correction: e.correction,
              explanation: e.explanation,
              patternKey: e.patternKey,
            })),
            betterVersion: evalResult.idealRepairVersion,
            praisePoints: evalResult.praisePoints || [],
            actionableFeedback: evalResult.actionableFeedback || evalResult.coachFeedbackVi,
            hintTierUsed: evalResult.hintTierUsed ?? get().hintTier,
            attemptNumber: evalResult.attemptNumber ?? attemptCount,
          });
        } catch {}

        // 2. Master error-bank via unified batch normalizer
        try {
          const { normalizeEvaluatedErrors } = require("@/lib/foundation/error-bank/normalize-batch.service") as typeof import("@/lib/foundation/error-bank/normalize-batch.service");
          const { ingestEvaluatedErrors } = require("@/lib/foundation/error-bank/error-bank.service") as typeof import("@/lib/foundation/error-bank/error-bank.service");
          const occurrences = normalizeEvaluatedErrors(evalResult.errors, {
            fallbackUserTranscript: evalResult.userTranscript,
            fallbackCorrection: evalResult.idealRepairVersion,
            contextSentence:
              "targetWord" in currentTask
                ? (currentTask as CircumlocutionTask).targetWord
                : (currentTask as SurvivalScenarioTask).audioPromptText,
            latencyMs: evalResult.repairInitiationLatencyMs,
            communicativelyValid: evalResult.communicationRecovered,
            wpm: evalResult.hesitationMetrics?.wpm,
          });
          if (occurrences.length > 0) {
            ingestEvaluatedErrors(occurrences, {
              sourceModule: "survival",
              responseLatencyMs: evalResult.repairInitiationLatencyMs,
              wasRetried: attemptCount > 1,
              retrySucceeded: evalResult.isSuccessful,
            });
          }
        } catch {}

        // 3. Adaptive + mastery
        const updatedAdaptive = updateSurvivalAdaptiveProgression(adaptiveState, evalResult, currentTask);
        const updatedMastery = updateSurvivalMastery(skillMastery, evalResult);

        // 4. Foundation profile
        try {
          updateFoundationProfileFromScore("controlled_speaking", evalResult.overallScore);
          updateFoundationProfileFromScore("sentence_retrieval", evalResult.retrievalScore ?? evalResult.overallScore);
        } catch {}

        set({
          lastEvaluation: evalResult,
          adaptiveState: updatedAdaptive,
          skillMastery: updatedMastery,
          sessionHistory: [
            ...sessionHistory,
            { kind: mode, task: currentTask, evaluation: evalResult, attemptsCount: attemptCount },
          ],
          sessionAttempts: sessionAttempts + 1,
          sessionSuccesses: sessionSuccesses + (evalResult.isSuccessful ? 1 : 0),
          sessionLatencies: [...sessionLatencies, evalResult.repairInitiationLatencyMs],
        });
      },

      advanceToNextTask: () => {
        const { currentTaskIndex, sessionConfig, sessionHistory, sessionStartedAt, mode } = get();
        const nextIndex = currentTaskIndex + 1;

        if (sessionConfig.mode !== "endless" && sessionConfig.targetCount > 0 && nextIndex >= sessionConfig.targetCount) {
          const summary = buildSummary(sessionHistory, sessionStartedAt, sessionConfig, mode);
          set({ isSessionCompleted: true, sessionSummary: summary });
          return;
        }

        set({
          currentTaskIndex: nextIndex,
          completedTasksCount: sessionHistory.length,
          hintTier: 0,
          attemptCount: 1,
          lastEvaluation: null,
          isSayItBetterMode: false,
        });
        get().fetchCurrentKindTask();
      },

      setHintTier: (tier) => set({ hintTier: tier }),
      incrementAttempt: (isSayItBetter = false) =>
        set((s) => ({
          attemptCount: s.attemptCount + 1,
          lastEvaluation: null,
          isSayItBetterMode: isSayItBetter,
        })),
      setAutoStartMic: (val) => set({ autoStartMic: val }),
      setPrepCountdown: (val) => set({ prepCountdown: val }),
      setIsCountingDown: (val) => set({ isCountingDown: val }),
      setIsEvaluating: (val) => set({ isEvaluating: val }),

      resetSessionStats: () => {
        set({
          sessionAttempts: 0,
          sessionSuccesses: 0,
          sessionLatencies: [],
          sessionHistory: [],
          lastEvaluation: null,
          generationError: null,
          hintTier: 0,
          attemptCount: 1,
          isSayItBetterMode: false,
        });
      },

      resetSession: () =>
        set({
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
          isSayItBetterMode: false,
        }),

      getSessionSummary: () => {
        const { sessionHistory, sessionStartedAt, sessionConfig, mode } = get();
        if (sessionHistory.length === 0) {
          const { sessionAttempts, sessionSuccesses, sessionLatencies } = get();
          const rate =
            sessionAttempts > 0 ? Math.round((sessionSuccesses / sessionAttempts) * 100) : 100;
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
        }
        return buildSummary(sessionHistory, sessionStartedAt, sessionConfig, mode);
      },
    }),
    {
      name: "survival_speaking_store_v2",
      partialize: (s) => ({
        mode: s.mode,
        skillMastery: s.skillMastery,
        adaptiveState: s.adaptiveState,
        autoStartMic: s.autoStartMic,
        selectedTopicId: s.selectedTopicId,
        customTopicText: s.customTopicText,
      }),
    }
  )
);
