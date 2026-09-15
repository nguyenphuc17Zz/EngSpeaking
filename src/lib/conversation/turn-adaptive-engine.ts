// Turn Adaptive Progression & Mastery Engine (aligned with SB/VN-EN/Survival/Drill)

import type {
  ConversationAdaptiveState,
  ConversationSkillMastery,
  TurnPedagogy,
} from "@/types/conversation";

export type { ConversationAdaptiveState, ConversationSkillMastery };

export const INITIAL_CONVERSATION_ADAPTIVE_STATE: ConversationAdaptiveState = {
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

export const INITIAL_CONVERSATION_MASTERY: ConversationSkillMastery = {
  fluency: 50,
  retrieval: 50,
  naturalness: 50,
  grammar: 55,
  independence: 40,
  overallMastery: 49,
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

export function updateConversationAdaptiveProgression(
  state: ConversationAdaptiveState,
  pedagogy: TurnPedagogy,
  scenarioDifficulty?: number
): ConversationAdaptiveState {
  const independence = pedagogy.independenceScore ?? 100;
  const score = pedagogy.turnScore ?? 75;
  const isHighPerformance = score >= 80 && independence >= 75;
  const isFailure = score < 60;

  const consecutiveSuccesses = isHighPerformance ? state.consecutiveSuccesses + 1 : 0;
  const consecutiveFailures = isFailure ? state.consecutiveFailures + 1 : 0;
  const rapidStreak = score >= 70 ? state.rapidStreak + 1 : 0;

  const prevTheta = state.irtTheta ?? 0.5;
  const taskDiff = scenarioDifficulty ?? state.currentDifficulty;
  const expectedProb = calculateIrtExpectedProbability(prevTheta, taskDiff);
  const actualOutcome = (score / 100) * (independence / 100);
  const nextTheta = Math.min(
    0.98,
    Math.max(0.15, Math.round((prevTheta + 0.1 * (actualOutcome - expectedProb)) * 100) / 100)
  );

  let nextDifficulty = state.currentDifficulty;
  if (consecutiveSuccesses >= 3) nextDifficulty = Math.min(10, state.currentDifficulty + 1);
  else if (consecutiveFailures >= 2) nextDifficulty = Math.max(1, state.currentDifficulty - 1);

  let nextPrepTime = state.prepTimeSec;
  const latency = pedagogy.latencyMs ?? 2000;
  if (score >= 85 && latency < 2200 && (pedagogy.hintTierUsed ?? 0) === 0) {
    nextPrepTime = Math.max(1.5, Math.round((state.prepTimeSec - 0.5) * 10) / 10);
  } else if (score < 65) {
    nextPrepTime = Math.min(3.5, Math.round((state.prepTimeSec + 0.5) * 10) / 10);
  }

  const newPatterns = (pedagogy.errors || []).map((e) => e.patternKey || e.type).filter(Boolean);
  return {
    currentDifficulty: nextDifficulty,
    prepTimeSec: nextPrepTime,
    consecutiveSuccesses,
    consecutiveFailures,
    rapidStreak,
    recentScores: [...state.recentScores.slice(-9), score],
    recentPatterns: [...state.recentPatterns.slice(-15), ...newPatterns].slice(-15),
    irtTheta: nextTheta,
    optimalZpdDifficulty: calculateZpdDifficulty(nextTheta),
  };
}

export function updateConversationMastery(
  current: ConversationSkillMastery,
  pedagogy: TurnPedagogy
): ConversationSkillMastery {
  const alpha = 0.15;
  const upd = (prev: number, latest: number) =>
    Math.min(100, Math.max(0, Math.round(prev * (1 - alpha) + latest * alpha)));
  const score = pedagogy.turnScore ?? 75;

  const newFluency = upd(current.fluency, pedagogy.fluencyScore ?? score);
  const newRetrieval = upd(current.retrieval, pedagogy.retrievalScore ?? score);
  const newNaturalness = upd(current.naturalness, score);
  const newGrammar = upd(current.grammar, score);
  const newIndependence = upd(current.independence, pedagogy.independenceScore ?? 100);

  const overallMastery = Math.round(
    newFluency * 0.2 +
      newRetrieval * 0.25 +
      newNaturalness * 0.2 +
      newGrammar * 0.2 +
      newIndependence * 0.15
  );

  const isFirstAttemptSuccess = (pedagogy.attemptNumber ?? 1) === 1 && score >= 70;

  return {
    fluency: newFluency,
    retrieval: newRetrieval,
    naturalness: newNaturalness,
    grammar: newGrammar,
    independence: newIndependence,
    overallMastery,
    totalAttempts: current.totalAttempts + 1,
    successfulFirstAttempts: current.successfulFirstAttempts + (isFirstAttemptSuccess ? 1 : 0),
    streakCount: score >= 70 ? current.streakCount + 1 : 0,
    updatedAt: new Date().toISOString(),
  };
}
