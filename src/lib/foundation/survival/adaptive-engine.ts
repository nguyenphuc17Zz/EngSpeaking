// Adaptive Progression & Mastery Engine for Survival Speaking (Function 7)
// Aligned with Sentence Builder adaptive-engine + VN adaptive-engine
// Difficulty 1-10 maps to easy (1-3) / medium (4-6) / hard (7-10)

import type {
  CircumlocutionTask,
  SurvivalScenarioTask,
  SurvivalAdaptiveState,
  SurvivalSkillMastery,
  SurvivalEvaluationResult,
} from "@/types/survival-speaking";

export type { SurvivalAdaptiveState, SurvivalSkillMastery };

export const INITIAL_SURVIVAL_ADAPTIVE_STATE: SurvivalAdaptiveState = {
  currentDifficulty: 4,
  prepTimeSec: 2.5,
  consecutiveSuccesses: 0,
  consecutiveFailures: 0,
  rapidStreak: 0,
  recentScores: [],
  recentErrors: [],
  recentPrompts: [],
  irtTheta: 0.5,
  optimalZpdDifficulty: 4,
};

export const INITIAL_SURVIVAL_MASTERY: SurvivalSkillMastery = {
  clarity: 55,
  retrieval: 50,
  fluency: 45,
  naturalness: 50,
  independence: 40,
  overallMastery: 48,
  totalAttempts: 0,
  successfulFirstAttempts: 0,
  streakCount: 0,
  updatedAt: new Date().toISOString(),
};

export function difficultyNumberToLabel(n: number): "easy" | "medium" | "hard" {
  if (n <= 3) return "easy";
  if (n <= 6) return "medium";
  return "hard";
}

export function difficultyLabelToNumber(label: "easy" | "medium" | "hard"): number {
  if (label === "easy") return 3;
  if (label === "medium") return 5;
  return 8;
}

export function calculateIrtExpectedProbability(theta: number, difficulty: number): number {
  const normDiff = Math.min(1.0, Math.max(0.1, difficulty / 10));
  const exponent = -2.5 * (theta - normDiff);
  return 1 / (1 + Math.exp(exponent));
}

export function calculateZpdDifficulty(theta: number): number {
  const idealDifficulty = Math.round(theta * 10);
  return Math.min(10, Math.max(1, idealDifficulty));
}

function taskDifficultyNumber(task: CircumlocutionTask | SurvivalScenarioTask, fallback: number): number {
  const t = task as { difficultyOverall?: number; difficulty?: unknown };
  if (typeof t.difficultyOverall === "number") return t.difficultyOverall;
  return fallback;
}

export function updateSurvivalAdaptiveProgression(
  state: SurvivalAdaptiveState,
  evaluation: SurvivalEvaluationResult,
  task: CircumlocutionTask | SurvivalScenarioTask
): SurvivalAdaptiveState {
  const independence = evaluation.independenceScore ?? 100;
  const isHighPerformance = evaluation.overallScore >= 80 && independence >= 75;
  const isFailure = evaluation.overallScore < 60;

  const consecutiveSuccesses = isHighPerformance ? state.consecutiveSuccesses + 1 : 0;
  const consecutiveFailures = isFailure ? state.consecutiveFailures + 1 : 0;
  const rapidStreak = evaluation.isSuccessful ? state.rapidStreak + 1 : 0;

  const prevTheta = state.irtTheta ?? 0.5;
  const taskDiff = taskDifficultyNumber(task, state.currentDifficulty);
  const expectedProb = calculateIrtExpectedProbability(prevTheta, taskDiff);
  const actualOutcome = (evaluation.overallScore / 100) * (independence / 100);
  const gamma = 0.1;
  const rawNextTheta = prevTheta + gamma * (actualOutcome - expectedProb);
  const nextTheta = Math.min(0.98, Math.max(0.15, Math.round(rawNextTheta * 100) / 100));
  const optimalZpdDifficulty = calculateZpdDifficulty(nextTheta);

  let nextDifficulty = state.currentDifficulty;
  if (consecutiveSuccesses >= 3) {
    nextDifficulty = Math.min(10, state.currentDifficulty + 1);
  } else if (consecutiveFailures >= 2) {
    nextDifficulty = Math.max(1, state.currentDifficulty - 1);
  }

  let nextPrepTime = state.prepTimeSec;
  const latency = evaluation.repairInitiationLatencyMs ?? 2000;
  if (evaluation.overallScore >= 85 && latency < 2200 && (evaluation.hintTierUsed ?? 0) === 0) {
    nextPrepTime = Math.max(1.5, Math.round((state.prepTimeSec - 0.5) * 10) / 10);
  } else if (evaluation.overallScore < 65) {
    nextPrepTime = Math.min(3.5, Math.round((state.prepTimeSec + 0.5) * 10) / 10);
  }

  const newErrors = (evaluation.errors || []).map((e) => e.patternKey || e.type).filter(Boolean);
  // Taboo slip is a first-class error pattern for survival
  if (evaluation.targetWordAvoided === false) {
    newErrors.push("taboo_slip");
  }
  if (evaluation.genusDetected === false) newErrors.push("missing_genus");
  if (evaluation.differentiaDetected === false) newErrors.push("missing_differentia");
  const updatedErrors = Array.from(new Set([...state.recentErrors.slice(-6), ...newErrors]));

  const promptKey =
    "targetWord" in task
      ? (task as CircumlocutionTask).targetWord
      : (task as SurvivalScenarioTask).audioPromptText;
  const updatedPrompts = [...state.recentPrompts.slice(-15), String(promptKey || "")];

  return {
    currentDifficulty: nextDifficulty,
    prepTimeSec: nextPrepTime,
    consecutiveSuccesses,
    consecutiveFailures,
    rapidStreak,
    recentScores: [...state.recentScores.slice(-9), evaluation.overallScore],
    recentErrors: updatedErrors,
    recentPrompts: updatedPrompts,
    irtTheta: nextTheta,
    optimalZpdDifficulty,
  };
}

export function updateSurvivalMastery(
  current: SurvivalSkillMastery,
  evaluation: SurvivalEvaluationResult
): SurvivalSkillMastery {
  const alpha = 0.15;
  const updateDimension = (prev: number, latest: number) =>
    Math.min(100, Math.max(0, Math.round(prev * (1 - alpha) + latest * alpha)));

  const newClarity = updateDimension(current.clarity, evaluation.conceptClarityScore ?? evaluation.overallScore);
  const newRetrieval = updateDimension(current.retrieval, evaluation.retrievalScore ?? evaluation.overallScore);
  const newFluency = updateDimension(current.fluency, evaluation.fluencyScore ?? 70);
  const newNaturalness = updateDimension(current.naturalness, evaluation.naturalnessScore ?? 70);
  const newIndependence = updateDimension(current.independence, evaluation.independenceScore ?? 100);

  const overallMastery = Math.round(
    newClarity * 0.3 +
      newRetrieval * 0.25 +
      newFluency * 0.15 +
      newNaturalness * 0.15 +
      newIndependence * 0.15
  );

  const isFirstAttemptSuccess =
    (evaluation.attemptNumber ?? 1) === 1 && evaluation.overallScore >= 70;

  return {
    clarity: newClarity,
    retrieval: newRetrieval,
    fluency: newFluency,
    naturalness: newNaturalness,
    independence: newIndependence,
    overallMastery,
    totalAttempts: current.totalAttempts + 1,
    successfulFirstAttempts: current.successfulFirstAttempts + (isFirstAttemptSuccess ? 1 : 0),
    streakCount: evaluation.isSuccessful ? current.streakCount + 1 : 0,
    updatedAt: new Date().toISOString(),
  };
}
