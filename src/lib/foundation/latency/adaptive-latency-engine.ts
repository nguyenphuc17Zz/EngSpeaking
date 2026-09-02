// Adaptive Latency Engine — Function 4
// Manages dynamic target latency tuning, median metrics, and 4-quadrant session tracking

import type {
  LatencyEvaluation,
  LatencySessionSummary,
  LatencyTask,
  LatencyDrillMode,
} from "@/types/latency-training";

export interface LatencyState {
  currentTargetLatencyMs: number;
  currentDifficulty: number;
  recentLatencies: number[];
  recentAccuracies: number[];
  rapidStreak: number;
  baselineMedianMs: number | null;
}

export const INITIAL_LATENCY_STATE: LatencyState = {
  currentTargetLatencyMs: 3000,
  currentDifficulty: 3,
  recentLatencies: [],
  recentAccuracies: [],
  rapidStreak: 0,
  baselineMedianMs: null,
};

export function computeMedian(numbers: number[]): number {
  if (numbers.length === 0) return 3000;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function computePercentile(numbers: number[], p: number): number {
  if (numbers.length === 0) return 3000;
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return Math.round(sorted[lower] * (1 - weight) + sorted[upper] * weight);
}

export function updateAdaptiveLatencyState(
  state: LatencyState,
  evaluation: LatencyEvaluation
): LatencyState {
  const updatedLatencies = [...state.recentLatencies.slice(-15), evaluation.responseLatencyMs];
  const updatedAccuracies = [...state.recentAccuracies.slice(-15), evaluation.accuracyScore];
  const median = computeMedian(updatedLatencies);

  let nextTarget = state.currentTargetLatencyMs;
  let nextDifficulty = state.currentDifficulty;
  let rapidStreak = evaluation.quadrant === "fast_correct" ? state.rapidStreak + 1 : 0;

  // 1. Adaptive Target Latency Tuning
  if (rapidStreak >= 3 && evaluation.accuracyScore >= 85) {
    // Increase pressure: lower target latency by 300ms down to min 1500ms
    nextTarget = Math.max(1500, state.currentTargetLatencyMs - 300);
    nextDifficulty = Math.min(10, state.currentDifficulty + 1);
  } else if (evaluation.quadrant === "slow_incorrect" || evaluation.accuracyScore < 60) {
    // Relax pressure: increase target latency by 400ms up to max 5000ms
    nextTarget = Math.min(5000, state.currentTargetLatencyMs + 400);
    nextDifficulty = Math.max(1, state.currentDifficulty - 1);
  }

  return {
    currentTargetLatencyMs: nextTarget,
    currentDifficulty: nextDifficulty,
    recentLatencies: updatedLatencies,
    recentAccuracies: updatedAccuracies,
    rapidStreak,
    baselineMedianMs: state.baselineMedianMs ?? (updatedLatencies.length >= 5 ? median : null),
  };
}

export function buildLatencySessionSummary(
  sessionId: string,
  mode: LatencyDrillMode,
  startedAt: string,
  history: Array<{ task: LatencyTask; evaluation: LatencyEvaluation }>,
  baselineMedianMs?: number | null
): LatencySessionSummary {
  const latencies = history.map((h) => h.evaluation.responseLatencyMs);
  const accuracies = history.map((h) => h.evaluation.accuracyScore);

  const medianLatencyMs = computeMedian(latencies);
  const p25LatencyMs = computePercentile(latencies, 25);
  const p75LatencyMs = computePercentile(latencies, 75);

  const totalAcc = accuracies.reduce((a, b) => a + b, 0);
  const accuracyRate = Math.round(totalAcc / Math.max(1, accuracies.length));

  const quadrantDistribution = {
    fastCorrectCount: history.filter((h) => h.evaluation.quadrant === "fast_correct").length,
    slowCorrectCount: history.filter((h) => h.evaluation.quadrant === "slow_correct").length,
    fastIncorrectCount: history.filter((h) => h.evaluation.quadrant === "fast_incorrect").length,
    slowIncorrectCount: history.filter((h) => h.evaluation.quadrant === "slow_incorrect").length,
  };

  const fastestResponseMs = latencies.length > 0 ? Math.min(...latencies) : 0;
  const slowestResponseMs = latencies.length > 0 ? Math.max(...latencies) : 0;

  const baselineComparisonDeltaMs = baselineMedianMs
    ? medianLatencyMs - baselineMedianMs
    : undefined;

  return {
    sessionId,
    mode,
    startedAt,
    completedAt: new Date().toISOString(),
    totalPrompts: history.length,
    medianLatencyMs,
    p25LatencyMs,
    p75LatencyMs,
    baselineComparisonDeltaMs,
    accuracyRate,
    quadrantDistribution,
    fastestResponseMs,
    slowestResponseMs,
    topDelayedCategory: quadrantDistribution.slowCorrectCount > 1 ? "Ý kiến & Mệnh đề phức" : undefined,
    recommendedDrill: "Luyện thêm 1 lượt Rapid Retrieval để đưa tốc độ trung bình về dưới 2.0s.",
    history,
  };
}
