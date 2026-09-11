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
  lastDirection?: "tighten" | "relax" | "hold";
  reversalCount?: number;
}

export const INITIAL_LATENCY_STATE: LatencyState = {
  currentTargetLatencyMs: 3000,
  currentDifficulty: 3,
  recentLatencies: [],
  recentAccuracies: [],
  rapidStreak: 0,
  baselineMedianMs: null,
  lastDirection: "hold",
  reversalCount: 0,
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

/**
 * Psychometric Adaptive Staircase Step Evaluator
 * Transformed 2-down / 1-up staircase targeting ~70.7% success rate threshold
 */
export function evaluateStaircaseStep(
  prevTargetMs: number,
  evaluation: LatencyEvaluation,
  consecutiveFast: number,
  prevDirection?: "tighten" | "relax" | "hold"
): {
  nextTargetMs: number;
  stepDirection: "tighten" | "relax" | "hold";
  reversalOccurred: boolean;
} {
  let nextTargetMs = prevTargetMs;
  let stepDirection: "tighten" | "relax" | "hold" = "hold";

  // 2 consecutive fast_correct responses tighten target by 250ms (down to 1400ms)
  if (evaluation.quadrant === "fast_correct" && consecutiveFast >= 2) {
    stepDirection = "tighten";
    nextTargetMs = Math.max(1400, prevTargetMs - 250);
  } else if (evaluation.quadrant === "slow_incorrect" || evaluation.accuracyScore < 65) {
    // Relax pressure by 200ms up to 4500ms
    stepDirection = "relax";
    nextTargetMs = Math.min(4500, prevTargetMs + 200);
  } else if (evaluation.quadrant === "fast_incorrect") {
    // Speed good but accuracy slips: slight relax +100ms
    stepDirection = "relax";
    nextTargetMs = Math.min(4500, prevTargetMs + 100);
  }

  const reversalOccurred =
    (prevDirection === "tighten" && stepDirection === "relax") ||
    (prevDirection === "relax" && stepDirection === "tighten");

  return { nextTargetMs, stepDirection, reversalOccurred };
}

export function updateAdaptiveLatencyState(
  state: LatencyState,
  evaluation: LatencyEvaluation
): LatencyState {
  const updatedLatencies = [...state.recentLatencies.slice(-15), evaluation.responseLatencyMs];
  const updatedAccuracies = [...state.recentAccuracies.slice(-15), evaluation.accuracyScore];
  const median = computeMedian(updatedLatencies);

  const rapidStreak = evaluation.quadrant === "fast_correct" ? state.rapidStreak + 1 : 0;
  const { nextTargetMs, stepDirection, reversalOccurred } = evaluateStaircaseStep(
    state.currentTargetLatencyMs,
    evaluation,
    rapidStreak,
    state.lastDirection
  );

  let nextDifficulty = state.currentDifficulty;
  if (stepDirection === "tighten" && rapidStreak >= 3) {
    nextDifficulty = Math.min(10, state.currentDifficulty + 1);
  } else if (stepDirection === "relax" && evaluation.accuracyScore < 60) {
    nextDifficulty = Math.max(1, state.currentDifficulty - 1);
  }

  const reversalCount = (state.reversalCount || 0) + (reversalOccurred ? 1 : 0);

  return {
    currentTargetLatencyMs: nextTargetMs,
    currentDifficulty: nextDifficulty,
    recentLatencies: updatedLatencies,
    recentAccuracies: updatedAccuracies,
    rapidStreak,
    baselineMedianMs: state.baselineMedianMs ?? (updatedLatencies.length >= 5 ? median : null),
    lastDirection: stepDirection,
    reversalCount,
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
