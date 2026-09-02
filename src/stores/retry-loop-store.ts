"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  RetrySession,
  TargetedCorrection,
  RepairEvaluationResult,
  SpokenRepairMetric,
} from "@/types/retry-loop";
import { createRetrySession, recordRetryAttemptInSession } from "@/lib/foundation/retry-loop/retry-engine";

interface RetryLoopStoreState {
  activeSession: RetrySession | null;
  isEvaluatingRepair: boolean;
  isGeneratingCorrection: boolean;
  isGeneratingChallenge: boolean;
  isSimplifying: boolean;
  lastRepairResult: RepairEvaluationResult | null;
  generationError: string | null;
  metrics: SpokenRepairMetric;

  // Actions
  clearGenerationError: () => void;
  generateAiRepairChallenge: (category?: string) => Promise<void>;

  startRepairSession: (params: {
    originalTaskId: string;
    sourceContext: "sentence_builder" | "vn_to_en" | "shadowing" | "conversation" | "retry_lab";
    originalPrompt: string;
    originalTranscript: string;
    expectedSentence: string;
    detectedErrors?: Array<{ type: string; userText: string; correction: string; explanation: string }>;
  }) => Promise<void>;

  submitRepairSpokenAttempt: (params: {
    spokenTranscript: string;
    responseLatencyMs: number;
    speechDurationMs: number;
    expectedSentence: string;
  }) => Promise<RepairEvaluationResult | null>;

  incrementModelExposure: () => void;
  triggerCognitiveSimplification: () => Promise<void>;
  closeActiveSession: () => void;
}

const INITIAL_METRICS: SpokenRepairMetric = {
  totalErrorsRequiringRetry: 0,
  resolvedOnFirstRetryCount: 0,
  totalResolvedCount: 0,
  selfCorrectionCount: 0,
  errorRecoveryRate: 100,
  firstRetrySuccessRate: 100,
  averageRepairAttempts: 1.2,
  recentRepairedPatterns: [],
};

export const useRetryLoopStore = create<RetryLoopStoreState>()(
  persist(
    (set, get) => ({
      activeSession: null,
      isEvaluatingRepair: false,
      isGeneratingCorrection: false,
      isGeneratingChallenge: false,
      isSimplifying: false,
      lastRepairResult: null,
      generationError: null,
      metrics: INITIAL_METRICS,

      clearGenerationError: () => set({ generationError: null }),

      // Generate a fresh AI Spoken Repair Challenge on the fly
      generateAiRepairChallenge: async (category) => {
        set({ isGeneratingChallenge: true, generationError: null, lastRepairResult: null });

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
          const res = await fetch("/api/foundation/retry-loop/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category,
              provider,
              model,
              recentPatterns: get().metrics.recentRepairedPatterns,
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.success || !data.challenge) {
            throw new Error(data.error || "Không thể tạo bài tập sửa lỗi từ AI");
          }

          const ch = data.challenge;
          const targetedCorrection: TargetedCorrection = {
            errorType: ch.category === "sentence_structure" ? "grammar" : (ch.category as any) || "grammar",
            priority: 2,
            patternKey: ch.id || "ai_repair_challenge",
            whatToFix: ch.whatToFix || "Sửa lỗi khẩu ngữ",
            userErroneousText: ch.userErroneousText || ch.erroneousSentence,
            minimalCorrection: ch.betterSentence,
            explanationVi: ch.explanationVi || "Hãy sửa lại câu này cho đúng ngữ pháp và tự nhiên.",
            betterSentence: ch.betterSentence,
            skeletonHint: ch.skeletonHint,
            simplifiedSentence: ch.simplifiedSentence,
            hints: ch.hints,
            suggestedVocabulary: ch.suggestedVocabulary,
          };

          const session = createRetrySession({
            originalTaskId: ch.id,
            sourceContext: "retry_lab",
            originalPrompt: ch.targetIntent || ch.situationVi,
            originalTranscript: ch.erroneousSentence,
            targetCorrection: targetedCorrection,
          });

          const currentMetrics = get().metrics;
          set({
            activeSession: session,
            isGeneratingChallenge: false,
            generationError: null,
            metrics: {
              ...currentMetrics,
              totalErrorsRequiringRetry: currentMetrics.totalErrorsRequiringRetry + 1,
            },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Lỗi kết nối AI khi tạo thử thách sửa lỗi.";
          set({ isGeneratingChallenge: false, generationError: msg });
        }
      },

      startRepairSession: async ({
        originalTaskId,
        sourceContext,
        originalPrompt,
        originalTranscript,
        expectedSentence,
        detectedErrors,
      }) => {
        set({ isGeneratingCorrection: true, generationError: null, lastRepairResult: null });

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
          const res = await fetch("/api/foundation/retry-loop/correction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: originalPrompt,
              userTranscript: originalTranscript,
              expectedSentence,
              detectedErrors,
              provider,
              model,
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.targetedCorrection) {
            throw new Error(data.error || "Không thể phân tích lỗi sửa");
          }

          const session = createRetrySession({
            originalTaskId,
            sourceContext,
            originalPrompt,
            originalTranscript,
            targetCorrection: data.targetedCorrection,
          });

          const currentMetrics = get().metrics;
          set({
            activeSession: session,
            isGeneratingCorrection: false,
            generationError: null,
            metrics: {
              ...currentMetrics,
              totalErrorsRequiringRetry: currentMetrics.totalErrorsRequiringRetry + 1,
            },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Lỗi kết nối AI khi phân tích sửa lỗi.";
          set({ isGeneratingCorrection: false, generationError: msg });
        }
      },

      submitRepairSpokenAttempt: async ({
        spokenTranscript,
        responseLatencyMs,
        speechDurationMs,
        expectedSentence,
      }) => {
        const { activeSession, metrics } = get();
        if (!activeSession) return null;

        set({ isEvaluatingRepair: true });

        let provider = "gemini";
        let model = "auto";
        try {
          const { useSettingsStore } = await import("@/stores/settings-store");
          const settings = useSettingsStore.getState();
          provider = settings.evaluation?.provider || settings.activeProvider || "gemini";
          model =
            settings.evaluation?.model ||
            (provider === "groq" ? settings.preferredGroqModel : settings.preferredGeminiModel) ||
            "auto";
        } catch {}

        try {
          const res = await fetch("/api/foundation/retry-loop/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              targetCorrection: activeSession.targetCorrection,
              userRetryTranscript: spokenTranscript,
              originalTranscript: activeSession.originalTranscript,
              expectedSentence,
              attemptNumber: activeSession.currentAttemptNumber,
              provider,
              model,
            }),
          });

          const data = await res.json();
          if (data.evaluation) {
            const evalResult: RepairEvaluationResult = data.evaluation;
            const updatedSession = recordRetryAttemptInSession(activeSession, {
              spokenTranscript,
              responseLatencyMs,
              speechDurationMs,
              evalResult,
              supportLevel: activeSession.isSimplified ? 3 : activeSession.currentAttemptNumber > 1 ? 2 : 1,
              modelPlaybackCount: activeSession.modelExposureCount,
            });

            // Update Metrics
            const isFirstAttemptSuccess = evalResult.isSuccessful && activeSession.currentAttemptNumber === 1;
            const totalResolved = metrics.totalResolvedCount + (evalResult.isSuccessful ? 1 : 0);
            const resolvedFirst = metrics.resolvedOnFirstRetryCount + (isFirstAttemptSuccess ? 1 : 0);
            const totalReq = Math.max(1, metrics.totalErrorsRequiringRetry);

            const updatedMetrics: SpokenRepairMetric = {
              ...metrics,
              totalResolvedCount: totalResolved,
              resolvedOnFirstRetryCount: resolvedFirst,
              selfCorrectionCount: metrics.selfCorrectionCount + (evalResult.selfCorrectionDetected ? 1 : 0),
              errorRecoveryRate: Math.min(100, Math.round((totalResolved / totalReq) * 100)),
              firstRetrySuccessRate: Math.min(100, Math.round((resolvedFirst / totalReq) * 100)),
              recentRepairedPatterns: evalResult.isSuccessful
                ? Array.from(new Set([...metrics.recentRepairedPatterns.slice(-5), activeSession.targetCorrection.patternKey]))
                : metrics.recentRepairedPatterns,
            };

            set({
              activeSession: updatedSession,
              lastRepairResult: evalResult,
              isEvaluatingRepair: false,
              metrics: updatedMetrics,
            });

            return evalResult;
          }
          set({ isEvaluatingRepair: false });
          return null;
        } catch {
          set({ isEvaluatingRepair: false });
          return null;
        }
      },

      incrementModelExposure: () => {
        const { activeSession } = get();
        if (!activeSession) return;
        set({
          activeSession: {
            ...activeSession,
            modelExposureCount: activeSession.modelExposureCount + 1,
          },
        });
      },

      triggerCognitiveSimplification: async () => {
        const { activeSession } = get();
        if (!activeSession) return;

        set({ isSimplifying: true });
        try {
          const res = await fetch("/api/foundation/retry-loop/simplify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              originalPromptVi: activeSession.originalPrompt,
              originalEnglish: activeSession.targetCorrection.betterSentence,
              targetErrorPattern: activeSession.targetCorrection.patternKey,
            }),
          });

          const data = await res.json();
          if (data.simplification) {
            set({
              isSimplifying: false,
              activeSession: {
                ...activeSession,
                isSimplified: true,
                targetCorrection: {
                  ...activeSession.targetCorrection,
                  simplifiedSentence: data.simplification.simplifiedEnglish,
                },
              },
            });
          } else {
            set({ isSimplifying: false });
          }
        } catch {
          set({ isSimplifying: false });
        }
      },

      closeActiveSession: () => set({ activeSession: null, lastRepairResult: null }),
    }),
    {
      name: "retry_loop_store_v1",
      partialize: (s) => ({ metrics: s.metrics }),
    }
  )
);
