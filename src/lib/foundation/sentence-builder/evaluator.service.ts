// Evaluator Service for Sentence Builder (Function 1)
// Communicative-first spoken evaluation with actionable coaching feedback

import { generateTextWithRouting } from "@/lib/ai";
import { sentenceBuilderEvaluationSchema } from "@/lib/validation/sentence-builder-schemas";
import { EVALUATOR_SYSTEM, buildEvaluatorUserPrompt } from "@/lib/ai/prompts/sentence-builder-prompts";
import {
  computeFastPassMatch,
  buildFastPassEvaluation,
  calculateHesitationMetrics,
} from "./fast-pass.service";
import type {
  SentenceBuilderTask,
  SentenceBuilderEvaluation,
  EvaluatedError,
} from "@/types/sentence-builder";

export interface EvaluateAttemptParams {
  task: SentenceBuilderTask;
  userTranscript: string;
  latencyMs?: number;
  speechDurationMs?: number;
  hintTierUsed?: number;
  attemptNumber?: number;
  provider?: string;
  model?: string;
  forceAi?: boolean; // Set true to bypass fast-pass if explicit full deep AI review requested
}

function cleanText(t: string): string {
  return t.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, "").trim();
}

function computeDeterministicEvaluation(
  task: SentenceBuilderTask,
  userTranscript: string,
  opts: {
    latencyMs?: number;
    speechDurationMs?: number;
    hintTierUsed?: number;
    attemptNumber?: number;
  }
): SentenceBuilderEvaluation {
  const cleanSpoken = cleanText(userTranscript);
  const latencyMs = opts.latencyMs ?? 2500;
  const speechDurationMs = opts.speechDurationMs ?? 3000;
  const hintTier = opts.hintTierUsed ?? 0;
  const attempt = opts.attemptNumber ?? 1;

  const hesitationMetrics = calculateHesitationMetrics({
    userTranscript,
    speechDurationMs,
    latencyMs,
  });

  if (!cleanSpoken || cleanSpoken.length < 3) {
    return {
      overallScore: 20,
      meaningScore: 10,
      grammarScore: 20,
      naturalnessScore: 20,
      fluencyScore: 15,
      retrievalScore: 10,
      independenceScore: 100,
      isCommunicativelyValid: false,
      isSuccessful: false,
      needsRetry: true,
      userTranscript,
      cleanTranscript: cleanSpoken,
      latencyMs,
      speechDurationMs,
      errors: [
        {
          type: "omission",
          severity: "major",
          userText: "",
          correction: task.expectedResponses[0] || "I usually drink coffee in the morning.",
          explanation: "Chưa nhận diện được giọng nói hoặc câu quá ngắn. Hãy thử lại!",
        },
      ],
      betterVersion: task.expectedResponses[0] || "",
      simplifiedVersion: task.scaffold.template || task.expectedResponses[0],
      praisePoints: ["Bạn đã bấm mic để bắt đầu."],
      actionableFeedback: "Hãy nói to, rõ ràng và trọn vẹn cả câu tiếng Anh.",
      hintTierUsed: hintTier,
      attemptNumber: attempt,
      evaluationSource: "deterministic",
      hesitationMetrics,
    };
  }

  // 1. Keyword & Concept matching
  const targetWords = (task.expectedResponses[0] || "").toLowerCase().split(/\s+/).filter(Boolean);
  const spokenWords = cleanSpoken.split(/\s+/).filter(Boolean);

  let matchedKeywords = 0;
  const requiredElements = task.requiredElements || [];
  requiredElements.forEach((req) => {
    const reqClean = cleanText(req);
    if (cleanSpoken.includes(reqClean) || req.split(" ").some((w) => cleanSpoken.includes(cleanText(w)))) {
      matchedKeywords++;
    }
  });

  const meaningRatio = requiredElements.length > 0
    ? matchedKeywords / requiredElements.length
    : Math.min(1.0, spokenWords.length / Math.max(1, targetWords.length));

  const meaningScore = Math.min(100, Math.max(30, Math.round(meaningRatio * 90 + 10)));
  const isCommunicativelyValid = meaningScore >= 65;

  // 2. Grammar & Structure check
  const errors: EvaluatedError[] = [];
  let grammarScore = 80;

  // Simple heuristic checks (e.g. past tense slip "go" instead of "went")
  if (task.grammarTargets?.includes("past_simple") && spokenWords.includes("go") && !spokenWords.includes("went")) {
    errors.push({
      type: "grammar",
      severity: "major",
      userText: "go",
      correction: "went",
      explanation: "Hành động đã xảy ra trong quá khứ cần dùng động từ dạng quá khứ 'went'.",
      patternKey: "past_simple_irregular",
    });
    grammarScore -= 20;
  }

  if (cleanSpoken.includes("i usually to") || cleanSpoken.includes("i usually going")) {
    errors.push({
      type: "grammar",
      severity: "minor",
      userText: "usually to / usually going",
      correction: "usually [verb]",
      explanation: "Sau trạng từ tần suất 'usually', dùng động từ nguyên mẫu dạng hiện tại đơn.",
      patternKey: "present_simple_adverb",
    });
    grammarScore -= 15;
  }

  // 3. Retrieval & Independence score
  const independenceScore = hintTier === 0 ? 100 : hintTier === 1 ? 90 : hintTier === 2 ? 75 : hintTier === 3 ? 50 : 15;

  // Retrieval speed bonus/penalty (ideal: latency < 2500ms)
  const speedBonus = latencyMs < 2000 ? 10 : latencyMs < 3500 ? 0 : -15;
  const retrievalScore = Math.min(100, Math.max(20, Math.round(independenceScore * 0.7 + (isCommunicativelyValid ? 30 : 0) + speedBonus)));

  const naturalnessScore = Math.min(100, Math.max(40, Math.round(meaningScore * 0.5 + grammarScore * 0.5)));
  const fluencyScore = Math.min(100, Math.max(35, Math.round(85 - (speechDurationMs > 8000 ? 20 : 0) + (spokenWords.length > 5 ? 10 : 0))));

  const overallScore = Math.round(
    meaningScore * 0.35 +
    grammarScore * 0.25 +
    naturalnessScore * 0.20 +
    retrievalScore * 0.20
  );

  const isSuccessful = overallScore >= 70;
  const needsRetry = !isSuccessful || errors.some((e) => e.severity === "major");

  const betterVersion = task.expectedResponses[0] || userTranscript;
  const praisePoints: string[] = [];
  if (meaningScore >= 80) praisePoints.push("Truyền đạt đúng trọng tâm và ý nghĩa.");
  if (latencyMs < 2500) praisePoints.push("Phản xạ bật ra câu nhanh và dứt khoát.");
  if (errors.length === 0) praisePoints.push("Ngữ pháp và trật tự từ chuẩn xác.");

  let actionableFeedback = "Bạn đã hoàn thành câu nói.";
  if (errors.length > 0) {
    actionableFeedback = `Lưu ý sửa: "${errors[0].userText}" → "${errors[0].correction}". ${errors[0].explanation}`;
  } else if (!isSuccessful) {
    actionableFeedback = "Hãy nói trọn vẹn hơn để câu đủ ý nghĩa.";
  } else {
    actionableFeedback = "Rất tốt! Câu nói tự nhiên và đúng ngữ cảnh.";
  }

  return {
    overallScore,
    meaningScore,
    grammarScore,
    naturalnessScore,
    fluencyScore,
    retrievalScore,
    independenceScore,
    isCommunicativelyValid,
    isSuccessful,
    needsRetry,
    userTranscript,
    cleanTranscript: cleanSpoken,
    latencyMs,
    speechDurationMs,
    errors,
    betterVersion,
    simplifiedVersion: overallScore < 60 ? (task.scaffold.template || task.expectedResponses[0]) : undefined,
    praisePoints: praisePoints.length > 0 ? praisePoints : ["Đã nỗ lực nói thành tiếng."],
    actionableFeedback,
    hintTierUsed: hintTier,
    attemptNumber: attempt,
    evaluationSource: "deterministic",
    hesitationMetrics,
  };
}

function cleanJson(text: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(withoutFence);
  } catch {
    const m = withoutFence.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {}
    }
    return null;
  }
}

export async function evaluateSentenceBuilderAttempt(
  params: EvaluateAttemptParams
): Promise<SentenceBuilderEvaluation> {
  const provider = params.provider || "gemini";
  const model = params.model || "auto";
  const latencyMs = params.latencyMs ?? 2000;
  const speechDurationMs = params.speechDurationMs ?? 3000;
  const hintTierUsed = params.hintTierUsed ?? 0;
  const attemptNumber = params.attemptNumber ?? 1;

  // Compute speech hesitation metrics up-front
  const hesitationMetrics = calculateHesitationMetrics({
    userTranscript: params.userTranscript,
    speechDurationMs,
    latencyMs,
  });

  // TIER 1: FAST-PASS MATCH (0ms local evaluation)
  // If user spoke a clean sentence closely matching expected responses and didn't rely heavily on answers,
  // evaluate immediately with 0ms latency and 0 API cost.
  if (!params.forceAi && params.task.expectedResponses?.length > 0) {
    const fastPassMatch = computeFastPassMatch(
      params.userTranscript,
      params.task.expectedResponses,
      params.task.requiredElements
    );

    if (fastPassMatch.isMatch && fastPassMatch.matchedResponse) {
      return buildFastPassEvaluation({
        task: params.task,
        userTranscript: params.userTranscript,
        matchedResponse: fastPassMatch.matchedResponse,
        confidence: fastPassMatch.confidence,
        latencyMs,
        speechDurationMs,
        hintTierUsed,
        attemptNumber,
      });
    }
  }

  // If running in test or offline mock mode
  if (provider === "mock") {
    return computeDeterministicEvaluation(params.task, params.userTranscript, {
      latencyMs,
      speechDurationMs,
      hintTierUsed,
      attemptNumber,
    });
  }

  // TIER 2 & 3: DEEP AI EVALUATION (Gemini/Groq)
  const userPrompt = buildEvaluatorUserPrompt({
    taskJson: JSON.stringify(params.task),
    userTranscript: params.userTranscript,
    latencyMs,
    speechDurationMs,
    hintTierUsed,
    attemptNumber,
  });

  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: userPrompt }],
        systemInstruction: EVALUATOR_SYSTEM,
        temperature: 0.2,
        maxOutputTokens: 800,
      },
    });

    const parsed = cleanJson(res.text);
    if (!parsed) throw new Error("Could not parse JSON from Evaluator LLM");

    const validated = sentenceBuilderEvaluationSchema.safeParse(parsed);
    if (!validated.success) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[SentenceBuilderEvaluator] Schema invalid:", validated.error);
      }
      throw new Error("Invalid evaluator schema");
    }

    const evaluation = validated.data as SentenceBuilderEvaluation;
    evaluation.evaluationSource = "ai_llm";
    evaluation.hesitationMetrics = hesitationMetrics;

    return evaluation;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[SentenceBuilderEvaluator] AI evaluation error:", err);
    }
    throw new Error(
      `Không thể chấm điểm câu nói bằng AI (${provider} • ${model}): ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}
