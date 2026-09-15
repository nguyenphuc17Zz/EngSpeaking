// Drill Fast-Pass Deterministic Evaluation (aligned with SB/VN-EN/Survival fast-pass)
// Exact/fuzzy match vs target correction before any LLM call

import type {
  MasterErrorRecord,
  DrillEvaluationResult,
  DrillHesitationMetrics,
} from "@/types/error-bank";

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
}): DrillHesitationMetrics {
  const norm = normalizeSpokenText(params.userTranscript);
  const wordCount = norm.split(/\s+/).filter(Boolean).length;
  const durationSec = Math.max(0.6, params.speechDurationMs / 1000);
  const wpm = Math.round((wordCount / durationSec) * 60);
  const idealDurationSec = wordCount / 2.2;
  const pauseEstimatedSec = Math.max(0, Math.round((durationSec - idealDurationSec) * 10) / 10);
  let hesitationLevel: DrillHesitationMetrics["hesitationLevel"] = "smooth";
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

export interface DrillFastPassResult {
  canFastPass: boolean;
  evaluation?: DrillEvaluationResult;
  matchScore?: number;
  reason?: string;
}

export function targetCorrectionOf(record: MasterErrorRecord): string {
  const latest = record.examples[record.examples.length - 1];
  return latest?.correction || record.canonicalName;
}

export function computeFastPassDrill(
  record: MasterErrorRecord,
  userTranscript: string,
  opts: {
    responseLatencyMs?: number;
    speechDurationMs?: number;
    hintTierUsed?: number;
    attemptNumber?: number;
  } = {}
): DrillFastPassResult {
  const normSpoken = normalizeSpokenText(userTranscript);
  if (!normSpoken || normSpoken.split(/\s+/).length < 2) {
    return { canFastPass: false, reason: "too_short" };
  }
  const target = targetCorrectionOf(record);
  const score = calculateStringSimilarity(userTranscript, target);
  // Require high fidelity for auto-pass; drill is about exact correction
  if (score < 0.88) {
    return { canFastPass: false, matchScore: Math.round(score * 100), reason: "low_match" };
  }

  const latencyMs = opts.responseLatencyMs ?? 1800;
  const durationMs = opts.speechDurationMs ?? 2200;
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
  const overallScore = Math.min(100, Math.round(96 * 0.4 + 94 * 0.2 + 92 * 0.2 + retrievalScore * 0.2));

  const evaluation: DrillEvaluationResult = {
    corrected: true,
    overallScore,
    targetErrorResolved: true,
    grammarAccuracy: 96,
    naturalness: 93,
    conceptClarityScore: Math.min(100, Math.round(score * 100)),
    fluencyScore,
    retrievalScore,
    independenceScore,
    errors: [],
    praisePoints: ["⚡ Sửa lỗi tức thì (Fast-Pass 0ms)!", "Phát âm chuẩn, đúng pattern mục tiêu."],
    actionableFeedback: "Chuẩn! Giữ phản xạ này và thử nói thêm 1 biến thể tự nhiên hơn.",
    sayItBetter: { professional: target, casual: target, idiomatic: target },
    naturalAlternatives: [{ expression: target, tone: "neutral", explanationVi: "Câu chuẩn mục tiêu" }],
    isSayItBetterNeeded: score < 0.94,
    coachFeedbackVi: "Bạn đã sửa đúng lỗi mục tiêu một cách nhanh và tự nhiên!",
    betterPhrasing: target,
    userTranscript,
    cleanTranscript: normSpoken,
    hintTierUsed: hintTier,
    attemptNumber: attempt,
    evaluationSource: "fast_pass",
    hesitationMetrics,
    isFastPass: true,
  };

  return { canFastPass: true, evaluation, matchScore: Math.round(score * 100) };
}
