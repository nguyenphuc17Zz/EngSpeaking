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

export function updateAdaptiveProgression(
  state: AdaptiveState,
  evaluation: SentenceBuilderEvaluation,
  task: SentenceBuilderTask
): AdaptiveState {
  const isHighPerformance = evaluation.overallScore >= 80 && evaluation.independenceScore >= 75;
  const isFailure = evaluation.overallScore < 60;

  const consecutiveSuccesses = isHighPerformance ? state.consecutiveSuccesses + 1 : 0;
  const consecutiveFailures = isFailure ? state.consecutiveFailures + 1 : 0;

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
