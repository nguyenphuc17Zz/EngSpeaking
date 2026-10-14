// Fast-Pass Instant Semantic Matching Engine for VN -> EN Speaking (Function 2)
// Provides <100ms instant evaluation, zero LLM token consumption, and seamless fallback to Tier 2 Deep LLM

import type {
  VNToENTask,
  VNToENEvaluation,
  SemanticAlternative,
  SayItBetterSet,
} from "@/types/vn-to-en";
import {
  normalizeSpokenText,
  calculateLevenshteinDistance,
} from "@/lib/foundation/shared/text-similarity";

export { normalizeSpokenText, calculateLevenshteinDistance };

export function calculateTokenSetRatio(spokenTokens: string[], expectedTokens: string[]): number {
  if (spokenTokens.length === 0 || expectedTokens.length === 0) return 0;
  const spokenSet = new Set(spokenTokens);
  const expectedSet = new Set(expectedTokens);

  let intersectionCount = 0;
  for (const token of expectedSet) {
    if (spokenSet.has(token)) {
      intersectionCount++;
    } else {
      // 1-char edit distance fuzzy match (for plurals, slight STT slips)
      const fuzzyMatch = Array.from(spokenSet).some(
        (st) => Math.abs(st.length - token.length) <= 1 && calculateLevenshteinDistance(st, token) <= 1
      );
      if (fuzzyMatch) intersectionCount++;
    }
  }

  return intersectionCount / Math.max(expectedSet.size, 1);
}

export function checkMeaningElementsCoverage(
  spokenTokens: string[],
  requiredElements: string[]
): number {
  if (!requiredElements || requiredElements.length === 0) return 1.0;
  const spokenStr = spokenTokens.join(" ");
  let covered = 0;

  for (const elem of requiredElements) {
    const elemNorm = normalizeSpokenText(elem);
    const elemWords = elemNorm.split(/\s+/).filter(Boolean);
    if (elemWords.length === 0) {
      covered++;
      continue;
    }

    // Direct substring match
    if (spokenStr.includes(elemNorm)) {
      covered++;
      continue;
    }

    // Partial token presence
    const foundWords = elemWords.filter((w) => spokenTokens.includes(w));
    if (foundWords.length / elemWords.length >= 0.6) {
      covered++;
    }
  }

  return covered / requiredElements.length;
}

export interface FastPassVNResult {
  canFastPass: boolean;
  evaluation?: VNToENEvaluation;
  matchScore?: number;
}

export function computeFastPassVNMatch(
  task: VNToENTask,
  userTranscript: string,
  opts: {
    responseLatencyMs?: number;
    speechDurationMs?: number;
    hintTierUsed?: number;
    attemptNumber?: number;
  } = {}
): FastPassVNResult {
  const normSpoken = normalizeSpokenText(userTranscript);
  if (!normSpoken || normSpoken.length < 3) {
    return { canFastPass: false };
  }

  const spokenTokens = normSpoken.split(/\s+/).filter(Boolean);
  if (spokenTokens.length < 2) {
    return { canFastPass: false };
  }

  const latencyMs = opts.responseLatencyMs ?? 2000;
  const durationMs = opts.speechDurationMs ?? 2500;
  const hintTier = opts.hintTierUsed ?? 0;
  const attempt = opts.attemptNumber ?? 1;

  // Build candidate pool from expectedResponses, sayItBetter, and targetIntent
  const candidates: string[] = [
    ...(task.expectedResponses || []),
    task.targetIntent || "",
    task.sayItBetter?.professional || "",
    task.sayItBetter?.casual || "",
    task.sayItBetter?.idiomatic || "",
  ].filter(Boolean);

  let bestMatchRatio = 0;
  let bestCandidate = candidates[0] || "";

  for (const candidate of candidates) {
    const normCand = normalizeSpokenText(candidate);
    const candTokens = normCand.split(/\s+/).filter(Boolean);

    // Exact match
    if (normSpoken === normCand) {
      bestMatchRatio = 1.0;
      bestCandidate = candidate;
      break;
    }

    // Token set ratio
    const tokenRatio = calculateTokenSetRatio(spokenTokens, candTokens);

    // Levenshtein ratio
    const maxLen = Math.max(normSpoken.length, normCand.length);
    const levDist = calculateLevenshteinDistance(normSpoken, normCand);
    const levRatio = 1 - levDist / maxLen;

    const blended = tokenRatio * 0.7 + levRatio * 0.3;
    if (blended > bestMatchRatio) {
      bestMatchRatio = blended;
      bestCandidate = candidate;
    }
  }

  // Meaning elements check
  const meaningCoverage = checkMeaningElementsCoverage(
    spokenTokens,
    task.requiredMeaningElements || []
  );

  // Fast-Pass eligibility threshold:
  // Must achieve either:
  // 1. bestMatchRatio >= 0.82 AND meaningCoverage >= 0.75
  // 2. OR bestMatchRatio >= 0.90 (regardless of elements breakdown)
  const isEligible =
    bestMatchRatio >= 0.9 || (bestMatchRatio >= 0.82 && meaningCoverage >= 0.75);

  if (!isEligible) {
    return { canFastPass: false, matchScore: Math.round(bestMatchRatio * 100) };
  }

  // Calculate scores
  const meaningScore = Math.min(100, Math.round(Math.max(bestMatchRatio, meaningCoverage) * 100));
  const grammarScore = Math.min(100, Math.round(92 + (bestMatchRatio >= 0.95 ? 6 : 2)));
  const naturalnessScore = Math.min(100, Math.round(88 + (bestMatchRatio >= 0.92 ? 8 : 2)));
  
  // Retrieval score based on latency: < 2.0s = 95+, 2.0-3.5s = 85+, > 3.5s = 75
  const retrievalScore =
    latencyMs <= 1800
      ? 98
      : latencyMs <= 2500
      ? 92
      : latencyMs <= 3500
      ? 84
      : Math.max(70, Math.round(80 - (latencyMs - 3500) / 100));

  const hintPenalty = [0, 5, 12, 25, 40][hintTier] || 0;
  const independenceScore = Math.max(50, 100 - hintPenalty);

  const overallScore = Math.min(
    100,
    Math.round(
      meaningScore * 0.35 +
        grammarScore * 0.25 +
        naturalnessScore * 0.2 +
        retrievalScore * 0.2
    )
  );

  // Synthesize Say It Better set
  const sayItBetter: SayItBetterSet = {
    professional:
      task.sayItBetter?.professional ||
      bestCandidate ||
      task.expectedResponses[0] ||
      "",
    casual:
      task.sayItBetter?.casual ||
      task.expectedResponses[1] ||
      bestCandidate ||
      "",
    idiomatic:
      task.sayItBetter?.idiomatic ||
      task.expectedResponses[2] ||
      task.expectedResponses[0] ||
      "",
  };

  const rawAlternatives: SemanticAlternative[] = [
    {
      expression: sayItBetter.professional,
      tone: "formal",
      explanationVi: "Phong cách chuẩn công sở & trang trọng",
    },
    {
      expression: sayItBetter.casual,
      tone: "casual",
      explanationVi: "Phong cách đời thường, tự nhiên khi nói chuyện",
    },
    {
      expression: sayItBetter.idiomatic,
      tone: "idiomatic",
      explanationVi: "Cách diễn đạt mang màu sắc bản xứ sắc bén",
    },
  ];

  const naturalAlternatives = rawAlternatives.filter((a) => Boolean(a.expression));

  const evaluation: VNToENEvaluation = {
    overallScore,
    meaningScore,
    grammarScore,
    naturalnessScore,
    fluencyScore: Math.min(100, Math.round((grammarScore + naturalnessScore) / 2)),
    retrievalScore,
    independenceScore,
    isCommunicativelyValid: true,
    isSuccessful: overallScore >= 70,
    needsRetry: false,
    isSayItBetterNeeded: overallScore < 90 || bestMatchRatio < 0.92,
    gapType: latencyMs > 3500 ? "retrieval_gap" : "none",
    gapExplanation:
      latencyMs > 3500
        ? "Bạn diễn đạt đúng ý nhưng mất hơn 3.5 giây để phản xạ. Hãy luyện bật câu nhanh hơn."
        : "Phản xạ xuất sắc! Bạn đã diễn đạt trọn vẹn ý nghĩa sang tiếng Anh.",
    userTranscript,
    cleanTranscript: normSpoken,
    responseLatencyMs: latencyMs,
    speechDurationMs: durationMs,
    errors: [],
    betterVersion: sayItBetter.professional,
    naturalAlternatives,
    sayItBetter,
    isFastPass: true,
    praisePoints: [
      `Tốc độ phản xạ ${(latencyMs / 1000).toFixed(1)}s chuẩn xác.`,
      "Diễn đạt trọn vẹn ngữ nghĩa tiếng Việt sang tiếng Anh tự nhiên.",
    ],
    actionableFeedback: "Hãy nghe thêm các biến thể 'Say It Better' để làm giàu vốn từ!",
    hintTierUsed: hintTier,
    attemptNumber: attempt,
  };

  return { canFastPass: true, evaluation, matchScore: Math.round(bestMatchRatio * 100) };
}
