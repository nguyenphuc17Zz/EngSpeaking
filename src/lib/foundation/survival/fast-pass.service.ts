// Fast-Pass Deterministic Evaluation for Survival Speaking (Function 7)
// Taboo-first + semantic anchor coverage + fuzzy match vs model answers
// Reuses normalization/Levenshtein approach from SB/VN-EN fast-pass

import type {
  CircumlocutionTask,
  SurvivalScenarioTask,
  SurvivalEvaluationResult,
  SurvivalHesitationMetrics,
} from "@/types/survival-speaking";
import { analyzeAristotelianCircumlocution } from "./aristotelian-evaluator.engine";

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
  "couldn't": "could not",
  couldnt: "could not",
  "didn't": "did not",
  didnt: "did not",
  gonna: "going to",
  wanna: "want to",
  gotta: "got to",
  "let's": "let us",
  lets: "let us",
};

export function normalizeSpokenText(text: string): string {
  if (!text) return "";
  let cleaned = text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[.,/#!$%^&*;:{}=\-_~()?"\\]/g, " ")
    .trim();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  return tokens
    .map((tok) => CONTRACTION_MAP[tok] || tok)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function calculateLevenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
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
  const dist = calculateLevenshteinDistance(normA, normB);
  return Math.max(0, 1 - dist / maxLen);
}

export function calculateHesitationMetrics(params: {
  userTranscript: string;
  speechDurationMs: number;
}): SurvivalHesitationMetrics {
  const norm = normalizeSpokenText(params.userTranscript);
  const wordCount = norm.split(/\s+/).filter(Boolean).length;
  const durationSec = Math.max(0.6, params.speechDurationMs / 1000);
  const wpm = Math.round((wordCount / durationSec) * 60);
  const idealDurationSec = wordCount / 2.2;
  const pauseEstimatedSec = Math.max(0, Math.round((durationSec - idealDurationSec) * 10) / 10);
  let hesitationLevel: SurvivalHesitationMetrics["hesitationLevel"] = "smooth";
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

export interface SurvivalFastPassResult {
  canFastPass: boolean;
  evaluation?: SurvivalEvaluationResult;
  matchScore?: number;
  reason?: string;
}

function bestFuzzyScore(spoken: string, candidates: string[]): { score: number; match: string } {
  let best = { score: 0, match: candidates[0] || "" };
  for (const c of candidates) {
    const s = calculateStringSimilarity(spoken, c);
    if (s > best.score) best = { score: s, match: c };
  }
  return best;
}

export function computeFastPassCircumlocution(
  task: CircumlocutionTask,
  userTranscript: string,
  opts: {
    responseLatencyMs?: number;
    speechDurationMs?: number;
    hintTierUsed?: number;
    attemptNumber?: number;
  } = {}
): SurvivalFastPassResult {
  const normSpoken = normalizeSpokenText(userTranscript);
  if (!normSpoken || normSpoken.split(/\s+/).length < 3) {
    return { canFastPass: false, reason: "too_short" };
  }

  const analysis = analyzeAristotelianCircumlocution(task, userTranscript);
  if (analysis.tabooViolated) {
    return { canFastPass: false, matchScore: 0, reason: "taboo_violated" };
  }

  const candidates = [...(task.sampleExplanations || [])];
  if (task.sayItBetter) {
    candidates.push(
      task.sayItBetter.professional,
      task.sayItBetter.casual,
      task.sayItBetter.idiomatic
    );
  }
  const { score, match } = bestFuzzyScore(userTranscript, candidates.filter(Boolean));
  const anchorCoverage =
    (task.semanticKeyAnchors || []).length === 0
      ? 0.8
      : (task.semanticKeyAnchors || []).filter((a) =>
          normSpoken.includes(normalizeSpokenText(a))
        ).length / Math.max(1, (task.semanticKeyAnchors || []).length);

  const eligible =
    score >= 0.9 || (score >= 0.8 && anchorCoverage >= 0.6 && analysis.semanticPrecisionScore >= 70);

  if (!eligible) {
    return { canFastPass: false, matchScore: Math.round(score * 100), reason: "low_match" };
  }

  const latencyMs = opts.responseLatencyMs ?? 2000;
  const durationMs = opts.speechDurationMs ?? 2800;
  const hintTier = opts.hintTierUsed ?? 0;
  const attempt = opts.attemptNumber ?? 1;
  const hesitationMetrics = calculateHesitationMetrics({ userTranscript, speechDurationMs: durationMs });
  const independenceScore = independenceFromTier(hintTier);
  const speedBonus = latencyMs < 2000 ? 8 : latencyMs < 3500 ? 0 : -12;
  const retrievalScore = Math.min(100, Math.max(55, Math.round(independenceScore * 0.7 + 25 + speedBonus)));
  const fluencyScore =
    hesitationMetrics.hesitationLevel === "smooth" ? 95 : hesitationMetrics.hesitationLevel === "moderate" ? 86 : 74;
  const conceptClarityScore = Math.min(100, Math.max(80, Math.round(score * 100)));
  const overallScore = Math.min(
    100,
    Math.round(conceptClarityScore * 0.4 + 94 * 0.2 + 92 * 0.2 + retrievalScore * 0.2)
  );
  const ideal = match || task.sampleExplanations[0] || "";

  const evaluation: SurvivalEvaluationResult = {
    isSuccessful: true,
    communicationRecovered: true,
    strategyUsed: "circumlocution",
    targetWordAvoided: true,
    conceptClarityScore,
    genusDetected: analysis.genusDetected,
    differentiaDetected: analysis.differentiaDetected,
    semanticPrecisionScore: analysis.semanticPrecisionScore,
    listenerGuess: analysis.listenerGuess,
    clarityBreakdown: {
      genusScore: analysis.genusScore,
      functionScore: analysis.functionScore,
      ambiguityPenalty: 0,
    },
    repairInitiationLatencyMs: latencyMs,
    speechDurationMs: durationMs,
    naturalnessScore: 92,
    overallScore,
    fluencyScore,
    retrievalScore,
    independenceScore,
    errors: [],
    praisePoints: [
      "⚡ Phản xạ diễn giải tức thì (Fast-Pass 0ms)!",
      `Tránh từ cấm + phủ ${Math.round(anchorCoverage * 100)}% ý khóa, người nghe đoán trúng.`,
    ],
    actionableFeedback:
      hesitationMetrics.hesitationLevel === "smooth"
        ? "Xuất sắc! Giữ nhịp Genus → Differentia này cho mọi từ khó."
        : `Diễn giải chuẩn! Nhịp nói còn hơi ngắt (${hesitationMetrics.wpm} wpm) — thử nói lại mượt hơn.`,
    sayItBetter: task.sayItBetter || {
      professional: ideal,
      casual: task.sampleExplanations[1] || ideal,
      idiomatic: task.sampleExplanations[0] || ideal,
    },
    naturalAlternatives: (task.sampleExplanations || []).slice(0, 3).map((e, i) => ({
      expression: e,
      tone: i === 0 ? "neutral" : i === 1 ? "casual" : "idiomatic",
      explanationVi: "Cách diễn giải mẫu",
    })),
    isSayItBetterNeeded: false,
    userTranscript,
    cleanTranscript: normSpoken,
    coachFeedbackVi: "Diễn giải vòng rõ ràng, đúng khung Aristotelian, không lộ từ cấm.",
    idealRepairVersion: ideal,
    alternativeStrategies: [
      "Khung Aristotelian: It's a kind of... that you use to...",
      "Mô tả công dụng: You use it when...",
      "Bối cảnh xuất hiện: You can usually find it in...",
    ],
    hintTierUsed: hintTier,
    attemptNumber: attempt,
    evaluationSource: "fast_pass",
    hesitationMetrics,
    isFastPass: true,
  };

  return { canFastPass: true, evaluation, matchScore: Math.round(score * 100) };
}

export function computeFastPassScenario(
  task: SurvivalScenarioTask,
  userTranscript: string,
  opts: {
    responseLatencyMs?: number;
    speechDurationMs?: number;
    hintTierUsed?: number;
    attemptNumber?: number;
  } = {}
): SurvivalFastPassResult {
  const normSpoken = normalizeSpokenText(userTranscript);
  if (!normSpoken || normSpoken.split(/\s+/).length < 3) {
    return { canFastPass: false, reason: "too_short" };
  }
  const candidates = [
    ...(task.suggestedRepairPhrases || []),
    task.sayItBetter?.professional || "",
    task.sayItBetter?.casual || "",
    task.sayItBetter?.idiomatic || "",
  ].filter(Boolean);
  const { score, match } = bestFuzzyScore(userTranscript, candidates);
  if (score < 0.86) {
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
  const overallScore = Math.min(100, Math.round(92 * 0.4 + 90 * 0.2 + 90 * 0.2 + retrievalScore * 0.2));
  const ideal = match || task.suggestedRepairPhrases[0] || "";

  const evaluation: SurvivalEvaluationResult = {
    isSuccessful: true,
    communicationRecovered: true,
    strategyUsed: task.recommendedSkill,
    conceptClarityScore: Math.min(100, Math.round(score * 100)),
    semanticPrecisionScore: Math.min(100, Math.round(score * 100)),
    listenerGuess: "Người nghe tiếp tục hội thoại trôi chảy",
    repairInitiationLatencyMs: latencyMs,
    speechDurationMs: durationMs,
    naturalnessScore: 90,
    overallScore,
    fluencyScore,
    retrievalScore,
    independenceScore,
    errors: [],
    praisePoints: ["⚡ Phản xạ cứu cánh tức thì (Fast-Pass 0ms)!", "Giữ nhịp hội thoại, không để khoảng lặng chết."],
    actionableFeedback: "Xử lý chuẩn! Thử thêm 1 biến thể Say It Better cho tự nhiên hơn.",
    sayItBetter: task.sayItBetter || {
      professional: ideal,
      casual: task.suggestedRepairPhrases[1] || ideal,
      idiomatic: task.suggestedRepairPhrases[0] || ideal,
    },
    naturalAlternatives: (task.suggestedRepairPhrases || []).slice(0, 3).map((e, i) => ({
      expression: e,
      tone: i === 0 ? "neutral" : i === 1 ? "casual" : "idiomatic",
      explanationVi: "Cụm cứu cánh mẫu",
    })),
    isSayItBetterNeeded: score < 0.93,
    userTranscript,
    cleanTranscript: normSpoken,
    coachFeedbackVi: "Bạn đã cứu cánh hội thoại rất nhanh và tự nhiên!",
    idealRepairVersion: ideal,
    alternativeStrategies: ["Hỏi lại lịch sự", "Dùng câu đệm câu giờ", "Làm rõ ý kiến"],
    hintTierUsed: hintTier,
    attemptNumber: attempt,
    evaluationSource: "fast_pass",
    hesitationMetrics,
    isFastPass: true,
  };

  return { canFastPass: true, evaluation, matchScore: Math.round(score * 100) };
}
