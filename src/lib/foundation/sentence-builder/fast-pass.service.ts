// Fast-Pass Deterministic Evaluation Engine for Sentence Builder (Function 1)
// Provides 0ms instant response matching, zero-token cost, and speech hesitation metrics

import type {
  SentenceBuilderTask,
  SentenceBuilderEvaluation,
  HesitationMetrics,
} from "@/types/sentence-builder";
import {
  normalizeSpokenText,
  calculateLevenshteinDistance,
  computeLevenshteinSimilarity,
  computeTokenOverlap,
  calculateHesitationMetrics as computeSharedHesitationMetrics,
} from "@/lib/foundation/shared/text-similarity";

export { normalizeSpokenText, calculateLevenshteinDistance };

/**
 * Calculates similarity ratio between 0.0 and 1.0
 */
export function calculateStringSimilarity(a: string, b: string): number {
  return computeLevenshteinSimilarity(a, b);
}

/**
 * Computes Token Overlap Jaccard Similarity
 */
export function calculateTokenSimilarity(a: string, b: string): number {
  return computeTokenOverlap(a, b);
}

export interface FastPassMatchResult {
  isMatch: boolean;
  confidence: number;
  matchedResponse?: string;
  matchedIndex?: number;
  reason?: string;
}

/**
 * Checks if the user spoken transcript closely matches any of the task's expected responses.
 * Threshold is set to 0.90 for fuzzy string match or 0.88 with 100% token inclusion.
 */
export function computeFastPassMatch(
  userTranscript: string,
  expectedResponses: string[],
  requiredElements?: string[]
): FastPassMatchResult {
  const normUser = normalizeSpokenText(userTranscript);
  if (!normUser || normUser.length < 3 || expectedResponses.length === 0) {
    return { isMatch: false, confidence: 0 };
  }

  // Verify required elements if specified
  if (requiredElements && requiredElements.length > 0) {
    const missingElements = requiredElements.filter((req) => {
      const normReq = normalizeSpokenText(req);
      return !normUser.includes(normReq);
    });

    // If more than 1 critical element is missing, cannot fast-pass
    if (missingElements.length > 0) {
      return {
        isMatch: false,
        confidence: 0.3,
        reason: `Missing required element: ${missingElements.join(", ")}`,
      };
    }
  }

  let bestMatch: { index: number; score: number; response: string } | null = null;

  expectedResponses.forEach((expected, idx) => {
    const normExpected = normalizeSpokenText(expected);
    if (normUser === normExpected) {
      bestMatch = { index: idx, score: 1.0, response: expected };
      return;
    }

    const strSim = calculateStringSimilarity(normUser, normExpected);
    const tokSim = calculateTokenSimilarity(normUser, normExpected);
    // Composite match score (65% string edit distance, 35% token set)
    const compositeScore = strSim * 0.65 + tokSim * 0.35;

    if (!bestMatch || compositeScore > bestMatch.score) {
      bestMatch = { index: idx, score: compositeScore, response: expected };
    }
  });

  if (bestMatch && (bestMatch as { score: number }).score >= 0.88) {
    const bm = bestMatch as { index: number; score: number; response: string };
    return {
      isMatch: true,
      confidence: Math.round(bm.score * 100) / 100,
      matchedResponse: bm.response,
      matchedIndex: bm.index,
    };
  }

  return {
    isMatch: false,
    confidence: bestMatch ? Math.round((bestMatch as { score: number }).score * 100) / 100 : 0,
  };
}

/**
 * Calculates acoustic & speech rate hesitation metrics
 */
export function calculateHesitationMetrics(params: {
  userTranscript: string;
  speechDurationMs: number;
  latencyMs?: number;
}): HesitationMetrics {
  return computeSharedHesitationMetrics(params);
}

/**
 * Builds a rich, instantaneous 0ms Evaluation object when Fast-Pass succeeds
 */
export function buildFastPassEvaluation(params: {
  task: SentenceBuilderTask;
  userTranscript: string;
  matchedResponse: string;
  confidence: number;
  latencyMs?: number;
  speechDurationMs?: number;
  hintTierUsed?: number;
  attemptNumber?: number;
}): SentenceBuilderEvaluation {
  const latency = params.latencyMs ?? 2000;
  const duration = params.speechDurationMs ?? 2500;
  const hintTier = params.hintTierUsed ?? 0;
  const attempt = params.attemptNumber ?? 1;

  const hesitationMetrics = calculateHesitationMetrics({
    userTranscript: params.userTranscript,
    speechDurationMs: duration,
    latencyMs: latency,
  });

  // Independence score drops with hints
  const independenceScore =
    hintTier === 0 ? 100 : hintTier === 1 ? 90 : hintTier === 2 ? 75 : hintTier === 3 ? 50 : 20;

  // Retrieval speed bonus (target < 2500ms)
  const speedBonus = latency < 2000 ? 5 : latency < 3500 ? 0 : -10;
  const retrievalScore = Math.min(100, Math.max(60, independenceScore + speedBonus));

  // Hesitation impact on fluency
  let fluencyScore = 95;
  if (hesitationMetrics.hesitationLevel === "hesitant") {
    fluencyScore = 80;
  } else if (hesitationMetrics.hesitationLevel === "moderate") {
    fluencyScore = 90;
  }

  const overallScore = Math.min(
    100,
    Math.max(
      80,
      Math.round(
        100 * 0.35 +           // meaning (perfect match)
        98 * 0.25 +            // grammar (perfect match)
        96 * 0.20 +            // naturalness
        retrievalScore * 0.20  // retrieval
      )
    )
  );

  const praisePoints = [
    "⚡ Phản xạ tức thì (Fast-Pass 0ms)!",
    "Câu nói chuẩn xác, đúng ngữ pháp và sát nghĩa 100%.",
  ];

  if (latency < 2200) {
    praisePoints.push("Tốc độ kích hoạt phản xạ rất nhạy bén (<2.2s).");
  }
  if (hesitationMetrics.hesitationLevel === "smooth") {
    praisePoints.push(`Nhịp nói mượt mà, lưu loát (${hesitationMetrics.wpm} wpm).`);
  }

  let actionableFeedback = "Rất tốt! Câu nói trọn vẹn và tự nhiên như người bản xứ.";
  if (hesitationMetrics.hesitationLevel === "hesitant") {
    actionableFeedback = `Bạn nói chuẩn xác! Tuy nhiên nhịp nói còn hơi ngập ngừng (${hesitationMetrics.wpm} wpm). Hãy thử lặp lại một lần nữa với nhịp điệu dứt khoát hơn.`;
  }

  return {
    overallScore,
    meaningScore: 100,
    grammarScore: 98,
    naturalnessScore: 96,
    fluencyScore,
    retrievalScore,
    independenceScore,
    isCommunicativelyValid: true,
    isSuccessful: true,
    needsRetry: false,
    userTranscript: params.userTranscript,
    cleanTranscript: normalizeSpokenText(params.userTranscript),
    latencyMs: latency,
    speechDurationMs: duration,
    errors: [],
    betterVersion: params.matchedResponse,
    praisePoints,
    actionableFeedback,
    hintTierUsed: hintTier,
    attemptNumber: attempt,
    evaluationSource: "fast_pass",
    hesitationMetrics,
  };
}
