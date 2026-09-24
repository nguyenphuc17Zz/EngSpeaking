// Adaptive Retrieval Engine for VN -> EN Speaking (Function 2)
// Manages Difficulty ladder, Preparation latency scaling, and Gap tracking

import type { VNToENTask, VNToENEvaluation } from "@/types/vn-to-en";

export interface VNAdaptiveState {
  currentDifficulty: number; // 1-10
  prepTimeSec: number; // 3.0 -> 1.5
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  rapidStreak: number;
  recentScores: number[];
  recentErrors: string[];
  recentPrompts: string[];
  gapCounts: {
    none: number;
    retrieval_gap: number;
    knowledge_gap: number;
    production_gap: number;
  };
}

export const INITIAL_VN_ADAPTIVE_STATE: VNAdaptiveState = {
  currentDifficulty: 3,
  prepTimeSec: 2.5,
  consecutiveSuccesses: 0,
  consecutiveFailures: 0,
  rapidStreak: 0,
  recentScores: [],
  recentErrors: [],
  recentPrompts: [],
  gapCounts: {
    none: 0,
    retrieval_gap: 0,
    knowledge_gap: 0,
    production_gap: 0,
  },
};

export function updateVNAdaptiveState(
  state: VNAdaptiveState,
  evaluation: VNToENEvaluation,
  task: VNToENTask
): VNAdaptiveState {
  const isHighPerformance = evaluation.overallScore >= 80 && evaluation.independenceScore >= 75;
  const isFailure = evaluation.overallScore < 60;

  const consecutiveSuccesses = isHighPerformance ? state.consecutiveSuccesses + 1 : 0;
  const consecutiveFailures = isFailure ? state.consecutiveFailures + 1 : 0;
  const rapidStreak = evaluation.isSuccessful ? state.rapidStreak + 1 : 0;

  let nextDifficulty = state.currentDifficulty;
  let nextPrepTime = state.prepTimeSec;

  // 1. Difficulty scaling
  if (consecutiveSuccesses >= 3) {
    nextDifficulty = Math.min(10, state.currentDifficulty + 1);
  } else if (consecutiveFailures >= 2) {
    nextDifficulty = Math.max(1, state.currentDifficulty - 1);
  }

  // 2. Prep time scaling (Time pressure ladder)
  if (evaluation.overallScore >= 85 && evaluation.responseLatencyMs < 2000 && evaluation.hintTierUsed === 0) {
    nextPrepTime = Math.max(1.5, Math.round((state.prepTimeSec - 0.5) * 10) / 10);
  } else if (evaluation.overallScore < 65 || evaluation.gapType === "retrieval_gap") {
    nextPrepTime = Math.min(3.5, Math.round((state.prepTimeSec + 0.5) * 10) / 10);
  }

  // 3. Gap tracking
  const gapKey = evaluation.gapType || "none";
  const updatedGapCounts = {
    ...state.gapCounts,
    [gapKey]: (state.gapCounts[gapKey] || 0) + 1,
  };

  const newErrors = evaluation.errors.map((e) => e.patternKey || e.type).filter(Boolean);
  const updatedErrors = Array.from(new Set([...state.recentErrors.slice(-6), ...newErrors]));
  const updatedPrompts = [...state.recentPrompts.slice(-15), task.promptVi];

  return {
    currentDifficulty: nextDifficulty,
    prepTimeSec: nextPrepTime,
    consecutiveSuccesses,
    consecutiveFailures,
    rapidStreak,
    recentScores: [...state.recentScores.slice(-9), evaluation.overallScore],
    recentErrors: updatedErrors,
    recentPrompts: updatedPrompts,
    gapCounts: updatedGapCounts,
  };
}
