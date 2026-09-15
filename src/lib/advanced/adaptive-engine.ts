// Adaptive engine for Advanced Studio — bridges Sentence Builder (IRT/ZPD) + VN→EN (gap/rapidStreak)
// 3-Track × 3-Level ladder: L1 Controlled → L2 Semi → L3 Free

import type {
  AdvancedEvaluation,
  AdvancedLevel,
  AdvancedSkillMastery,
  AdvancedTask,
  AdvancedTrack,
} from "@/types/advanced";

export interface AdvancedAdaptiveState {
  currentLevel: AdvancedLevel;
  currentDifficulty: number; // 1-10
  prepTimeSec: number; // 3.0 → 1.5
  blitzLimitSec: number; // 10 → 3
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  rapidStreak: number;
  recentScores: number[];
  recentErrors: string[];
  recentPrompts: string[];
  irtTheta: number; // 0.15 - 0.98
  optimalZpdDifficulty: number; // 1-10
  gapCounts: {
    none: number;
    retrieval_gap: number;
    knowledge_gap: number;
    production_gap: number;
  };
}

export const ADVANCED_LEVEL_ORDER: AdvancedLevel[] = ["L1", "L2", "L3"];

export const ADVANCED_LEVEL_CONFIG: Record<
  AdvancedLevel,
  { prepTimeSec: number; blitzLimitSec: number; difficulty: number; scaffold: 1 | 2 | 3; toulmin: string[] }
> = {
  L1: { prepTimeSec: 3.0, blitzLimitSec: 10, difficulty: 3, scaffold: 1, toulmin: ["claim", "data"] },
  L2: { prepTimeSec: 2.0, blitzLimitSec: 6, difficulty: 5, scaffold: 2, toulmin: ["claim", "data", "warrant"] },
  L3: { prepTimeSec: 1.5, blitzLimitSec: 4, difficulty: 7, scaffold: 3, toulmin: ["claim", "data", "warrant", "rebuttal"] },
};

export const INITIAL_ADVANCED_ADAPTIVE_STATE: AdvancedAdaptiveState = {
  currentLevel: "L1",
  currentDifficulty: 3,
  prepTimeSec: 3.0,
  blitzLimitSec: 10,
  consecutiveSuccesses: 0,
  consecutiveFailures: 0,
  rapidStreak: 0,
  recentScores: [],
  recentErrors: [],
  recentPrompts: [],
  irtTheta: 0.5,
  optimalZpdDifficulty: 4,
  gapCounts: { none: 0, retrieval_gap: 0, knowledge_gap: 0, production_gap: 0 },
};

export const INITIAL_ADVANCED_MASTERY: AdvancedSkillMastery = {
  reflex: 50,
  argumentation: 50,
  extendedDiscourse: 50,
  fluency: 45,
  independence: 40,
  overallMastery: 48,
  totalAttempts: 0,
  successfulFirstAttempts: 0,
  streakCount: 0,
  updatedAt: new Date().toISOString(),
};

export function calculateIrtExpectedProbability(theta: number, difficulty: number): number {
  const normDiff = Math.min(1.0, Math.max(0.1, difficulty / 10));
  const exponent = -2.5 * (theta - normDiff);
  return 1 / (1 + Math.exp(exponent));
}

export function calculateZpdDifficulty(theta: number): number {
  return Math.min(10, Math.max(1, Math.round(theta * 10)));
}

function clampLevelUp(level: AdvancedLevel): AdvancedLevel {
  const idx = ADVANCED_LEVEL_ORDER.indexOf(level);
  return ADVANCED_LEVEL_ORDER[Math.min(ADVANCED_LEVEL_ORDER.length - 1, idx + 1)];
}

function clampLevelDown(level: AdvancedLevel): AdvancedLevel {
  const idx = ADVANCED_LEVEL_ORDER.indexOf(level);
  return ADVANCED_LEVEL_ORDER[Math.max(0, idx - 1)];
}

export function updateAdvancedAdaptiveState(
  state: AdvancedAdaptiveState,
  evaluation: AdvancedEvaluation,
  task: AdvancedTask
): AdvancedAdaptiveState {
  const isHigh = evaluation.overallScore >= 80 && evaluation.independenceScore >= 75;
  const isFail = evaluation.overallScore < 60;

  const consecutiveSuccesses = isHigh ? state.consecutiveSuccesses + 1 : 0;
  const consecutiveFailures = isFail ? state.consecutiveFailures + 1 : 0;
  const rapidStreak = evaluation.isSuccessful ? state.rapidStreak + 1 : 0;

  // IRT theta update (same formula as Sentence Builder for continuity)
  const prevTheta = state.irtTheta ?? 0.5;
  const taskDiff = task.difficulty?.overall || state.currentDifficulty || 3;
  const expectedProb = calculateIrtExpectedProbability(prevTheta, taskDiff);
  const actualOutcome = (evaluation.overallScore / 100) * (evaluation.independenceScore / 100);
  const nextTheta = Math.min(0.98, Math.max(0.15, Math.round((prevTheta + 0.1 * (actualOutcome - expectedProb)) * 100) / 100));

  let nextLevel = state.currentLevel;
  let nextDifficulty = state.currentDifficulty;

  if (consecutiveSuccesses >= 3) {
    if (state.currentLevel !== "L3") {
      nextLevel = clampLevelUp(state.currentLevel);
      nextDifficulty = Math.min(10, state.currentDifficulty + 1);
    } else {
      nextDifficulty = Math.min(10, state.currentDifficulty + 1);
    }
  }
  if (consecutiveFailures >= 2) {
    if (state.currentLevel !== "L1") {
      nextLevel = clampLevelDown(state.currentLevel);
      nextDifficulty = Math.max(1, state.currentDifficulty - 1);
    } else {
      nextDifficulty = Math.max(1, state.currentDifficulty - 1);
    }
  }

  // Prep/blitz ladder follows new level defaults, then fine-tuned by latency
  const levelCfg = ADVANCED_LEVEL_CONFIG[nextLevel];
  let nextPrep = levelCfg.prepTimeSec;
  let nextBlitz = levelCfg.blitzLimitSec;

  // Fast + independent → keep pressure high; struggling → ease slightly (bounded by level)
  if (evaluation.overallScore >= 85 && evaluation.responseLatencyMs < 2200 && evaluation.hintTierUsed === 0) {
    nextPrep = Math.max(1.5, Math.round((state.prepTimeSec - 0.25) * 10) / 10);
    nextBlitz = Math.max(3, state.blitzLimitSec - 1);
  } else if (evaluation.overallScore < 65 || evaluation.gapType === "retrieval_gap") {
    nextPrep = Math.min(3.5, Math.round((state.prepTimeSec + 0.25) * 10) / 10);
    nextBlitz = Math.min(10, state.blitzLimitSec + 1);
  } else {
    // Drift toward level default
    nextPrep = Math.round(((state.prepTimeSec + levelCfg.prepTimeSec) / 2) * 10) / 10;
    nextBlitz = Math.round((state.blitzLimitSec + levelCfg.blitzLimitSec) / 2);
  }

  const newErrors = evaluation.errors.map((e) => e.patternKey || e.type).filter(Boolean);
  const gapKey = evaluation.gapType || "none";

  return {
    currentLevel: nextLevel,
    currentDifficulty: nextDifficulty,
    prepTimeSec: nextPrep,
    blitzLimitSec: nextBlitz,
    consecutiveSuccesses,
    consecutiveFailures,
    rapidStreak,
    recentScores: [...state.recentScores.slice(-9), evaluation.overallScore],
    recentErrors: Array.from(new Set([...state.recentErrors.slice(-6), ...newErrors])),
    recentPrompts: [...state.recentPrompts.slice(-15), task.promptVi],
    irtTheta: nextTheta,
    optimalZpdDifficulty: calculateZpdDifficulty(nextTheta),
    gapCounts: { ...state.gapCounts, [gapKey]: (state.gapCounts[gapKey] || 0) + 1 },
  };
}

export function updateAdvancedMastery(
  current: AdvancedSkillMastery,
  evaluation: AdvancedEvaluation,
  track: AdvancedTrack
): AdvancedSkillMastery {
  const alpha = 0.15;
  const ema = (prev: number, latest: number) =>
    Math.min(100, Math.max(0, Math.round(prev * (1 - alpha) + latest * alpha)));

  const newReflex = track === "reflex" ? ema(current.reflex, evaluation.overallScore) : current.reflex;
  const newArg = track === "argument" ? ema(current.argumentation, evaluation.overallScore) : current.argumentation;
  const newExt = track === "extended" ? ema(current.extendedDiscourse, evaluation.overallScore) : current.extendedDiscourse;
  const newFluency = ema(current.fluency, evaluation.fluencyScore);
  const newIndep = ema(current.independence, evaluation.independenceScore);

  const overallMastery = Math.round(
    newReflex * 0.25 + newArg * 0.25 + newExt * 0.2 + newFluency * 0.15 + newIndep * 0.15
  );

  const isFirstSuccess = evaluation.attemptNumber === 1 && evaluation.overallScore >= 75;

  return {
    reflex: newReflex,
    argumentation: newArg,
    extendedDiscourse: newExt,
    fluency: newFluency,
    independence: newIndep,
    overallMastery,
    totalAttempts: current.totalAttempts + 1,
    successfulFirstAttempts: current.successfulFirstAttempts + (isFirstSuccess ? 1 : 0),
    streakCount: evaluation.overallScore >= 75 ? current.streakCount + 1 : 0,
    updatedAt: new Date().toISOString(),
  };
}
