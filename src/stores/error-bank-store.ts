"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  MasterErrorRecord,
  MainErrorCategory,
  ErrorStatus,
  FossilizationLevel,
  CompactErrorContextPack,
  SpokenDiagnosticReport,
  DrillSessionMode,
  DrillSessionConfig,
  DrillAdaptiveState,
  DrillSkillMastery,
  DrillEvaluationResult,
  DrillHistoryEntry,
  DrillSessionSummary,
} from "@/types/error-bank";
import {
  getMasterErrorBank,
  flagErrorAsFalsePositive,
  advanceSpacedReviewStage,
  getCompactErrorContextPack,
  calculatePriorityScore,
} from "@/lib/foundation/error-bank/error-bank.service";
import {
  INITIAL_DRILL_ADAPTIVE_STATE,
  INITIAL_DRILL_MASTERY,
  updateDrillAdaptiveProgression,
  updateDrillMastery,
} from "@/lib/foundation/error-bank/drill-adaptive-engine";
import { computeFastPassDrill } from "@/lib/foundation/error-bank/drill-fast-pass.service";
import { updateFoundationProfileFromScore } from "@/lib/foundation/services/progress.service";

export type { DrillEvaluationResult, DrillSessionSummary, DrillHistoryEntry };

// Backward-compat aliases (page/components import these from store)
export interface DrillHistoryItem extends DrillHistoryEntry {}
export interface DrillSessionSummaryLegacy extends DrillSessionSummary {}

const DEFAULT_SESSION_CONFIGS: Record<DrillSessionMode, DrillSessionConfig> = {
  endless: { mode: "endless", targetCount: 0, autoStartMic: false, prepTimeSec: 2.5 },
  quick: { mode: "quick", targetCount: 8, autoStartMic: false, prepTimeSec: 2.5 },
  standard: { mode: "standard", targetCount: 15, autoStartMic: false, prepTimeSec: 2.5 },
  deep: { mode: "deep", targetCount: 25, autoStartMic: false, prepTimeSec: 2.0 },
};

function buildDrillSummary(
  history: DrillHistoryEntry[],
  startedAt: number,
  sessionConfig: DrillSessionConfig
): DrillSessionSummary {
  const totalDrilled = history.length;
  const totalCorrected = history.filter((h) => h.evaluation.corrected).length;
  const correctionRate = totalDrilled > 0 ? Math.round((totalCorrected / totalDrilled) * 100) : 100;
  const averageScore =
    totalDrilled > 0
      ? Math.round(history.reduce((acc, h) => acc + h.evaluation.overallScore, 0) / totalDrilled)
      : 0;
  const averageLatencyMs =
    totalDrilled > 0 ? Math.round(history.reduce((acc, h) => acc + h.latencyMs, 0) / totalDrilled) : 1500;
  const firstAttemptSuccessCount = history.filter(
    (h) => (h.attemptsCount ?? 1) === 1 && h.evaluation.corrected
  ).length;
  const firstAttemptAccuracy = totalDrilled > 0 ? Math.round((firstAttemptSuccessCount / totalDrilled) * 100) : 100;
  const averageIndependence =
    totalDrilled > 0
      ? Math.round(
          history.reduce((acc, h) => acc + (h.evaluation.independenceScore ?? 100), 0) / totalDrilled
        )
      : 100;
  const topImproved = history
    .filter((h) => h.evaluation.corrected)
    .map((h) => h.record)
    .slice(0, 3);
  const stillNeedsWork = history
    .filter((h) => !h.evaluation.corrected)
    .map((h) => h.record)
    .slice(0, 3);
  const weakest = history.find((h) => !h.evaluation.corrected)?.record ?? history[0]?.record;

  return {
    totalDrilled,
    totalCorrected,
    correctionRate,
    averageScore,
    averageLatencyMs,
    topImproved,
    stillNeedsWork,
    durationMs: Date.now() - startedAt,
    sessionId: `drill_sess_${Date.now()}`,
    mode: sessionConfig.mode,
    startedAt: new Date(startedAt).toISOString(),
    completedAt: new Date().toISOString(),
    firstAttemptSuccessCount,
    firstAttemptAccuracy,
    averageIndependence,
    averageOverallScore: averageScore,
    masteryDelta: Math.min(10, Math.max(2, Math.round(averageScore / 15))),
    topWeaknessIdentified: weakest ? weakest.labelVi : undefined,
    recommendedNextAction:
      stillNeedsWork.length > 0
        ? `Luyện lại ${stillNeedsWork.length} pattern chưa sửa với hint T2→T0 để cai phụ thuộc.`
        : "Duy trì drill FSRS đến hạn mỗi ngày để giữ retrievability >90%.",
    history,
  };
}

// ── Store State & Actions ────────────────────────────────────────────────────

interface ErrorBankStoreState {
  // Dashboard State
  records: MasterErrorRecord[];
  selectedCategory: MainErrorCategory | "all";
  selectedStatus: ErrorStatus | "all";
  selectedFossilization: FossilizationLevel | "all";
  dueFilter: "all" | "due_today";
  searchQuery: string;
  selectedRecord: MasterErrorRecord | null;
  contextPack: CompactErrorContextPack;
  isLoading: boolean;
  diagnosticReport: SpokenDiagnosticReport | null;
  isDiagnosing: boolean;

  // Active Tab
  activeTab: "overview" | "drill";

  // Topic (aligned with SB/VN-EN/Survival — grounds drill sentences)
  selectedTopicId: string;
  customTopicText: string;
  setSelectedTopic: (topicId: string, customText?: string) => void;

  // Drill Session State (aligned session model)
  sessionMode: DrillSessionMode;
  sessionConfig: DrillSessionConfig;
  sessionStartedAt: number;
  completedTasksCount: number;
  currentTaskIndex: number;
  sessionHistory: DrillHistoryEntry[];
  drillQueue: MasterErrorRecord[];
  currentDrillIndex: number;
  drillHistory: DrillHistoryItem[];
  isDrillEvaluating: boolean;
  lastDrillResult: DrillEvaluationResult | null;
  drillGenerationError: string | null;
  isDrillSessionCompleted: boolean;
  drillSummary: DrillSessionSummary | null;
  drillSessionStartTime: number;

  // Interactive State (aligned SB/VN-EN/Survival)
  hintTier: 0 | 1 | 2 | 3 | 4;
  attemptCount: number;
  autoStartMic: boolean;
  prepCountdown: number | null;
  isCountingDown: boolean;
  isSayItBetterMode: boolean;
  isEvaluating: boolean;

  adaptiveState: DrillAdaptiveState;
  skillMastery: DrillSkillMastery;

  // Dashboard Actions
  loadLocalRecords: () => void;
  setCategory: (category: MainErrorCategory | "all") => void;
  setStatus: (status: ErrorStatus | "all") => void;
  setFossilization: (level: FossilizationLevel | "all") => void;
  setDueFilter: (filter: "all" | "due_today") => void;
  setSearchQuery: (query: string) => void;
  selectRecord: (record: MasterErrorRecord | null) => void;
  flagFalsePositive: (recordId: string) => void;
  advanceReview: (recordId: string, passed: boolean, responseLatencyMs?: number) => void;
  generateDiagnosticReport: () => Promise<void>;
  setActiveTab: (tab: "overview" | "drill") => void;

  // Drill Session Actions
  initDrillSession: (records: MasterErrorRecord[], mode?: DrillSessionMode) => void;
  initDrillFromRecord: (record: MasterErrorRecord, mode?: DrillSessionMode) => void;
  submitDrillAttempt: (params: {
    userTranscript: string;
    latencyMs: number;
    speechDurationMs?: number;
    hintTierUsed?: number;
    attemptNumber?: number;
  }) => Promise<DrillEvaluationResult | null>;
  advanceDrillQueue: () => void;
  finishDrillSession: () => void;
  finishSessionManually: () => void;
  dismissDrillSummary: () => void;
  resetDrillSession: () => void;
  clearDrillError: () => void;
  setHintTier: (tier: 0 | 1 | 2 | 3 | 4) => void;
  incrementAttempt: (isSayItBetter?: boolean) => void;
  setAutoStartMic: (val: boolean) => void;
  setPrepCountdown: (val: number | null) => void;
  setIsCountingDown: (val: boolean) => void;
  setIsEvaluating: (val: boolean) => void;
}

const EMPTY_CONTEXT_PACK: CompactErrorContextPack = {
  topWeaknesses: [],
  reviewDueList: [],
  overallRecoveryRate: 85,
  totalActiveErrors: 0,
};

export const useErrorBankStore = create<ErrorBankStoreState>()(
  persist(
    (set, get) => ({
      // ── Dashboard defaults ──
      records: [],
      selectedCategory: "all",
      selectedStatus: "all",
      selectedFossilization: "all",
      dueFilter: "all",
      searchQuery: "",
      selectedRecord: null,
      contextPack: EMPTY_CONTEXT_PACK,
      isLoading: false,
      diagnosticReport: null,
      isDiagnosing: false,
      activeTab: "overview",

      // ── Topic defaults ──
      selectedTopicId: "random",
      customTopicText: "",
      setSelectedTopic: (topicId: string, customText: string = "") =>
        set({ selectedTopicId: topicId, customTopicText: customText }),

      // ── Drill session defaults ──
      sessionMode: "endless",
      sessionConfig: DEFAULT_SESSION_CONFIGS.endless,
      sessionStartedAt: Date.now(),
      completedTasksCount: 0,
      currentTaskIndex: 0,
      sessionHistory: [],
      drillQueue: [],
      currentDrillIndex: 0,
      drillHistory: [],
      isDrillEvaluating: false,
      lastDrillResult: null,
      drillGenerationError: null,
      isDrillSessionCompleted: false,
      drillSummary: null,
      drillSessionStartTime: Date.now(),

      // ── Interactive defaults ──
      hintTier: 0,
      attemptCount: 1,
      autoStartMic: false,
      prepCountdown: null,
      isCountingDown: false,
      isSayItBetterMode: false,
      isEvaluating: false,

      adaptiveState: INITIAL_DRILL_ADAPTIVE_STATE,
      skillMastery: INITIAL_DRILL_MASTERY,

      // ── Dashboard Actions ──

      loadLocalRecords: () => {
        const stored = getMasterErrorBank();
        const contextPack = getCompactErrorContextPack();
        set({ records: stored, contextPack });
      },

      setCategory: (category) => set({ selectedCategory: category }),
      setStatus: (status) => set({ selectedStatus: status }),
      setFossilization: (level) => set({ selectedFossilization: level }),
      setDueFilter: (filter) => set({ dueFilter: filter }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      selectRecord: (record) => set({ selectedRecord: record }),
      setActiveTab: (tab) => set({ activeTab: tab }),

      flagFalsePositive: (recordId: string) => {
        const updated = flagErrorAsFalsePositive(recordId);
        const contextPack = getCompactErrorContextPack();
        set({
          records: updated,
          contextPack,
          selectedRecord: updated.find((r) => r.id === recordId) || null,
        });
      },

      advanceReview: (recordId: string, passed: boolean, responseLatencyMs?: number) => {
        const updated = advanceSpacedReviewStage(recordId, passed, responseLatencyMs);
        const contextPack = getCompactErrorContextPack();
        set({
          records: updated,
          contextPack,
          selectedRecord: updated.find((r) => r.id === recordId) || null,
        });
      },

      generateDiagnosticReport: async () => {
        const { records } = get();
        if (!records.length) {
          throw new Error("Ngân hàng lỗi đang trống. Hãy thực hành nói để thu thập lỗi trước khi chẩn đoán.");
        }
        set({ isDiagnosing: true });

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
          const res = await fetch("/api/foundation/error-bank/diagnose", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ records, provider, model }),
          });
          const data = await res.json();
          if (!res.ok || data.error) {
            throw new Error(data.error?.message || "Không thể khởi tạo báo cáo chẩn đoán");
          }
          if (data.report) {
            set({ diagnosticReport: data.report, isDiagnosing: false });
          } else {
            set({ isDiagnosing: false });
          }
        } catch (err) {
          set({ isDiagnosing: false });
          throw err;
        }
      },

      // ── Drill Session Actions ──

      initDrillSession: (records: MasterErrorRecord[], mode: DrillSessionMode = "endless") => {
        // Sort by priority score desc — most urgent first
        const sorted = [...records]
          .filter((r) => !r.userFlaggedAsFalsePositive && r.status !== "mastered")
          .sort((a, b) => calculatePriorityScore(b) - calculatePriorityScore(a))
          .slice(0, 20);
        const config = DEFAULT_SESSION_CONFIGS[mode] || DEFAULT_SESSION_CONFIGS.endless;

        set({
          sessionMode: mode,
          sessionConfig: config,
          sessionStartedAt: Date.now(),
          completedTasksCount: 0,
          currentTaskIndex: 0,
          sessionHistory: [],
          drillQueue: sorted,
          currentDrillIndex: 0,
          drillHistory: [],
          isDrillEvaluating: false,
          lastDrillResult: null,
          drillGenerationError: null,
          isDrillSessionCompleted: false,
          drillSummary: null,
          drillSessionStartTime: Date.now(),
          hintTier: 0,
          attemptCount: 1,
          isSayItBetterMode: false,
          prepCountdown: null,
          isCountingDown: false,
          activeTab: "drill",
        });
      },

      initDrillFromRecord: (record: MasterErrorRecord, mode: DrillSessionMode = "endless") => {
        const { records } = get();
        // Put the selected record first, then fill with other high-priority records
        const rest = records
          .filter((r) => r.id !== record.id && !r.userFlaggedAsFalsePositive && r.status !== "mastered")
          .sort((a, b) => calculatePriorityScore(b) - calculatePriorityScore(a))
          .slice(0, 9);
        const config = DEFAULT_SESSION_CONFIGS[mode] || DEFAULT_SESSION_CONFIGS.endless;

        set({
          sessionMode: mode,
          sessionConfig: config,
          sessionStartedAt: Date.now(),
          completedTasksCount: 0,
          currentTaskIndex: 0,
          sessionHistory: [],
          drillQueue: [record, ...rest],
          currentDrillIndex: 0,
          drillHistory: [],
          isDrillEvaluating: false,
          lastDrillResult: null,
          drillGenerationError: null,
          isDrillSessionCompleted: false,
          drillSummary: null,
          drillSessionStartTime: Date.now(),
          hintTier: 0,
          attemptCount: 1,
          isSayItBetterMode: false,
          prepCountdown: null,
          isCountingDown: false,
          activeTab: "drill",
        });
      },

      submitDrillAttempt: async ({ userTranscript, latencyMs, speechDurationMs, hintTierUsed, attemptNumber }) => {
        const { drillQueue, currentDrillIndex, hintTier, attemptCount } = get();
        const currentRecord = drillQueue[currentDrillIndex];
        if (!currentRecord || !userTranscript.trim()) return null;

        const effHintTier = hintTierUsed ?? hintTier;
        const effAttempt = attemptNumber ?? attemptCount;
        const effDuration = speechDurationMs ?? 2200;

        // 1. Client fast-pass 0ms (aligned SB/VN-EN/Survival)
        try {
          const fastPass = computeFastPassDrill(currentRecord, userTranscript, {
            responseLatencyMs: latencyMs,
            speechDurationMs: effDuration,
            hintTierUsed: effHintTier,
            attemptNumber: effAttempt,
          });
          if (fastPass.canFastPass && fastPass.evaluation) {
            const evaluation = fastPass.evaluation;
            const { adaptiveState, skillMastery, drillHistory, sessionHistory } = get();
            const updatedAdaptive = (await import("@/lib/foundation/error-bank/drill-adaptive-engine")).updateDrillAdaptiveProgression(
              adaptiveState,
              evaluation,
              currentRecord
            );
            const updatedMastery = (await import("@/lib/foundation/error-bank/drill-adaptive-engine")).updateDrillMastery(
              skillMastery,
              evaluation
            );
            let updatedRecords: MasterErrorRecord[] = [];
            try {
              updatedRecords = advanceSpacedReviewStage(currentRecord.id, true, latencyMs);
            } catch {}
            const contextPack = getCompactErrorContextPack();
            const historyItem: DrillHistoryEntry = {
              record: currentRecord,
              userTranscript,
              latencyMs,
              speechDurationMs: effDuration,
              evaluation,
              targetCorrection:
                currentRecord.examples[currentRecord.examples.length - 1]?.correction ||
                currentRecord.canonicalName,
              attemptsCount: effAttempt,
            };
            try {
              updateFoundationProfileFromScore("controlled_speaking", evaluation.overallScore);
            } catch {}
            set((state) => ({
              lastDrillResult: evaluation,
              drillHistory: [...state.drillHistory, historyItem as DrillHistoryItem],
              sessionHistory: [...sessionHistory, historyItem],
              records: updatedRecords.length > 0 ? updatedRecords : state.records,
              contextPack,
              adaptiveState: updatedAdaptive,
              skillMastery: updatedMastery,
            }));
            return evaluation;
          }
        } catch {}

        set({ isDrillEvaluating: true, isEvaluating: true, drillGenerationError: null });

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
          const res = await fetch("/api/foundation/error-bank/drill", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              record: currentRecord,
              userTranscript,
              latencyMs,
              speechDurationMs: effDuration,
              hintTierUsed: effHintTier,
              attemptNumber: effAttempt,
              provider,
              model,
            }),
          });
          const data = await res.json();

          if (!res.ok || !data.success) {
            set({ isDrillEvaluating: false, isEvaluating: false, drillGenerationError: data.error || "Lỗi đánh giá bài drill." });
            return null;
          }

          const evaluation: DrillEvaluationResult = data.evaluation;
          const targetCorrection: string = data.targetCorrection || currentRecord.canonicalName;

          const historyItem: DrillHistoryEntry = {
            record: currentRecord,
            userTranscript,
            latencyMs,
            speechDurationMs: effDuration,
            evaluation,
            targetCorrection,
            attemptsCount: effAttempt,
          };

          // Adaptive + mastery + memory refresh
          const { adaptiveState, skillMastery, sessionHistory } = get();
          const { updateDrillAdaptiveProgression, updateDrillMastery } = await import(
            "@/lib/foundation/error-bank/drill-adaptive-engine"
          );
          const updatedAdaptive = updateDrillAdaptiveProgression(adaptiveState, evaluation, currentRecord);
          const updatedMastery = updateDrillMastery(skillMastery, evaluation);
          try {
            updateFoundationProfileFromScore("controlled_speaking", evaluation.overallScore);
          } catch {}

          // Refresh records from localStorage after FSRS update
          const updatedRecords = getMasterErrorBank();
          const contextPack = getCompactErrorContextPack();

          set((state) => ({
            isDrillEvaluating: false,
            isEvaluating: false,
            lastDrillResult: evaluation,
            drillHistory: [...state.drillHistory, historyItem as DrillHistoryItem],
            sessionHistory: [...sessionHistory, historyItem],
            records: updatedRecords,
            contextPack,
            adaptiveState: updatedAdaptive,
            skillMastery: updatedMastery,
          }));

          return evaluation;
        } catch (err) {
          set({
            isDrillEvaluating: false,
            isEvaluating: false,
            drillGenerationError: err instanceof Error ? err.message : "Lỗi kết nối mạng.",
          });
          return null;
        }
      },

      advanceDrillQueue: () => {
        const { drillQueue, currentDrillIndex, sessionConfig, sessionHistory, sessionStartedAt } = get();
        const nextIndex = currentDrillIndex + 1;

        // Session target check (aligned SB/VN-EN/Survival)
        const completedCount = sessionHistory.length;
        if (
          sessionConfig.mode !== "endless" &&
          sessionConfig.targetCount > 0 &&
          completedCount >= sessionConfig.targetCount
        ) {
          const summary = buildDrillSummary(sessionHistory, sessionStartedAt, sessionConfig);
          set({
            isDrillSessionCompleted: true,
            drillSummary: summary,
            completedTasksCount: completedCount,
          });
          return;
        }

        if (nextIndex >= drillQueue.length) {
          get().finishDrillSession();
        } else {
          set({
            currentDrillIndex: nextIndex,
            currentTaskIndex: nextIndex,
            completedTasksCount: completedCount,
            lastDrillResult: null,
            drillGenerationError: null,
            hintTier: 0,
            attemptCount: 1,
            isSayItBetterMode: false,
          });
        }
      },

      finishDrillSession: () => {
        const { drillHistory, sessionHistory, drillSessionStartTime, sessionStartedAt, sessionConfig } = get();
        const history: DrillHistoryEntry[] =
          sessionHistory.length > 0
            ? sessionHistory
            : drillHistory.map((h) => ({
                record: h.record,
                userTranscript: h.userTranscript,
                latencyMs: h.latencyMs,
                speechDurationMs: 2200,
                evaluation: h.evaluation,
                targetCorrection: h.targetCorrection,
                attemptsCount: 1,
              }));
        if (!history.length) {
          set({ isDrillSessionCompleted: true, drillSummary: null });
          return;
        }
        const summary = buildDrillSummary(history, sessionStartedAt || drillSessionStartTime, sessionConfig);
        set({ isDrillSessionCompleted: true, drillSummary: summary, completedTasksCount: history.length });
      },

      finishSessionManually: () => {
        get().finishDrillSession();
      },

      dismissDrillSummary: () => {
        set({ isDrillSessionCompleted: false, drillSummary: null, activeTab: "overview" });
      },

      resetDrillSession: () => {
        const { records, sessionMode } = get();
        get().initDrillSession(records, sessionMode);
      },

      clearDrillError: () => set({ drillGenerationError: null }),
      setHintTier: (tier) => set({ hintTier: tier }),
      incrementAttempt: (isSayItBetter = false) =>
        set((s) => ({ attemptCount: s.attemptCount + 1, lastDrillResult: null, isSayItBetterMode: isSayItBetter })),
      setAutoStartMic: (val) => set({ autoStartMic: val }),
      setPrepCountdown: (val) => set({ prepCountdown: val }),
      setIsCountingDown: (val) => set({ isCountingDown: val }),
      setIsEvaluating: (val) => set({ isEvaluating: val }),
    }),
    {
      name: "error_bank_store_v2",
      partialize: (s) => ({
        skillMastery: s.skillMastery,
        adaptiveState: s.adaptiveState,
        autoStartMic: s.autoStartMic,
        selectedTopicId: s.selectedTopicId,
        customTopicText: s.customTopicText,
      }),
    }
  )
);
