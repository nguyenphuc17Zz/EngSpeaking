"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  VNToENTask,
  VNToENEvaluation,
  VNToENSessionConfig,
  VNToENSessionSummary,
  VNToENRetrievalMode,
} from "@/types/vn-to-en";
import {
  VNAdaptiveState,
  INITIAL_VN_ADAPTIVE_STATE,
  updateVNAdaptiveState,
} from "@/lib/foundation/vn-to-en/adaptive-engine";
import { updateFoundationProfileFromScore } from "@/lib/foundation/services/progress.service";
import { recordErrorsFromEvaluation } from "@/lib/foundation/sentence-builder/error-bank.service";
import {
  getCompactErrorContextPack,
  ingestErrorOccurrence,
} from "@/lib/foundation/error-bank/error-bank.service";
import { resolveTopicForPrompt } from "@/lib/foundation/sentence-builder/topics";

interface VNToENStoreState {
  // Topic State
  selectedTopicId: string;
  customTopicText: string;
  setSelectedTopic: (topicId: string, customText?: string) => void;

  // Current Task & Preload Queue
  currentTask: VNToENTask | null;
  nextTask: VNToENTask | null;
  isGenerating: boolean;
  isEvaluating: boolean;
  isPreloadingNext: boolean;
  isRegeneratingAI: boolean;

  // Session State
  sessionConfig: VNToENSessionConfig;
  sessionStartedAt: string | null;
  completedTasksCount: number;
  currentTaskIndex: number;
  sessionHistory: Array<{
    task: VNToENTask;
    evaluation: VNToENEvaluation;
    attemptsCount: number;
  }>;
  isSessionCompleted: boolean;
  sessionSummary: VNToENSessionSummary | null;

  // Interactive State
  hintTier: 0 | 1 | 2 | 3 | 4;
  attemptCount: number;
  lastEvaluation: VNToENEvaluation | null;
  autoStartMic: boolean;
  prepCountdown: number | null;
  isCountingDown: boolean;
  isSayItBetterMode: boolean;
  generationError: string | null;

  // Adaptive Engine State
  adaptiveState: VNAdaptiveState;

  // Actions
  initSession: (mode?: VNToENRetrievalMode) => Promise<void>;
  finishSessionManually: () => void;
  fetchFirstTask: (opts?: { forceSource?: "ai" | "bank" | "auto" }) => Promise<void>;
  generateNewTaskWithAI: () => Promise<void>;
  preloadNextTask: () => Promise<void>;
  processEvaluation: (evaluation: VNToENEvaluation) => void;
  advanceToNextTask: () => void;
  setHintTier: (tier: 0 | 1 | 2 | 3 | 4) => void;
  incrementAttempt: (isSayItBetter?: boolean) => void;
  setAutoStartMic: (val: boolean) => void;
  setPrepCountdown: (val: number | null) => void;
  setIsCountingDown: (val: boolean) => void;
  setIsEvaluating: (val: boolean) => void;
  clearGenerationError: () => void;
  resetSession: () => void;
}

const DEFAULT_CONFIGS: Record<VNToENRetrievalMode, VNToENSessionConfig> = {
  endless: { mode: "endless", targetCount: 0, autoStartMic: false, prepTimeSec: 2.0 },
  direct: { mode: "direct", targetCount: 8, autoStartMic: false, prepTimeSec: 2.5 },
  timed: { mode: "timed", targetCount: 10, autoStartMic: false, prepTimeSec: 2.0 },
  rapid_fire: { mode: "rapid_fire", targetCount: 12, autoStartMic: false, prepTimeSec: 1.0 },
};

export const useVNToENStore = create<VNToENStoreState>()(
  persist(
    (set, get) => ({
      currentTask: null,
      nextTask: null,
      isGenerating: false,
      isEvaluating: false,
      isPreloadingNext: false,
      isRegeneratingAI: false,

      sessionConfig: DEFAULT_CONFIGS.endless,
      sessionStartedAt: null,
      completedTasksCount: 0,
      currentTaskIndex: 0,
      sessionHistory: [],
      isSessionCompleted: false,
      sessionSummary: null,

      // Topic Defaults
      selectedTopicId: "random",
      customTopicText: "",
      setSelectedTopic: (topicId: string, customText: string = "") =>
        set({ selectedTopicId: topicId, customTopicText: customText }),

      hintTier: 0,
      attemptCount: 1,
      lastEvaluation: null,
      autoStartMic: false,
      prepCountdown: null,
      isCountingDown: false,
      isSayItBetterMode: false,
      generationError: null,

      adaptiveState: INITIAL_VN_ADAPTIVE_STATE,

      clearGenerationError: () => set({ generationError: null }),

      initSession: async (mode: VNToENRetrievalMode = "endless") => {
        const config = DEFAULT_CONFIGS[mode] || DEFAULT_CONFIGS.endless;
        set({
          sessionConfig: config,
          autoStartMic: false,
          sessionStartedAt: new Date().toISOString(),
          completedTasksCount: 0,
          currentTaskIndex: 0,
          sessionHistory: [],
          isSessionCompleted: false,
          sessionSummary: null,
          currentTask: null,
          nextTask: null,
          lastEvaluation: null,
          hintTier: 0,
          attemptCount: 1,
          isSayItBetterMode: false,
          generationError: null,
          adaptiveState: {
            ...INITIAL_VN_ADAPTIVE_STATE,
            prepTimeSec: config.prepTimeSec,
          },
        });

        await get().fetchFirstTask();
      },

      fetchFirstTask: async (opts) => {
        set({ isGenerating: true, generationError: null });
        const { adaptiveState, sessionConfig, selectedTopicId, customTopicText } = get();
        const effectiveTopic = resolveTopicForPrompt(selectedTopicId, customTopicText);

        // Read active provider & model from settings
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
          const res = await fetch("/api/foundation/vn-to-en/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              retrievalMode: sessionConfig.mode,
              targetDifficulty: adaptiveState.currentDifficulty,
              recentErrors,
              pedagogicalConstraint,
              topic: effectiveTopic,
              provider,
              model,
              forceSource: opts?.forceSource,
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
              isSayItBetterMode: false,
            });
            // Do NOT preload concurrently to avoid Groq 8000 TPM limit
          } else {
            set({
              isGenerating: false,
              generationError: data.error || "Không thể tạo bài tập từ AI. Vui lòng thử lại.",
            });
          }
        } catch (err) {
          set({
            isGenerating: false,
            generationError: err instanceof Error ? err.message : "Lỗi kết nối mạng khi tạo bài tập.",
          });
        }
      },

      generateNewTaskWithAI: async () => {
        set({ isRegeneratingAI: true, generationError: null });
        const { adaptiveState, sessionConfig, selectedTopicId, customTopicText } = get();
        const effectiveTopic = resolveTopicForPrompt(selectedTopicId, customTopicText);
        const settings = typeof window !== "undefined" ? (await import("@/stores/settings-store")).useSettingsStore.getState() : null;
        const provider = settings?.activeProvider || "gemini";
        const model = (provider === "groq" ? settings?.preferredGroqModel : settings?.preferredGeminiModel) || "auto";

        try {
          const res = await fetch("/api/foundation/vn-to-en/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              retrievalMode: sessionConfig.mode,
              targetDifficulty: adaptiveState.currentDifficulty,
              topic: effectiveTopic,
              provider,
              model,
              forceSource: "ai",
            }),
          });

          const data = await res.json();
          if (data.success && data.task) {
            set({
              currentTask: data.task,
              isRegeneratingAI: false,
              generationError: null,
              hintTier: 0,
              attemptCount: 1,
              lastEvaluation: null,
              isSayItBetterMode: false,
            });
            const { toast } = await import("@/lib/toast");
            toast.success("Đã tạo câu mới bằng AI", `Chủ đề: ${data.task.category || "Giao tiếp"}`);
          } else {
            set({
              isRegeneratingAI: false,
              generationError: data.error || "Không thể tạo câu mới bằng AI.",
            });
            const { toast } = await import("@/lib/toast");
            toast.error("Lỗi gọi AI", data.error || "Không thể tạo câu mới bằng AI");
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Lỗi kết nối mạng khi tạo bài tập.";
          set({
            isRegeneratingAI: false,
            generationError: msg,
          });
          const { toast } = await import("@/lib/toast");
          toast.error("Lỗi gọi AI", msg);
        }
      },

      preloadNextTask: async () => {
        // Kept no-op to prevent Groq 429 TPM rate limits
      },

      processEvaluation: (evaluation: VNToENEvaluation) => {
        const { currentTask, adaptiveState, sessionHistory, attemptCount } = get();
        if (!currentTask) return;

        // 1. Record error bank via unified normalize-batch (shared + master)
        try {
          recordErrorsFromEvaluation({
            overallScore: evaluation.overallScore,
            meaningScore: evaluation.meaningScore,
            grammarScore: evaluation.grammarScore,
            naturalnessScore: evaluation.naturalnessScore,
            fluencyScore: evaluation.fluencyScore,
            retrievalScore: evaluation.retrievalScore,
            independenceScore: evaluation.independenceScore,
            isCommunicativelyValid: evaluation.isCommunicativelyValid,
            isSuccessful: evaluation.isSuccessful,
            needsRetry: evaluation.needsRetry,
            userTranscript: evaluation.userTranscript,
            cleanTranscript: evaluation.cleanTranscript,
            latencyMs: evaluation.responseLatencyMs,
            speechDurationMs: evaluation.speechDurationMs,
            errors: evaluation.errors.map((e) => ({
              type: e.type === "article" || e.type === "preposition" ? "grammar" : e.type,
              severity: e.severity,
              userText: e.userText,
              correction: e.correction,
              explanation: e.explanation,
              patternKey: e.patternKey,
            })),
            betterVersion: evaluation.betterVersion,
            praisePoints: evaluation.praisePoints,
            actionableFeedback: evaluation.actionableFeedback,
            hintTierUsed: evaluation.hintTierUsed,
            attemptNumber: evaluation.attemptNumber,
          });

          // Ingest into Function 5 Master Error Bank via unified batch normalizer
          const { normalizeEvaluatedErrors } = require("@/lib/foundation/error-bank/normalize-batch.service") as typeof import("@/lib/foundation/error-bank/normalize-batch.service");
          const { ingestEvaluatedErrors } = require("@/lib/foundation/error-bank/error-bank.service") as typeof import("@/lib/foundation/error-bank/error-bank.service");
          const occurrences = normalizeEvaluatedErrors(evaluation.errors, {
            fallbackUserTranscript: evaluation.userTranscript,
            fallbackCorrection: evaluation.betterVersion,
            contextSentence: currentTask.promptVi,
            latencyMs: evaluation.responseLatencyMs,
            communicativelyValid: evaluation.isCommunicativelyValid,
          });
          if (occurrences.length > 0) {
            ingestEvaluatedErrors(occurrences, {
              sourceModule: "vn_to_en",
              responseLatencyMs: evaluation.responseLatencyMs,
              wasRetried: attemptCount > 1,
              retrySucceeded: evaluation.isSuccessful,
            });
          }
        } catch {}

        // 2. Update Adaptive Retrieval state
        const updatedAdaptive = updateVNAdaptiveState(adaptiveState, evaluation, currentTask);

        // 3. Update Foundation Profile metrics
        try {
          updateFoundationProfileFromScore("sentence_retrieval", evaluation.retrievalScore, {
            translationDependency: Math.max(10, 100 - evaluation.retrievalScore),
          });
          updateFoundationProfileFromScore("response_speed", Math.max(10, 100 - Math.round(evaluation.responseLatencyMs / 50)));
          updateFoundationProfileFromScore("controlled_speaking", evaluation.overallScore);
        } catch {}

        set({
          lastEvaluation: evaluation,
          adaptiveState: updatedAdaptive,
          sessionHistory: [
            ...sessionHistory,
            { task: currentTask, evaluation, attemptsCount: attemptCount },
          ],
        });
      },

      advanceToNextTask: () => {
        const {
          currentTaskIndex,
          sessionConfig,
          nextTask,
          sessionHistory,
          sessionStartedAt,
        } = get();

        const nextIndex = currentTaskIndex + 1;

        if (sessionConfig.mode !== "endless" && sessionConfig.targetCount > 0 && nextIndex >= sessionConfig.targetCount) {
          // Complete session summary calculation
          const firstAttempts = sessionHistory.filter((h) => h.attemptsCount === 1 && h.evaluation.isSuccessful).length;
          const accuracy = Math.round((firstAttempts / Math.max(1, sessionHistory.length)) * 100);
          const independentCount = sessionHistory.filter((h) => h.evaluation.hintTierUsed === 0 && h.evaluation.isSuccessful).length;
          const independentRate = Math.round((independentCount / Math.max(1, sessionHistory.length)) * 100);

          const avgLatency = Math.round(
            sessionHistory.reduce((acc, h) => acc + h.evaluation.responseLatencyMs, 0) / Math.max(1, sessionHistory.length)
          );

          const retriedTasks = sessionHistory.filter((h) => h.attemptsCount > 1);
          const retriedSuccesses = retriedTasks.filter((h) => h.evaluation.isSuccessful).length;
          const retryRecoveryRate = retriedTasks.length > 0 ? Math.round((retriedSuccesses / retriedTasks.length) * 100) : 100;

          const gapDistribution = {
            noneCount: sessionHistory.filter((h) => h.evaluation.gapType === "none").length,
            retrievalGapCount: sessionHistory.filter((h) => h.evaluation.gapType === "retrieval_gap").length,
            knowledgeGapCount: sessionHistory.filter((h) => h.evaluation.gapType === "knowledge_gap").length,
            productionGapCount: sessionHistory.filter((h) => h.evaluation.gapType === "production_gap").length,
          };

          const summary: VNToENSessionSummary = {
            sessionId: `vn_sess_${Date.now()}`,
            mode: sessionConfig.mode,
            startedAt: sessionStartedAt || new Date().toISOString(),
            completedAt: new Date().toISOString(),
            totalTasks: sessionConfig.targetCount,
            completedTasks: sessionHistory.length,
            firstAttemptSuccessCount: firstAttempts,
            firstAttemptAccuracy: accuracy,
            independentSuccessRate: independentRate,
            averageResponseLatencyMs: avgLatency,
            retryRecoveryRate,
            masteryDelta: Math.min(10, Math.max(3, Math.round(accuracy / 12))),
            gapDistribution,
            topWeaknessIdentified: gapDistribution.retrievalGapCount > 1 ? "Độ trễ truy xuất câu (>3.5s)" : "Khôi phục thì Quá khứ",
            recommendedNextAction: "Luyện thêm 1 lượt Timed Retrieval hoặc Rapid Fire để giảm thời gian phản xạ xuống dưới 2s.",
            history: sessionHistory,
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
            completedTasksCount: sessionHistory.length,
            hintTier: 0,
            attemptCount: 1,
            lastEvaluation: null,
            isSayItBetterMode: false,
          });
          get().preloadNextTask();
        } else {
          set({
            currentTaskIndex: nextIndex,
            completedTasksCount: sessionHistory.length,
            hintTier: 0,
            attemptCount: 1,
            lastEvaluation: null,
            isSayItBetterMode: false,
          });
          get().fetchFirstTask();
        }
      },

      finishSessionManually: () => {
        const { sessionConfig, sessionHistory, sessionStartedAt } = get();
        const firstAttempts = sessionHistory.filter((h) => h.attemptsCount === 1 && h.evaluation?.isSuccessful).length;
        const count = Math.max(1, sessionHistory.length);
        const accuracy = Math.round((firstAttempts / count) * 100);
        const independentCount = sessionHistory.filter((h) => h.evaluation?.hintTierUsed === 0 && h.evaluation?.isSuccessful).length;
        const independentRate = Math.round((independentCount / count) * 100);

        const avgLatency = Math.round(
          sessionHistory.reduce((acc, h) => acc + (h.evaluation?.responseLatencyMs || 0), 0) / count
        );

        const retriedTasks = sessionHistory.filter((h) => h.attemptsCount > 1);
        const retriedSuccesses = retriedTasks.filter((h) => h.evaluation?.isSuccessful).length;
        const retryRecoveryRate = retriedTasks.length > 0 ? Math.round((retriedSuccesses / retriedTasks.length) * 100) : 100;

        const gapDistribution = {
          noneCount: sessionHistory.filter((h) => h.evaluation?.gapType === "none").length,
          retrievalGapCount: sessionHistory.filter((h) => h.evaluation?.gapType === "retrieval_gap").length,
          knowledgeGapCount: sessionHistory.filter((h) => h.evaluation?.gapType === "knowledge_gap").length,
          productionGapCount: sessionHistory.filter((h) => h.evaluation?.gapType === "production_gap").length,
        };

        const summary: VNToENSessionSummary = {
          sessionId: `vn_sess_${Date.now()}`,
          mode: sessionConfig.mode,
          startedAt: sessionStartedAt || new Date().toISOString(),
          completedAt: new Date().toISOString(),
          totalTasks: sessionHistory.length,
          completedTasks: sessionHistory.length,
          firstAttemptSuccessCount: firstAttempts,
          firstAttemptAccuracy: accuracy,
          independentSuccessRate: independentRate,
          averageResponseLatencyMs: avgLatency,
          retryRecoveryRate,
          masteryDelta: Math.min(10, Math.max(3, Math.round(accuracy / 12))),
          gapDistribution,
          topWeaknessIdentified: gapDistribution.retrievalGapCount > 1 ? "Độ trễ phản xạ (>3.5s)" : "Phản xạ câu theo bối cảnh",
          recommendedNextAction: "Tiếp tục duy trì phản xạ tự nhiên mỗi ngày!",
          history: sessionHistory,
        };

        set({
          isSessionCompleted: true,
          sessionSummary: summary,
        });
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
      resetSession: () =>
        set({
          currentTask: null,
          nextTask: null,
          isGenerating: false,
          isEvaluating: false,
          isSessionCompleted: false,
          sessionSummary: null,
          hintTier: 0,
          attemptCount: 1,
          lastEvaluation: null,
          prepCountdown: null,
          isCountingDown: false,
          isSayItBetterMode: false,
        }),
    }),
    {
      name: "vn_to_en_store_v2",
      partialize: (s) => ({
        adaptiveState: s.adaptiveState,
        autoStartMic: s.autoStartMic,
      }),
    }
  )
);
