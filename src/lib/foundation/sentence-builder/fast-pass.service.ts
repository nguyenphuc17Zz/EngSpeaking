// Fast-Pass Deterministic Evaluation Engine for Sentence Builder (Function 1)
// Provides 0ms instant response matching, zero-token cost, and speech hesitation metrics

import type {
  SentenceBuilderTask,
  SentenceBuilderEvaluation,
  HesitationMetrics,
} from "@/types/sentence-builder";

// Contraction dictionary for canonical spoken normalization
const CONTRACTION_MAP: Record<string, string> = {
  "i'm": "i am",
  "im": "i am",
  "you're": "you are",
  "youre": "you are",
  "he's": "he is",
  "hes": "he is",
  "she's": "she is",
  "shes": "she is",
  "it's": "it is",
  "its": "it is",
  "we're": "we are",
  "were": "we are",
  "they're": "they are",
  "theyre": "they are",
  "don't": "do not",
  "dont": "do not",
  "doesn't": "does not",
  "doesnt": "does not",
  "didn't": "did not",
  "didnt": "did not",
  "won't": "will not",
  "wont": "will not",
  "can't": "cannot",
  "cant": "cannot",
  "couldn't": "could not",
  "couldnt": "could not",
  "shouldn't": "should not",
  "shouldnt": "should not",
  "wouldn't": "would not",
  "wouldnt": "would not",
  "isn't": "is not",
  "isnt": "is not",
  "aren't": "are not",
  "arent": "are not",
  "wasn't": "was not",
  "wasnt": "was not",
  "weren't": "were not",
  "werent": "were not",
  "haven't": "have not",
  "havent": "have not",
  "hasn't": "has not",
  "hasnt": "has not",
  "hadn't": "had not",
  "hadnt": "had not",
  "i've": "i have",
  "ive": "i have",
  "you've": "you have",
  "youve": "you have",
  "we've": "we have",
  "weve": "we have",
  "they've": "they have",
  "theyve": "they have",
  "i'll": "i will",
  "ill": "i will",
  "you'll": "you will",
  "youll": "you will",
  "he'll": "he will",
  "hell": "he will",
  "she'll": "she will",
  "shell": "she will",
  "we'll": "we will",
  "well": "we will",
  "they'll": "they will",
  "theyll": "they will",
  "let's": "let us",
  "lets": "let us",
  "gonna": "going to",
  "wanna": "want to",
  "gotta": "got to",
};

/**
 * Normalizes spoken English text:
 * - Lowercases and removes accents/apostrophes variations
 * - Expands contractions to canonical forms
 * - Strips punctuation marks
 * - Collapses extra whitespace
 */
export function normalizeSpokenText(text: string): string {
  if (!text) return "";

  const cleaned = text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[.,/#!$%^&*;:{}=\-_~()?"\\]/g, " ")
    .trim();

  // Split into tokens, expand contractions, and re-join
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const normalizedTokens = tokens.map((tok) => CONTRACTION_MAP[tok] || tok);

  return normalizedTokens.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Standard Levenshtein Distance implementation
 */
export function calculateLevenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculates similarity ratio between 0.0 and 1.0
 */
export function calculateStringSimilarity(a: string, b: string): number {
  const normA = normalizeSpokenText(a);
  const normB = normalizeSpokenText(b);

  if (!normA && !normB) return 1.0;
  if (!normA || !normB) return 0.0;
  if (normA === normB) return 1.0;

  const maxLen = Math.max(normA.length, normB.length);
  const dist = calculateLevenshteinDistance(normA, normB);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Computes Token Overlap Jaccard Similarity
 */
export function calculateTokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(normalizeSpokenText(a).split(/\s+/).filter(Boolean));
  const tokensB = new Set(normalizeSpokenText(b).split(/\s+/).filter(Boolean));

  if (tokensA.size === 0 && tokensB.size === 0) return 1.0;
  if (tokensA.size === 0 || tokensB.size === 0) return 0.0;

  let intersection = 0;
  tokensA.forEach((t) => {
    if (tokensB.has(t)) intersection++;
  });

  const union = new Set([...tokensA, ...tokensB]).size;
  return intersection / union;
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
  const norm = normalizeSpokenText(params.userTranscript);
  const words = norm.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const durationSec = Math.max(0.6, params.speechDurationMs / 1000);
  const wpm = Math.round((wordCount / durationSec) * 60);

  // Normal conversational speech is 110-150 WPM.
  // Slow/hesitant speech is < 85 WPM with notable pauses.
  const idealDurationSec = wordCount / 2.2; // ~130 WPM
  const pauseEstimatedSec = Math.max(0, Math.round((durationSec - idealDurationSec) * 10) / 10);

  let hesitationLevel: HesitationMetrics["hesitationLevel"] = "smooth";
  if (wpm < 75 || pauseEstimatedSec > 2.0) {
    hesitationLevel = "hesitant";
  } else if (wpm < 105 || pauseEstimatedSec > 1.0) {
    hesitationLevel = "moderate";
  }

  return {
    wpm,
    durationMs: params.speechDurationMs,
    hesitationLevel,
    pauseEstimatedSec,
  };
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
