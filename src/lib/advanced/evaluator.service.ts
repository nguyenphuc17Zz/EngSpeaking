// Evaluator for Advanced Studio — Foundation 6-axis scores (primary) + Toulmin/Composure (secondary HUD)

import { generateTextWithRouting } from "@/lib/ai";
import { advancedEvaluationSchema } from "@/lib/validation/advanced-schemas";
import { computeAdvancedFastPass, buildAdvancedFastPassEvaluation, normalizeAdvancedText } from "./fast-pass.service";
import {
  analyzeToulminArgumentation,
  calculateComposureMetrics,
  detectLogicalFallacies,
  detectTransitionalBridging,
} from "./toulmin-pressure.engine";
import type { AdvancedEvaluation, AdvancedTask } from "@/types/advanced";

export interface EvaluateAdvancedParams {
  task: AdvancedTask;
  userTranscript: string;
  responseLatencyMs?: number;
  speechDurationMs?: number;
  hintTierUsed?: number;
  attemptNumber?: number;
  provider?: string;
  model?: string;
  forceAi?: boolean;
}

function deterministicEvaluation(
  task: AdvancedTask,
  userTranscript: string,
  opts: { responseLatencyMs?: number; speechDurationMs?: number; hintTierUsed?: number; attemptNumber?: number }
): AdvancedEvaluation {
  const clean = normalizeAdvancedText(userTranscript);
  const latency = opts.responseLatencyMs ?? 2200;
  const duration = opts.speechDurationMs ?? 3000;
  const hintTier = opts.hintTierUsed ?? 0;
  const attempt = opts.attemptNumber ?? 1;

  const toulmin = analyzeToulminArgumentation(userTranscript);
  const fallacies = detectLogicalFallacies(userTranscript);
  const bridge = detectTransitionalBridging(userTranscript);
  const words = clean.split(/\s+/).filter(Boolean).length;
  const wpm = Math.round((words / Math.max(0.6, duration / 1000)) * 60);
  const composure = calculateComposureMetrics({
    latencyMs: latency,
    timeLimitMs: (task.blitzLimitSec || 6) * 1000,
    wpm,
    hesitationCount: 0,
  });

  if (!clean || clean.length < 3) {
    return {
      overallScore: 20, meaningScore: 10, grammarScore: 20, naturalnessScore: 20,
      fluencyScore: 15, retrievalScore: 10, independenceScore: 100,
      isCommunicativelyValid: false, isSuccessful: false, needsRetry: true,
      isSayItBetterNeeded: false, gapType: "knowledge_gap",
      gapExplanation: "Chưa ghi nhận được âm thanh. Hãy nói to, rõ ràng hơn!",
      userTranscript, cleanTranscript: clean, responseLatencyMs: latency, speechDurationMs: duration,
      errors: [{ type: "omission", severity: "major", userText: "", correction: task.expectedResponses[0] || "", explanation: "Hãy trình bày đầy đủ ý bằng tiếng Anh.", patternKey: "advanced_empty_response" }],
      betterVersion: task.expectedResponses[0] || "",
      naturalAlternatives: [], sayItBetter: task.sayItBetter,
      toulmin, composure, fallacies, bridge,
      praisePoints: ["Bạn đã bấm mic để bắt đầu."],
      actionableFeedback: `Hãy mở đầu bằng: "${task.scaffold.starter || "In my view..."}" rồi triển khai ${task.requiredToulminElements.join(" → ")}.`,
      hintTierUsed: hintTier, attemptNumber: attempt, evaluationSource: "deterministic",
    };
  }

  const required = task.requiredMeaningElements || [];
  let matched = 0;
  for (const elem of required) {
    const ne = normalizeAdvancedText(elem);
    if (!ne) { matched++; continue; }
    if (clean.includes(ne)) { matched++; continue; }
    const ew = ne.split(" ").filter((w) => w.length > 2);
    if (ew.length && ew.filter((w) => clean.includes(w)).length / ew.length >= 0.6) matched++;
  }
  const meaningRatio = required.length ? matched / required.length : 0.8;
  const meaningScore = Math.min(100, Math.max(30, Math.round(meaningRatio * 90 + 10)));
  const isValid = meaningScore >= 65;

  const independenceScore = hintTier === 0 ? 100 : hintTier === 1 ? 90 : hintTier === 2 ? 75 : hintTier === 3 ? 50 : 15;
  const retrievalScore = Math.min(100, Math.max(20, Math.round(independenceScore * 0.6 + (isValid ? 25 : 0) + (latency < 2000 ? 10 : latency > 3500 ? -12 : 0))));
  const grammarScore = Math.min(100, Math.max(40, Math.round(80 + toulmin.toulminScore * 0.1 - fallacies.length * 8)));
  const naturalnessScore = Math.min(100, Math.max(40, Math.round(meaningScore * 0.5 + grammarScore * 0.5 + (bridge.hasBridge ? 5 : 0))));
  const fluencyScore = Math.min(100, Math.max(35, Math.round(composure.score * 0.6 + (words > 20 ? 12 : words > 8 ? 6 : 0))));
  const overallScore = Math.round(meaningScore * 0.3 + grammarScore * 0.2 + naturalnessScore * 0.2 + retrievalScore * 0.15 + fluencyScore * 0.15);

  let gapType: AdvancedEvaluation["gapType"] = "none";
  let gapExplanation = "Phản xạ tốt, lập luận mạch lạc.";
  if (latency > 3500 && isValid) { gapType = "retrieval_gap"; gapExplanation = "Biết ý nhưng bật câu còn chậm (>3.5s) — cần luyện blitz."; }
  else if (!isValid) { gapType = "knowledge_gap"; gapExplanation = "Thiếu ý / từ vựng mục tiêu — hãy dùng hint T1/T2 rồi nói lại."; }
  else if (toulmin.toulminScore < 50) { gapType = "production_gap"; gapExplanation = "Có ý nhưng cấu trúc Toulmin còn lỏng — hãy bám khung Claim→Data→Warrant."; }

  const isSuccessful = overallScore >= 70;
  const errors: AdvancedEvaluation["errors"] = fallacies.slice(0, 2).map((f) => ({
    type: "naturalness" as const, severity: f.severity === "critical" ? "major" as const : "minor" as const,
    userText: f.snippet, correction: "Diễn đạt lại tránh ngụy biện, dùng số liệu + rebuttal.",
    explanation: `${f.labelVi}: ${f.explanationVi}`, patternKey: `fallacy_${f.type}`,
  }));

  return {
    overallScore, meaningScore, grammarScore, naturalnessScore, fluencyScore, retrievalScore, independenceScore,
    isCommunicativelyValid: isValid, isSuccessful,
    needsRetry: !isSuccessful || errors.some((e) => e.severity === "major"),
    isSayItBetterNeeded: isValid && naturalnessScore < 88,
    gapType, gapExplanation, userTranscript, cleanTranscript: clean,
    responseLatencyMs: latency, speechDurationMs: duration, errors,
    betterVersion: task.expectedResponses[0] || userTranscript,
    naturalAlternatives: (task.expectedResponses || []).slice(0, 3).map((e, i) => ({
      expression: e, tone: (["formal", "casual", "idiomatic"] as const)[Math.min(2, i)], explanationVi: "Biến thể bản xứ",
    })),
    sayItBetter: task.sayItBetter,
    toulmin, composure, fallacies, bridge,
    praisePoints: [
      ...(meaningScore >= 80 ? ["Truyền đạt đúng trọng tâm."] : []),
      ...(toulmin.toulminScore >= 75 ? [`Toulmin ${toulmin.toulminScore}% vững.`] : []),
      ...(bridge.hasBridge ? ["Dùng bridging rất bản lĩnh."] : []),
      ...(latency < 2200 ? ["Bật câu nhanh, dứt khoát."] : []),
    ].slice(0, 3),
    actionableFeedback: errors.length > 0
      ? `${errors[0].explanation} ${toulmin.feedbackVi}`
      : toulmin.missingKeyElements.length > 0
        ? `Bổ sung ${toulmin.missingKeyElements.join(", ")} để đạt chuẩn ${task.level}. ${toulmin.feedbackVi}`
        : "Xuất sắc! Giữ nhịp này và thử thách L3 / track khác.",
    hintTierUsed: hintTier, attemptNumber: attempt, evaluationSource: "deterministic",
  };
}

function cleanJson(text: string): unknown {
  const t = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(t); } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch {} }
    return null;
  }
}

const EVALUATOR_SYSTEM = `You evaluate advanced English speaking (B2-C1) for Vietnamese learners.
Return ONLY JSON matching AdvancedEvaluation: overallScore, meaningScore, grammarScore, naturalnessScore, fluencyScore, retrievalScore, independenceScore (0-100; independence 100/90/75/50/15 for hintTier 0-4), isCommunicativelyValid, isSuccessful(overall>=70), needsRetry, isSayItBetterNeeded, gapType(none|retrieval_gap|knowledge_gap|production_gap), gapExplanation(Vietnamese), userTranscript, cleanTranscript, responseLatencyMs, speechDurationMs, errors[{type,severity,userText,correction,explanation,patternKey}], betterVersion(native model), naturalAlternatives[{expression,tone,explanationVi}], sayItBetter{professional,casual,idiomatic}, praisePoints[], actionableFeedback(Vietnamese, mention missing Toulmin elements), hintTierUsed, attemptNumber.
Score meaning first (did they convey requiredMeaningElements + targetIntent?), then Toulmin completeness, then fluency under blitz.`;

export async function evaluateAdvancedAttempt(params: EvaluateAdvancedParams): Promise<AdvancedEvaluation> {
  const latency = params.responseLatencyMs ?? 2200;
  const duration = params.speechDurationMs ?? 3000;
  const hintTier = params.hintTierUsed ?? 0;
  const attempt = params.attemptNumber ?? 1;

  if (!params.forceAi && params.task.expectedResponses?.length) {
    const m = computeAdvancedFastPass(params.userTranscript, params.task.expectedResponses, params.task.requiredMeaningElements);
    if (m.isMatch && m.matchedResponse && hintTier <= 2) {
      return buildAdvancedFastPassEvaluation({
        task: params.task, userTranscript: params.userTranscript, matchedResponse: m.matchedResponse,
        confidence: m.confidence, responseLatencyMs: latency, speechDurationMs: duration,
        hintTierUsed: hintTier, attemptNumber: attempt,
      });
    }
  }

  const provider = params.provider || "gemini";
  if (provider === "mock") return deterministicEvaluation(params.task, params.userTranscript, { responseLatencyMs: latency, speechDurationMs: duration, hintTierUsed: hintTier, attemptNumber: attempt });

  try {
    const res = await generateTextWithRouting({
      provider, model: params.model || "auto",
      input: {
        messages: [{ role: "user", content: `Task: ${JSON.stringify(params.task).slice(0, 2200)}\nTranscript: "${params.userTranscript}"\nLatencyMs: ${latency}, DurationMs: ${duration}, hintTier: ${hintTier}, attempt: ${attempt}` }],
        systemInstruction: EVALUATOR_SYSTEM, temperature: 0.2, maxOutputTokens: 1000,
      },
    });
    const parsed = cleanJson(res.text);
    if (!parsed) throw new Error("Invalid JSON from evaluator");
    const validated = advancedEvaluationSchema.safeParse(parsed);
    if (!validated.success) throw new Error("Invalid evaluation schema");
    const data = validated.data as unknown as AdvancedEvaluation;
    // Enrich with local secondary analytics (cheap, deterministic)
    if (!params.forceAi) {
      try {
        data.toulmin = analyzeToulminArgumentation(params.userTranscript);
        data.fallacies = detectLogicalFallacies(params.userTranscript);
        data.bridge = detectTransitionalBridging(params.userTranscript);
      } catch {}
    }
    data.evaluationSource = "ai_llm";
    return data;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.warn("[AdvancedEvaluator] AI failed, deterministic fallback", err);
    return deterministicEvaluation(params.task, params.userTranscript, { responseLatencyMs: latency, speechDurationMs: duration, hintTierUsed: hintTier, attemptNumber: attempt });
  }
}
