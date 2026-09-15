// Drill Adaptive Progression & Mastery Engine (aligned with SB/VN-EN/Survival)
// Difficulty 1-10 derived from severity × FSRS urgency × fossilization

import type {
  MasterErrorRecord,
  DrillAdaptiveState,
  DrillSkillMastery,
  DrillEvaluationResult,
} from "@/types/error-bank";

export type { DrillAdaptiveState, DrillSkillMastery };

export const INITIAL_DRILL_ADAPTIVE_STATE: DrillAdaptiveState = {
  currentDifficulty: 5,
  prepTimeSec: 2.5,
  consecutiveSuccesses: 0,
  consecutiveFailures: 0,
  rapidStreak: 0,
  recentScores: [],
  recentPatterns: [],
  irtTheta: 0.5,
  optimalZpdDifficulty: 5,
};

export const INITIAL_DRILL_MASTERY: DrillSkillMastery = {
  correction: 50,
  retrieval: 50,
  fluency: 45,
  naturalness: 50,
  independence: 40,
  overallMastery: 47,
  totalAttempts: 0,
  successfulFirstAttempts: 0,
  streakCount: 0,
  updatedAt: new Date().toISOString(),
};

export function severityToNumber(severity: MasterErrorRecord["severity"]): number {
  if (severity === "minor") return 3;
  if (severity === "moderate") return 5;
  if (severity === "major") return 7;
  return 9;
}

export function recordDifficultyNumber(record: MasterErrorRecord): number {
  const base = severityToNumber(record.severity);
  const urgency = (record.retrievability ?? 90) < 80 ? 1 : 0;
  const fossil = (record.fossilizationScore ?? 0) >= 65 ? 1 : 0;
  return Math.min(10, Math.max(1, base + urgency + fossil));
}

export function calculateIrtExpectedProbability(theta: number, difficulty: number): number {
  const normDiff = Math.min(1.0, Math.max(0.1, difficulty / 10));
  const exponent = -2.5 * (theta - normDiff);
  return 1 / (1 + Math.exp(exponent));
}

export function calculateZpdDifficulty(theta: number): number {
  return Math.min(10, Math.max(1, Math.round(theta * 10)));
}

export function updateDrillAdaptiveProgression(
  state: DrillAdaptiveState,
  evaluation: DrillEvaluationResult,
  record: MasterErrorRecord
): DrillAdaptiveState {
  const independence = evaluation.independenceScore ?? 100;
  const isHighPerformance =
    evaluation.overallScore >= 80 && evaluation.corrected && independence >= 75;
  const isFailure = evaluation.overallScore < 60 || !evaluation.corrected;

  const consecutiveSuccesses = isHighPerformance ? state.consecutiveSuccesses + 1 : 0;
  const consecutiveFailures = isFailure ? state.consecutiveFailures + 1 : 0;
  const rapidStreak = evaluation.corrected ? state.rapidStreak + 1 : 0;

  const prevTheta = state.irtTheta ?? 0.5;
  const taskDiff = recordDifficultyNumber(record);
  const expectedProb = calculateIrtExpectedProbability(prevTheta, taskDiff);
  const actualOutcome = (evaluation.overallScore / 100) * (independence / 100);
  const nextTheta = Math.min(
    0.98,
    Math.max(0.15, Math.round((prevTheta + 0.1 * (actualOutcome - expectedProb)) * 100) / 100)
  );

  let nextDifficulty = state.currentDifficulty;
  if (consecutiveSuccesses >= 3) nextDifficulty = Math.min(10, state.currentDifficulty + 1);
  else if (consecutiveFailures >= 2) nextDifficulty = Math.max(1, state.currentDifficulty - 1);

  let nextPrepTime = state.prepTimeSec;
  if (evaluation.overallScore >= 85 && independence >= 90) {
    nextPrepTime = Math.max(1.5, Math.round((state.prepTimeSec - 0.5) * 10) / 10);
  } else if (evaluation.overallScore < 65) {
    nextPrepTime = Math.min(3.5, Math.round((state.prepTimeSec + 0.5) * 10) / 10);
  }

  return {
    currentDifficulty: nextDifficulty,
    prepTimeSec: nextPrepTime,
    consecutiveSuccesses,
    consecutiveFailures,
    rapidStreak,
    recentScores: [...state.recentScores.slice(-9), evaluation.overallScore],
    recentPatterns: [...state.recentPatterns.slice(-15), record.patternKey],
    irtTheta: nextTheta,
    optimalZpdDifficulty: calculateZpdDifficulty(nextTheta),
  };
}

export function updateDrillMastery(
  current: DrillSkillMastery,
  evaluation: DrillEvaluationResult
): DrillSkillMastery {
  const alpha = 0.15;
  const upd = (prev: number, latest: number) =>
    Math.min(100, Math.max(0, Math.round(prev * (1 - alpha) + latest * alpha)));

  const newCorrection = upd(current.correction, evaluation.corrected ? 95 : 45);
  const newRetrieval = upd(current.retrieval, evaluation.retrievalScore ?? evaluation.overallScore);
  const newFluency = upd(current.fluency, evaluation.fluencyScore ?? 70);
  const newNaturalness = upd(current.naturalness, evaluation.naturalness ?? 70);
  const newIndependence = upd(current.independence, evaluation.independenceScore ?? 100);

  const overallMastery = Math.round(
    newCorrection * 0.3 +
      newRetrieval * 0.25 +
      newFluency * 0.15 +
      newNaturalness * 0.15 +
      newIndependence * 0.15
  );

  const isFirstAttemptSuccess =
    (evaluation.attemptNumber ?? 1) === 1 && evaluation.corrected;

  return {
    correction: newCorrection,
    retrieval: newRetrieval,
    fluency: newFluency,
    naturalness: newNaturalness,
    independence: newIndependence,
    overallMastery,
    totalAttempts: current.totalAttempts + 1,
    successfulFirstAttempts: current.successfulFirstAttempts + (isFirstAttemptSuccess ? 1 : 0),
    streakCount: evaluation.corrected ? current.streakCount + 1 : 0,
    updatedAt: new Date().toISOString(),
  };
}
