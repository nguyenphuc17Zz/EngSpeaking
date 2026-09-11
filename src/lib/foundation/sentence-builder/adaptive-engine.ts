// Adaptive Progression & Mastery Engine for Sentence Builder (Function 1)
// Manages Difficulty ladder, Level A/B/C transitions, Latency scaling, and 5-D Skill Mastery

import type {
  SentenceBuilderTask,
  SentenceBuilderEvaluation,
  SentenceBuilderControlLevel,
  SentenceBuilderSkillMastery,
} from "@/types/sentence-builder";

export interface AdaptiveState {
  currentLevel: SentenceBuilderControlLevel;
  currentDifficulty: number; // 1-10
  prepTimeSec: number; // 3.0 -> 1.5
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  recentScores: number[];
  recentErrors: string[];
  recentPrompts: string[];
  irtTheta?: number; // IRT ability parameter (0.1 to 1.0)
  optimalZpdDifficulty?: number; // Zone of Proximal Development target difficulty (1-10)
}

export const INITIAL_ADAPTIVE_STATE: AdaptiveState = {
  currentLevel: "controlled",
  currentDifficulty: 3,
  prepTimeSec: 3.0,
  consecutiveSuccesses: 0,
  consecutiveFailures: 0,
  recentScores: [],
  recentErrors: [],
  recentPrompts: [],
  irtTheta: 0.5,
  optimalZpdDifficulty: 3,
};

export const INITIAL_SKILL_MASTERY: SentenceBuilderSkillMastery = {
  grammar: 65,
  vocabularyRetrieval: 50,
  sentenceConstruction: 55,
  fluency: 45,
  independence: 40,
  overallMastery: 51,
  totalAttempts: 0,
  successfulFirstAttempts: 0,
  streakCount: 0,
  updatedAt: new Date().toISOString(),
};

/**
 * Calculates IRT Rasch expected success probability P(Success | theta, difficulty)
 */
export function calculateIrtExpectedProbability(theta: number, difficulty: number): number {
  const normDiff = Math.min(1.0, Math.max(0.1, difficulty / 10));
  // Logistic function with discrimination scaling k = 2.5
  const exponent = -2.5 * (theta - normDiff);
  return 1 / (1 + Math.exp(exponent));
}

/**
 * Calculates ZPD (Zone of Proximal Development) optimal target difficulty
 * Targets ~75% expected success probability to maintain flow state without frustration
 */
export function calculateZpdDifficulty(theta: number): number {
  // Solve for beta when P = 0.75 -> theta - beta = ln(3)/2.5 ~ 0.44
  // Target difficulty = (theta - 0.15) * 10, clamped between 1 and 10
  const idealDifficulty = Math.round(theta * 10);
  return Math.min(10, Math.max(1, idealDifficulty));
}

export function updateAdaptiveProgression(
  state: AdaptiveState,
  evaluation: SentenceBuilderEvaluation,
  task: SentenceBuilderTask
): AdaptiveState {
  const isHighPerformance = evaluation.overallScore >= 80 && evaluation.independenceScore >= 75;
  const isFailure = evaluation.overallScore < 60;

  const consecutiveSuccesses = isHighPerformance ? state.consecutiveSuccesses + 1 : 0;
  const consecutiveFailures = isFailure ? state.consecutiveFailures + 1 : 0;

  // 1. Update IRT ability theta
  const prevTheta = state.irtTheta ?? 0.5;
  const taskDiff = task.difficulty?.overall || state.currentDifficulty || 3;
  const expectedProb = calculateIrtExpectedProbability(prevTheta, taskDiff);
  const actualOutcome = (evaluation.overallScore / 100) * (evaluation.independenceScore / 100);

  // Bayesian/Stochastic Gradient step with learning rate gamma = 0.1
  const gamma = 0.1;
  const rawNextTheta = prevTheta + gamma * (actualOutcome - expectedProb);
  const nextTheta = Math.min(0.98, Math.max(0.15, Math.round(rawNextTheta * 100) / 100));
  const optimalZpdDifficulty = calculateZpdDifficulty(nextTheta);

  let nextLevel = state.currentLevel;
  let nextDifficulty = state.currentDifficulty;
  let nextPrepTime = state.prepTimeSec;

  // RULE 1: 3 consecutive strong responses -> remove scaffold or increase difficulty
  if (consecutiveSuccesses >= 3) {
    if (state.currentLevel === "controlled") {
      nextLevel = "semi_controlled";
      nextDifficulty = Math.min(10, state.currentDifficulty + 1);
    } else if (state.currentLevel === "semi_controlled") {
      nextLevel = "free";
      nextDifficulty = Math.min(10, state.currentDifficulty + 1);
    } else {
      nextDifficulty = Math.min(10, state.currentDifficulty + 1);
    }
  }

  // RULE 2: 2 consecutive failures -> reduce difficulty or add scaffold
  if (consecutiveFailures >= 2) {
    if (state.currentLevel === "free") {
      nextLevel = "semi_controlled";
      nextDifficulty = Math.max(1, state.currentDifficulty - 1);
    } else if (state.currentLevel === "semi_controlled") {
      nextLevel = "controlled";
      nextDifficulty = Math.max(1, state.currentDifficulty - 1);
    } else {
      nextDifficulty = Math.max(1, state.currentDifficulty - 1);
    }
  }

  // RULE 3: Fast + correct + independent -> reduce prep time
  if (evaluation.overallScore >= 85 && evaluation.latencyMs < 2200 && evaluation.hintTierUsed === 0) {
    nextPrepTime = Math.max(1.5, Math.round((state.prepTimeSec - 0.5) * 10) / 10);
  } else if (evaluation.overallScore < 65) {
    // If struggling, grant slightly more prep time (max 3.5s)
    nextPrepTime = Math.min(3.5, Math.round((state.prepTimeSec + 0.5) * 10) / 10);
  }

  // Record recent error pattern keys
  const newErrors = evaluation.errors.map((e) => e.patternKey || e.type).filter(Boolean);
  const updatedErrors = Array.from(new Set([...state.recentErrors.slice(-6), ...newErrors]));

  // Record recent prompt for anti-repetition
  const updatedPrompts = [...state.recentPrompts.slice(-15), task.promptVi];

  return {
    currentLevel: nextLevel,
    currentDifficulty: nextDifficulty,
    prepTimeSec: nextPrepTime,
    consecutiveSuccesses,
    consecutiveFailures,
    recentScores: [...state.recentScores.slice(-9), evaluation.overallScore],
    recentErrors: updatedErrors,
    recentPrompts: updatedPrompts,
    irtTheta: nextTheta,
    optimalZpdDifficulty,
  };
}

export function updateSkillMastery(
  current: SentenceBuilderSkillMastery,
  evaluation: SentenceBuilderEvaluation
): SentenceBuilderSkillMastery {
  // Exponential Moving Average (EMA) with learning rate alpha = 0.15
  const alpha = 0.15;
  const updateDimension = (prev: number, latest: number) => {
    return Math.min(100, Math.max(0, Math.round(prev * (1 - alpha) + latest * alpha)));
  };

  const newGrammar = updateDimension(current.grammar, evaluation.grammarScore);
  const newVocab = updateDimension(current.vocabularyRetrieval, evaluation.meaningScore);
  const newConstruction = updateDimension(current.sentenceConstruction, evaluation.overallScore);
  const newFluency = updateDimension(current.fluency, evaluation.fluencyScore);
  const newIndependence = updateDimension(current.independence, evaluation.independenceScore);

  const overallMastery = Math.round(
    newGrammar * 0.2 +
    newVocab * 0.25 +
    newConstruction * 0.25 +
    newFluency * 0.15 +
    newIndependence * 0.15
  );

  const isFirstAttemptSuccess = evaluation.attemptNumber === 1 && evaluation.overallScore >= 75;

  return {
    grammar: newGrammar,
    vocabularyRetrieval: newVocab,
    sentenceConstruction: newConstruction,
    fluency: newFluency,
    independence: newIndependence,
    overallMastery,
    totalAttempts: current.totalAttempts + 1,
    successfulFirstAttempts: current.successfulFirstAttempts + (isFirstAttemptSuccess ? 1 : 0),
    streakCount: evaluation.overallScore >= 75 ? current.streakCount + 1 : 0,
    updatedAt: new Date().toISOString(),
  };
}
