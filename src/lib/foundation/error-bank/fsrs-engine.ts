// FSRS Spaced Repetition Engine (DSR Model) — Personalized for Spoken Error Review
// Based on Free Spaced Repetition Scheduler principles (Difficulty, Stability, Retrievability)
// Enhanced with Spoken Latency Penalties for language automaticity.

export type FSRSRating = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

export interface FSRSState {
  stability: number; // Days memory retention stays >= 90%
  difficulty: number; // 1.0 (easiest) to 10.0 (hardest)
  retrievability: number; // Current retention probability % (0 - 100)
  lastReviewAt: string;
  nextReviewDueAt: string;
}

export interface FSRSReviewInput {
  currentStability?: number;
  currentDifficulty?: number;
  lastReviewAt?: string;
  passed: boolean;
  responseLatencyMs?: number;
  wasSelfCorrected?: boolean;
}

const DECAY_FACTOR = 0.234567; // (1 + 0.234567)^(-2) ≈ 0.90 at t = S
const POWER = 0.5; // Power parameter for Ebbinghaus forgetting curve

/**
 * Calculate current retrievability R(t) as a percentage (0 to 100).
 * R(t) = (1 + DECAY_FACTOR * (t / S))^(-1 / POWER)
 */
export function calculateRetrievability(stabilityDays: number, lastReviewAt?: string): number {
  if (!lastReviewAt || stabilityDays <= 0) return 95;
  const now = Date.now();
  const lastMs = new Date(lastReviewAt).getTime();
  const daysElapsed = Math.max(0, (now - lastMs) / (1000 * 60 * 60 * 24));

  if (daysElapsed === 0) return 100;

  const r = Math.pow(1 + DECAY_FACTOR * (daysElapsed / Math.max(0.1, stabilityDays)), -1 / POWER);
  return Math.round(Math.min(100, Math.max(5, r * 100)));
}

/**
 * Maps performance and spoken response latency to an objective FSRS Rating (1 - 4).
 */
export function mapPerformanceToFSRSRating(
  passed: boolean,
  responseLatencyMs: number = 2500,
  wasSelfCorrected: boolean = false
): FSRSRating {
  if (!passed) {
    return 1; // Again
  }

  // If passed, judge by spoken automaticity (latency)
  if (wasSelfCorrected || responseLatencyMs > 3800) {
    return 2; // Hard: hesitated or stumbled before recovering
  }

  if (responseLatencyMs < 2000) {
    return 4; // Easy: instant automaticity
  }

  return 3; // Good: normal fluent response
}

/**
 * Updates FSRS state (Stability, Difficulty, Retrievability, Next Due Date).
 */
export function computeFSRSUpdate(input: FSRSReviewInput): FSRSState {
  const now = new Date();
  const rating = mapPerformanceToFSRSRating(
    input.passed,
    input.responseLatencyMs,
    input.wasSelfCorrected
  );

  const prevStability = input.currentStability ?? 0.5;
  const prevDifficulty = input.currentDifficulty ?? 5.0;

  // 1. Update Difficulty (1.0 to 10.0)
  // Harder rating increases difficulty, easier decreases it with mean-reversion
  const deltaD = -0.7 * (rating - 3);
  let newDifficulty = 0.85 * prevDifficulty + 0.15 * 5.0 + deltaD;
  newDifficulty = Math.min(10.0, Math.max(1.0, Math.round(newDifficulty * 10) / 10));

  // 2. Update Stability (in days)
  let newStability: number;
  const latencyMs = input.responseLatencyMs ?? 2500;
  // Latency penalty: if slow, memory retrieval was effortful
  const latencyPenalty = latencyMs > 3500 ? Math.max(0.65, 1.0 - (latencyMs - 3500) / 5000) : 1.0;

  if (rating === 1) {
    // Lapse: Reset stability to short interval (3 - 8 hours)
    newStability = Math.min(0.35, Math.max(0.12, prevStability * 0.25));
  } else if (!input.lastReviewAt || prevStability <= 0.2) {
    // First successful review
    const initialStabilities = { 2: 0.7, 3: 2.0, 4: 4.5 };
    newStability = initialStabilities[rating] * latencyPenalty;
  } else {
    // Expansion phase
    const ratingMultipliers = { 2: 1.25, 3: 2.1, 4: 3.2 };
    const difficultyFactor = (11 - newDifficulty) / 5.0; // Higher difficulty -> slower growth
    const growth = ratingMultipliers[rating] * difficultyFactor * latencyPenalty;
    newStability = Math.max(0.2, prevStability * growth);
  }

  newStability = Math.round(newStability * 100) / 100;

  // 3. Compute next review due time (days converted to ms)
  const nextIntervalDays = Math.max(0.08, newStability); // min ~2 hours
  const nextReviewMs = now.getTime() + nextIntervalDays * 24 * 60 * 60 * 1000;
  const nextReviewDueAt = new Date(nextReviewMs).toISOString();

  return {
    stability: newStability,
    difficulty: newDifficulty,
    retrievability: 100, // Just reviewed
    lastReviewAt: now.toISOString(),
    nextReviewDueAt,
  };
}
