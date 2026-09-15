// Fast-Pass for Advanced Studio — same normalization as Foundation + secondary Toulmin/Composure HUD

import type { AdvancedEvaluation, AdvancedTask } from "@/types/advanced";
import {
  analyzeToulminArgumentation,
  calculateComposureMetrics,
  detectLogicalFallacies,
  detectTransitionalBridging,
} from "./toulmin-pressure.engine";

const CONTRACTION_MAP: Record<string, string> = {
  "i'm": "i am", im: "i am", "you're": "you are", youre: "you are",
  "he's": "he is", hes: "he is", "she's": "she is", shes: "she is",
  "it's": "it is", its: "it is", "we're": "we are", were: "we are",
  "they're": "they are", theyre: "they are", "don't": "do not", dont: "do not",
  "doesn't": "does not", doesnt: "does not", "didn't": "did not", didnt: "did not",
  "won't": "will not", wont: "will not", "can't": "cannot", cant: "cannot",
  "couldn't": "could not", couldnt: "could not", "shouldn't": "should not", shouldnt: "should not",
  "wouldn't": "would not", wouldnt: "would not", "isn't": "is not", isnt: "is not",
  "aren't": "are not", arent: "are not", "wasn't": "was not", wasnt: "was not",
  "weren't": "were not", werent: "were not", "haven't": "have not", havent: "have not",
  "hasn't": "has not", hasnt: "has not", "i've": "i have", ive: "i have",
  "you've": "you have", youve: "you have", "we've": "we have", weve: "we have",
  "they've": "they have", theyve: "they have", "i'll": "i will", ill: "i will",
  "you'll": "you will", youll: "you will", "let's": "let us", lets: "let us",
  gonna: "going to", wanna: "want to", gotta: "got to",
};

export function normalizeAdvancedText(text: string): string {
  if (!text) return "";
  const cleaned = text.toLowerCase().replace(/[’‘`]/g, "'").replace(/[.,/#!$%^&*;:{}=\-_~()?"\\]/g, " ").trim();
  return cleaned.split(/\s+/).filter(Boolean).map((t) => CONTRACTION_MAP[t] || t).join(" ").replace(/\s+/g, " ").trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const m: number[][] = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] = b[i - 1] === a[j - 1] ? m[i - 1][j - 1] : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    }
  }
  return m[b.length][a.length];
}

export interface AdvancedFastPassMatch {
  isMatch: boolean;
  confidence: number;
  matchedResponse?: string;
  reason?: string;
}

export function computeAdvancedFastPass(
  userTranscript: string,
  expectedResponses: string[],
  requiredMeaningElements?: string[]
): AdvancedFastPassMatch {
  const normUser = normalizeAdvancedText(userTranscript);
  if (!normUser || normUser.length < 3 || expectedResponses.length === 0) {
    return { isMatch: false, confidence: 0 };
  }
  if (requiredMeaningElements && requiredMeaningElements.length > 0) {
    const missing = requiredMeaningElements.filter((req) => !normUser.includes(normalizeAdvancedText(req)));
    if (missing.length > 0) return { isMatch: false, confidence: 0.3, reason: `Missing: ${missing.join(", ")}` };
  }
  let best: { score: number; response: string } | null = null;
  for (const expected of expectedResponses) {
    const normExp = normalizeAdvancedText(expected);
    if (normUser === normExp) return { isMatch: true, confidence: 1.0, matchedResponse: expected };
    const maxLen = Math.max(normUser.length, normExp.length);
    const sim = Math.max(0, 1 - levenshtein(normUser, normExp) / Math.max(1, maxLen));
    const setA = new Set(normUser.split(" "));
    const setB = new Set(normExp.split(" "));
    const inter = [...setA].filter((t) => setB.has(t)).length;
    const jaccard = inter / Math.max(1, new Set([...setA, ...setB]).size);
    const composite = sim * 0.65 + jaccard * 0.35;
    if (!best || composite > best.score) best = { score: composite, response: expected };
  }
  if (best && best.score >= 0.88) {
    return { isMatch: true, confidence: Math.round(best.score * 100) / 100, matchedResponse: best.response };
  }
  return { isMatch: false, confidence: best ? Math.round(best.score * 100) / 100 : 0 };
}

export function buildAdvancedFastPassEvaluation(params: {
  task: AdvancedTask;
  userTranscript: string;
  matchedResponse: string;
  confidence: number;
  responseLatencyMs?: number;
  speechDurationMs?: number;
  hintTierUsed?: number;
  attemptNumber?: number;
}): AdvancedEvaluation {
  const latency = params.responseLatencyMs ?? 2000;
  const duration = params.speechDurationMs ?? 3000;
  const hintTier = params.hintTierUsed ?? 0;
  const attempt = params.attemptNumber ?? 1;

  const independenceScore = hintTier === 0 ? 100 : hintTier === 1 ? 90 : hintTier === 2 ? 75 : hintTier === 3 ? 50 : 20;
  const retrievalScore = Math.min(100, Math.max(60, independenceScore + (latency < 2000 ? 5 : latency > 3500 ? -10 : 0)));

  const toulmin = analyzeToulminArgumentation(params.userTranscript);
  const fallacies = detectLogicalFallacies(params.userTranscript);
  const bridge = detectTransitionalBridging(params.userTranscript);
  const words = normalizeAdvancedText(params.userTranscript).split(" ").filter(Boolean).length;
  const wpm = Math.round((words / Math.max(0.6, duration / 1000)) * 60);
  const composure = calculateComposureMetrics({
    latencyMs: latency,
    timeLimitMs: (params.task.blitzLimitSec || 6) * 1000,
    wpm,
    hesitationCount: 0,
  });

  const sayItBetter = params.task.sayItBetter || {
    professional: params.matchedResponse,
    casual: params.matchedResponse,
    idiomatic: params.matchedResponse,
  };

  const naturalAlternatives: AdvancedEvaluation["naturalAlternatives"] = [
    { expression: sayItBetter.professional, tone: "formal" as const, explanationVi: "Chuẩn công sở" },
    { expression: sayItBetter.casual, tone: "casual" as const, explanationVi: "Đời thường" },
  ].filter((a) => Boolean(a.expression));

  return {
    overallScore: Math.min(100, Math.round(100 * 0.35 + 98 * 0.25 + 96 * 0.2 + retrievalScore * 0.2)),
    meaningScore: 100,
    grammarScore: 98,
    naturalnessScore: 96,
    fluencyScore: composure.score >= 75 ? 92 : 82,
    retrievalScore,
    independenceScore,
    isCommunicativelyValid: true,
    isSuccessful: true,
    needsRetry: false,
    isSayItBetterNeeded: toulmin.toulminScore < 75,
    gapType: "none",
    gapExplanation: "Phản xạ chuẩn xác, đúng ý nghĩa và cấu trúc.",
    userTranscript: params.userTranscript,
    cleanTranscript: normalizeAdvancedText(params.userTranscript),
    responseLatencyMs: latency,
    speechDurationMs: duration,
    errors: [],
    betterVersion: params.matchedResponse,
    naturalAlternatives,
    sayItBetter,
    toulmin,
    composure,
    fallacies,
    bridge,
    isFastPass: true,
    praisePoints: ["⚡ Fast-Pass 0ms — khớp mẫu chuẩn.", `Toulmin ${toulmin.toulminScore}% · Composure ${composure.grade}.`],
    actionableFeedback:
      toulmin.missingKeyElements.length > 0
        ? `Câu chuẩn! Để lên C1, hãy bổ sung: ${toulmin.missingKeyElements.join(", ")}. ${toulmin.feedbackVi}`
        : "Xuất sắc! Lập luận đầy đủ trụ cột Toulmin.",
    hintTierUsed: hintTier,
    attemptNumber: attempt,
    evaluationSource: "fast_pass",
  };
}
