"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ConversationWorldState, ConversationSummary, DynamicEvent } from "@/types/conversation-world";
import type {
  ConversationTurn,
  ConversationSessionMode,
  ConversationSessionConfig,
  ConversationAdaptiveState,
  ConversationSkillMastery,
  ConversationSessionSummary,
  ConversationTurnHistoryEntry,
} from "@/types/conversation";
import {
  INITIAL_CONVERSATION_ADAPTIVE_STATE,
  INITIAL_CONVERSATION_MASTERY,
  updateConversationAdaptiveProgression,
  updateConversationMastery,
} from "@/lib/conversation/turn-adaptive-engine";
import { resolveTopicForPrompt } from "@/lib/foundation/sentence-builder/topics";

export const CONVERSATION_SESSION_CONFIGS: Record<
  ConversationSessionMode,
  ConversationSessionConfig
> = {
  endless: { mode: "endless", targetCount: 0, autoStartMic: false, prepTimeSec: 2.5 },
  quick: { mode: "quick", targetCount: 6, autoStartMic: false, prepTimeSec: 2.5 },
  standard: { mode: "standard", targetCount: 12, autoStartMic: false, prepTimeSec: 2.5 },
  deep: { mode: "deep", targetCount: 20, autoStartMic: false, prepTimeSec: 2.0 },
};

function buildSessionSummary(params: {
  turns: ConversationTurn[];
  history: ConversationTurnHistoryEntry[];
  startedAt: number;
  sessionConfig: ConversationSessionConfig;
  topic: string;
}): ConversationSessionSummary {
  const userTurns = params.turns.filter((t) => t.role === "user");
  const scores = userTurns.map((t) => t.pedagogy?.turnScore ?? 75);
  const latencies = userTurns.map((t) => t.pedagogy?.latencyMs ?? 2000);
  const independences = userTurns.map((t) => t.pedagogy?.independenceScore ?? 100);
  const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);
  const avgScore = avg(scores) || 75;
  const avgLatency = avg(latencies) || 2000;
  const avgIndependence = avg(independences) || 100;
  const wpms = userTurns.map((t) => t.pedagogy?.speechRateWpm ?? t.pedagogy?.hesitationMetrics?.wpm ?? 110);
  const ttrs = userTurns.map((t) => t.pedagogy?.lexicalDiversityTtr ?? 65);
  const firstAttemptSuccessCount = params.history.filter(
    (h) => (h.attemptsCount ?? 1) === 1 && (h.turn.pedagogy?.turnScore ?? 0) >= 70
  ).length;
  const totalErrors = userTurns.reduce((acc, t) => acc + (t.pedagogy?.errors?.length ?? (t.pedagogy?.grammarIssue ? 1 : 0)), 0);
  const cefr: ConversationSessionSummary["cefrBandEstimate"] =
    avgScore >= 90 ? "C1" : avgScore >= 78 ? "B2" : avgScore >= 65 ? "B1" : "A2";
  const weakest = [...userTurns]
    .sort((a, b) => (a.pedagogy?.turnScore ?? 75) - (b.pedagogy?.turnScore ?? 75))[0]
    ?.pedagogy?.errors?.[0];

  return {
    sessionId: `conv_sess_${Date.now()}`,
    mode: params.sessionConfig.mode,
    startedAt: new Date(params.startedAt).toISOString(),
    completedAt: new Date().toISOString(),
    totalTurns: params.turns.length,
    userTurns: userTurns.length,
    firstAttemptSuccessCount,
    firstAttemptAccuracy: userTurns.length ? Math.round((firstAttemptSuccessCount / userTurns.length) * 100) : 100,
    averageLatencyMs: avgLatency,
    averageIndependence: avgIndependence,
    averageOverallScore: avgScore,
    averageWpm: avg(wpms) || 110,
    averageTtr: ttrs.length ? Math.round((ttrs.reduce((a, b) => a + b, 0) / ttrs.length) * 10) / 10 : 65,
    masteryDelta: Math.min(10, Math.max(2, Math.round(avgScore / 15))),
    totalErrorsCount: totalErrors,
    twistResolved: totalErrors === 0,
    cefrBandEstimate: cefr,
    topWeaknessIdentified: weakest ? `${weakest.correction} (${weakest.explanation})` : undefined,
    recommendedNextAction:
      totalErrors > 0
        ? "Mở Error Bank để drill pattern yếu nhất, rồi quay lại hội thoại cùng chủ đề."
        : "Tăng độ khó hoặc chuyển chủ đề mới để giữ đà phản xạ.",
    history: params.history,
  };
}

interface ConvStore {
  world: ConversationWorldState | null;
  summary: ConversationSummary | null;
  turns: ConversationTurn[];
  isThinking: boolean;
  isGeneratingWorld: boolean;
  activeEvents: DynamicEvent[];
  setWorld: (w: ConversationWorldState | null) => void;
  setSummary: (s: ConversationSummary | null) => void;
  setTurns: (t: ConversationTurn[]) => void;
  addTurn: (t: ConversationTurn) => void;
  setThinking: (v: boolean) => void;
  setGeneratingWorld: (v: boolean) => void;
  pushEvent: (e: DynamicEvent) => void;
  reset: () => void;

  // SB/VN-EN/Survival/Drill aligned session model
  sessionMode: ConversationSessionMode;
  sessionConfig: ConversationSessionConfig;
  sessionStartedAt: number;
  completedTurnsCount: number;
  isSessionCompleted: boolean;
  sessionSummary: ConversationSessionSummary | null;
  sessionHistory: ConversationTurnHistoryEntry[];
  selectedTopicId: string;
  customTopicText: string;
  setSelectedTopic: (topicId: string, customText?: string) => void;
  resolvedTopic: () => string;
  hintTier: 0 | 1 | 2 | 3 | 4;
  attemptCount: number;
  autoStartMic: boolean;
  prepCountdown: number | null;
  isCountingDown: boolean;
  isSayItBetterMode: boolean;
  isEvaluating: boolean;
  adaptiveState: ConversationAdaptiveState;
  skillMastery: ConversationSkillMastery;
  setHintTier: (tier: 0 | 1 | 2 | 3 | 4) => void;
  incrementAttempt: (isSayItBetter?: boolean) => void;
  setAutoStartMic: (val: boolean) => void;
  setPrepCountdown: (val: number | null) => void;
  setIsCountingDown: (val: boolean) => void;
  setIsEvaluating: (val: boolean) => void;
  setSessionMode: (mode: ConversationSessionMode) => void;
  initSession: (mode?: ConversationSessionMode) => void;
  finishSessionManually: () => void;
  processUserTurn: (turn: ConversationTurn) => void;
}

export const useConversationStore = create<ConvStore>()(
  persist(
    (set, get) => ({
      world: null,
      summary: null,
      turns: [],
      isThinking: false,
      isGeneratingWorld: false,
      activeEvents: [],
      setWorld: (world) => set({ world }),
      setSummary: (summary) => set({ summary }),
      setTurns: (turns) => set({ turns }),
      addTurn: (t) => {
        const { sessionHistory, attemptCount } = get();
        set((s) => ({ turns: [...s.turns, t] }));
        if (t.role === "user") {
          const entry: ConversationTurnHistoryEntry = {
            turn: t,
            evaluationSource: t.pedagogy?.evaluationSource,
            attemptsCount: t.pedagogy?.attemptNumber ?? attemptCount,
          };
          set({ sessionHistory: [...sessionHistory, entry] });
          // Adaptive + mastery per user turn (aligned SB/VN/Survival/Drill)
          try {
            const { adaptiveState, skillMastery } = get();
            const scenarioDifficulty = get().world?.scenario.difficulty ?? 5;
            const updatedAdaptive = updateConversationAdaptiveProgression(
              adaptiveState,
              t.pedagogy || {},
              scenarioDifficulty
            );
            const updatedMastery = updateConversationMastery(skillMastery, t.pedagogy || {});
            set({ adaptiveState: updatedAdaptive, skillMastery: updatedMastery });
          } catch {}
        }
      },
      setThinking: (isThinking) => set({ isThinking }),
      setGeneratingWorld: (isGeneratingWorld) => set({ isGeneratingWorld }),
      pushEvent: (e) => set((s) => ({ activeEvents: [...s.activeEvents, e].slice(-5) })),
      reset: () =>
        set({
          world: null,
          summary: null,
          turns: [],
          isThinking: false,
          isGeneratingWorld: false,
          activeEvents: [],
          isSessionCompleted: false,
          sessionSummary: null,
          sessionHistory: [],
          completedTurnsCount: 0,
          hintTier: 0,
          attemptCount: 1,
          isSayItBetterMode: false,
          prepCountdown: null,
          isCountingDown: false,
          isEvaluating: false,
        }),

      sessionMode: "endless",
      sessionConfig: CONVERSATION_SESSION_CONFIGS.endless,
      sessionStartedAt: Date.now(),
      completedTurnsCount: 0,
      isSessionCompleted: false,
      sessionSummary: null,
      sessionHistory: [],
      selectedTopicId: "random",
      customTopicText: "",
      setSelectedTopic: (topicId: string, customText: string = "") =>
        set({ selectedTopicId: topicId, customTopicText: customText }),
      resolvedTopic: () => resolveTopicForPrompt(get().selectedTopicId, get().customTopicText),
      hintTier: 0,
      attemptCount: 1,
      autoStartMic: false,
      prepCountdown: null,
      isCountingDown: false,
      isSayItBetterMode: false,
      isEvaluating: false,
      adaptiveState: INITIAL_CONVERSATION_ADAPTIVE_STATE,
      skillMastery: INITIAL_CONVERSATION_MASTERY,
      setHintTier: (tier) => set({ hintTier: tier }),
      incrementAttempt: (isSayItBetter = false) =>
        set((s) => ({ attemptCount: s.attemptCount + 1, isSayItBetterMode: isSayItBetter })),
      setAutoStartMic: (val) => set({ autoStartMic: val }),
      setPrepCountdown: (val) => set({ prepCountdown: val }),
      setIsCountingDown: (val) => set({ isCountingDown: val }),
      setIsEvaluating: (val) => set({ isEvaluating: val }),
      setSessionMode: (mode) =>
        set({ sessionMode: mode, sessionConfig: CONVERSATION_SESSION_CONFIGS[mode] || CONVERSATION_SESSION_CONFIGS.endless }),
      initSession: (mode = "endless") =>
        set({
          sessionMode: mode,
          sessionConfig: CONVERSATION_SESSION_CONFIGS[mode] || CONVERSATION_SESSION_CONFIGS.endless,
          sessionStartedAt: Date.now(),
          completedTurnsCount: 0,
          isSessionCompleted: false,
          sessionSummary: null,
          sessionHistory: [],
          hintTier: 0,
          attemptCount: 1,
          isSayItBetterMode: false,
          prepCountdown: null,
          isCountingDown: false,
          isEvaluating: false,
        }),
      finishSessionManually: () => {
        const { turns, sessionHistory, sessionStartedAt, sessionConfig, resolvedTopic } = get();
        const summary = buildSessionSummary({
          turns,
          history: sessionHistory,
          startedAt: sessionStartedAt,
          sessionConfig,
          topic: resolvedTopic(),
        });
        set({
          isSessionCompleted: true,
          sessionSummary: summary,
          completedTurnsCount: turns.filter((t) => t.role === "user").length,
        });
      },
      processUserTurn: (turn: ConversationTurn) => {
        get().addTurn(turn);
      },
    }),
    { name: "conversation_store", version: 3, partialize: (s) => ({ world: s.world, summary: s.summary, turns: s.turns.slice(-20), activeEvents: s.activeEvents, skillMastery: s.skillMastery, adaptiveState: s.adaptiveState, autoStartMic: s.autoStartMic, selectedTopicId: s.selectedTopicId, customTopicText: s.customTopicText, sessionMode: s.sessionMode, sessionConfig: s.sessionConfig }),
      migrate: (persisted, version) => {
        if ((version as number) < 3) {
          return { ...(persisted as ConvStore), world: null, summary: null, activeEvents: [] } as ConvStore;
        }
        return persisted as ConvStore;
      },
    }
  )
);
