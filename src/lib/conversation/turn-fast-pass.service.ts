// Turn Fast-Pass Deterministic Evaluation (aligned with SB/VN-EN/Survival/Drill fast-pass)
// Conversation turns are open-ended: fast-pass only on high-fidelity paraphrase of native reformulation.

import type { TurnHesitationMetrics, TurnPedagogy } from "@/types/conversation";

const CONTRACTION_MAP: Record<string, string> = {
  "i'm": "i am",
  im: "i am",
  "you're": "you are",
  youre: "you are",
  "it's": "it is",
  its: "it is",
  "don't": "do not",
  dont: "do not",
  "can't": "cannot",
  cant: "cannot",
  gonna: "going to",
  wanna: "want to",
  gotta: "got to",
  "let's": "let us",
  lets: "let us",
};

export function normalizeSpokenText(text: string): string {
  if (!text) return "";
  const cleaned = text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[.,/#!$%^&*;:{}=\-_~()?"\\]/g, " ")
    .trim();
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => CONTRACTION_MAP[tok] || tok)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function calculateLevenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b.charAt(i - 1) === a.charAt(j - 1)
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

export function calculateStringSimilarity(a: string, b: string): number {
  const normA = normalizeSpokenText(a);
  const normB = normalizeSpokenText(b);
  if (!normA && !normB) return 1.0;
  if (!normA || !normB) return 0.0;
  if (normA === normB) return 1.0;
  const maxLen = Math.max(normA.length, normB.length);
  return Math.max(0, 1 - calculateLevenshteinDistance(normA, normB) / maxLen);
}

export function calculateHesitationMetrics(params: {
  userTranscript: string;
  speechDurationMs: number;
}): TurnHesitationMetrics {
  const norm = normalizeSpokenText(params.userTranscript);
  const wordCount = norm.split(/\s+/).filter(Boolean).length;
  const durationSec = Math.max(0.6, params.speechDurationMs / 1000);
  const wpm = Math.round((wordCount / durationSec) * 60);
  const idealDurationSec = wordCount / 2.2;
  const pauseEstimatedSec = Math.max(0, Math.round((durationSec - idealDurationSec) * 10) / 10);
  let hesitationLevel: TurnHesitationMetrics["hesitationLevel"] = "smooth";
  if (wpm < 75 || pauseEstimatedSec > 2.0) hesitationLevel = "hesitant";
  else if (wpm < 105 || pauseEstimatedSec > 1.0) hesitationLevel = "moderate";
  return { wpm, durationMs: params.speechDurationMs, hesitationLevel, pauseEstimatedSec };
}

export function independenceFromTier(hintTier: number): number {
  if (hintTier <= 0) return 100;
  if (hintTier === 1) return 90;
  if (hintTier === 2) return 75;
  if (hintTier === 3) return 50;
  return 15;
}

export interface TurnFastPassResult {
  canFastPass: boolean;
  pedagogy?: TurnPedagogy;
  matchScore?: number;
  reason?: string;
}

export function computeFastPassTurn(
  userTranscript: string,
  candidates: string[],
  opts: {
    responseLatencyMs?: number;
    speechDurationMs?: number;
    hintTierUsed?: number;
    attemptNumber?: number;
  } = {}
): TurnFastPassResult {
  const normSpoken = normalizeSpokenText(userTranscript);
  if (!normSpoken || normSpoken.split(/\s+/).length < 4) {
    return { canFastPass: false, reason: "too_short" };
  }
  const pool = candidates.filter(Boolean);
  if (pool.length === 0) return { canFastPass: false, reason: "no_candidate" };

  let best = 0;
  let bestMatch = pool[0];
  for (const c of pool) {
    const s = calculateStringSimilarity(userTranscript, c);
    if (s > best) {
      best = s;
      bestMatch = c;
    }
  }
  // Open conversation: require very high fidelity to auto-pass
  if (best < 0.9) {
    return { canFastPass: false, matchScore: Math.round(best * 100), reason: "low_match" };
  }

  const latencyMs = opts.responseLatencyMs ?? 1800;
  const durationMs = opts.speechDurationMs ?? 2800;
  const hintTier = opts.hintTierUsed ?? 0;
  const attempt = opts.attemptNumber ?? 1;
  const hesitationMetrics = calculateHesitationMetrics({ userTranscript, speechDurationMs: durationMs });
  const independenceScore = independenceFromTier(hintTier);
  const retrievalScore = Math.min(
    100,
    Math.round(independenceScore * 0.6 + (latencyMs < 2000 ? 35 : latencyMs < 3500 ? 25 : 10))
  );
  const fluencyScore =
    hesitationMetrics.hesitationLevel === "smooth" ? 94 : hesitationMetrics.hesitationLevel === "moderate" ? 86 : 74;

  const pedagogy: TurnPedagogy = {
    latencyMs,
    speechRateWpm: hesitationMetrics.wpm,
    turnScore: 92,
    meaningScore: Math.min(100, Math.round(best * 100)),
    fluencyScore,
    retrievalScore,
    independenceScore,
    errors: [],
    praisePoints: ["⚡ Phản xạ tự nhiên tức thì (Fast-Pass 0ms)!", "Diễn đạt trôi chảy, đúng ý hội thoại."],
    actionableFeedback: "Rất tự nhiên! Thử thêm 1 biến thể Say It Better cho phong phú.",
    sayItBetter: { professional: bestMatch, casual: bestMatch, idiomatic: bestMatch },
    naturalAlternatives: [{ expression: bestMatch, tone: "neutral", explanationVi: "Cách nói chuẩn" }],
    isSayItBetterNeeded: false,
    nativeReformulation: bestMatch,
    coachTipVi: "Phản xạ hội thoại nhanh và tự nhiên!",
    hintTierUsed: hintTier,
    attemptNumber: attempt,
    evaluationSource: "fast_pass",
    hesitationMetrics,
    isFastPass: true,
  };

  return { canFastPass: true, pedagogy, matchScore: Math.round(best * 100) };
}
