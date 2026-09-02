// Response Latency Evaluator Service — Function 4
// Multi-dimensional latency analysis & 4-Quadrant diagnostic engine

import { generateTextWithRouting } from "@/lib/ai";
import { latencyEvaluationSchema } from "@/lib/validation/latency-schemas";
import { LATENCY_EVALUATOR_SYSTEM, buildLatencyEvaluatorUserPrompt } from "@/lib/ai/prompts/latency-prompts";
import type {
  LatencyTask,
  LatencyEvaluation,
  LatencyQuadrant,
  HesitationProfile,
} from "@/types/latency-training";

export interface EvaluateLatencyParams {
  task: LatencyTask;
  userTranscript: string;
  responseLatencyMs: number;
  speechDurationMs?: number;
  provider?: string;
  model?: string;
}

function cleanText(t: string): string {
  return t.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, "").trim();
}

function computeDeterministicLatencyEvaluation(
  task: LatencyTask,
  userTranscript: string,
  responseLatencyMs: number,
  speechDurationMs: number = 2500
): LatencyEvaluation {
  const cleanSpoken = cleanText(userTranscript);
  const targetLatency = task.targetLatencyMs || 3000;
  const ratio = Math.round((responseLatencyMs / targetLatency) * 100) / 100;

  // 1. Hesitation & Filler Analysis
  const rawLower = userTranscript.toLowerCase();
  const fillerTokens = ["um", "uh", "like", "you know", "i mean", "actually"];
  const fillersDetected = fillerTokens.filter((f) => new RegExp(`\\b${f}\\b`, "i").test(rawLower));
  const fillerCount = fillersDetected.length;
  const durationSec = Math.max(1, speechDurationMs / 1000);
  const fillersPerMinute = Math.round((fillerCount / durationSec) * 60 * 10) / 10;
  const selfCorrectionDetected = ["sorry", "i mean", "wait"].some((k) => rawLower.includes(k));

  // 2. Accuracy Score
  let accuracyScore = 88;
  if (!cleanSpoken || cleanSpoken.length < 3) {
    accuracyScore = 20;
  } else {
    const expectedKeywords = task.expectedKeywords || [];
    let matchCount = 0;
    expectedKeywords.forEach((kw) => {
      if (cleanSpoken.includes(cleanText(kw))) matchCount++;
    });
    if (expectedKeywords.length > 0) {
      accuracyScore = Math.min(100, Math.max(40, Math.round((matchCount / expectedKeywords.length) * 50 + 50)));
    }
  }

  const isSuccessful = accuracyScore >= 70;
  const isFast = responseLatencyMs <= targetLatency;

  // 3. 4-Quadrant Matrix Determination
  let quadrant: LatencyQuadrant;
  let likelyCause: LatencyEvaluation["likelyCause"] = "automatic";
  let latencyStatus: LatencyEvaluation["latencyStatus"] = "strong";

  if (isFast && isSuccessful) {
    quadrant = "fast_correct";
    likelyCause = "automatic";
    latencyStatus = responseLatencyMs < targetLatency * 0.7 ? "excellent" : "strong";
  } else if (!isFast && isSuccessful) {
    quadrant = "slow_correct";
    likelyCause = "spoken_retrieval";
    latencyStatus = responseLatencyMs > targetLatency * 1.6 ? "very_slow" : "slow";
  } else if (isFast && !isSuccessful) {
    quadrant = "fast_incorrect";
    likelyCause = "grammar_calculation";
    latencyStatus = "strong";
  } else {
    quadrant = "slow_incorrect";
    likelyCause = "vocabulary_search";
    latencyStatus = "very_slow";
  }

  // 4. Scoring
  const naturalnessScore = Math.min(100, Math.max(40, Math.round(accuracyScore * 0.9 - fillerCount * 5)));
  const fluencyScore = Math.min(100, Math.max(30, Math.round(100 - (ratio > 1 ? (ratio - 1) * 30 : 0) - fillerCount * 8)));
  const overallScore = Math.round(accuracyScore * 0.4 + fluencyScore * 0.35 + naturalnessScore * 0.25);

  const hesitation: HesitationProfile = {
    fillerCount,
    fillersDetected,
    fillersPerMinute,
    pauseCount: fillerCount > 0 ? fillerCount : 0,
    selfCorrectionDetected,
  };

  const praisePoints: string[] = [];
  if (quadrant === "fast_correct") {
    praisePoints.push(`Phản xạ cực nhanh (${(responseLatencyMs / 1000).toFixed(1)}s so với mục tiêu ${(targetLatency / 1000).toFixed(1)}s).`);
    praisePoints.push("Truy xuất câu nói tự động và chuẩn xác.");
  } else if (quadrant === "slow_correct") {
    praisePoints.push("Ý nghĩa và ngữ pháp câu rất chuẩn xác.");
    praisePoints.push("Đang trong quá trình tối ưu hóa tốc độ bật câu.");
  } else if (selfCorrectionDetected) {
    praisePoints.push("Tự sửa lỗi nhạy bén ngay khi đang nói.");
  }

  let coachFeedbackVi = "Hoàn thành lượt phản xạ.";
  if (quadrant === "fast_correct") {
    coachFeedbackVi = "Xuất sắc! Phản xạ tức thì và câu nói rất tự nhiên.";
  } else if (quadrant === "slow_correct") {
    coachFeedbackVi = "Ý câu rất chuẩn! Hãy tiếp tục luyện để rút ngắn thời gian suy nghĩ xuống dưới mục tiêu.";
  } else if (quadrant === "fast_incorrect") {
    coachFeedbackVi = "Tốc độ rất tốt, nhưng cần chú ý thêm độ chuẩn xác của câu.";
  } else {
    coachFeedbackVi = "Hãy thả lỏng và thử dùng các cụm đệm (Buffer phrases) để bắt đầu câu trơn tru hơn.";
  }

  return {
    overallScore,
    accuracyScore,
    naturalnessScore,
    fluencyScore,
    responseLatencyMs,
    speechDurationMs,
    targetLatencyMs: targetLatency,
    latencyRatio: ratio,
    quadrant,
    latencyStatus,
    likelyCause,
    hesitation,
    userTranscript,
    cleanTranscript: cleanSpoken,
    isSuccessful,
    coachFeedbackVi,
    betterResponse: task.sampleResponses[0] || userTranscript,
    praisePoints: praisePoints.length > 0 ? praisePoints : ["Đã hoàn thành phản xạ."],
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

export async function evaluateLatencyAttempt(
  params: EvaluateLatencyParams
): Promise<LatencyEvaluation> {
  const provider = params.provider || "gemini";
  const model = params.model || "auto";

  if (provider === "mock") {
    return computeDeterministicLatencyEvaluation(
      params.task,
      params.userTranscript,
      params.responseLatencyMs,
      params.speechDurationMs
    );
  }

  const userPrompt = buildLatencyEvaluatorUserPrompt({
    taskJson: JSON.stringify(params.task),
    userTranscript: params.userTranscript,
    responseLatencyMs: params.responseLatencyMs,
    speechDurationMs: params.speechDurationMs ?? 2500,
    targetLatencyMs: params.task.targetLatencyMs ?? 3000,
  });

  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: userPrompt }],
        systemInstruction: LATENCY_EVALUATOR_SYSTEM,
        temperature: 0.2,
        maxOutputTokens: 650,
      },
    });

    const parsed = cleanJson(res.text);
    if (!parsed) throw new Error("Could not parse JSON from Latency Evaluator");

    const validated = latencyEvaluationSchema.safeParse(parsed);
    if (!validated.success) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[LatencyEvaluator] Schema error:", validated.error);
      }
      throw new Error("Invalid latency evaluation schema");
    }

    return validated.data as LatencyEvaluation;
  } catch (err) {
    if (provider === "mock") {
      return computeDeterministicLatencyEvaluation(
        params.task,
        params.userTranscript,
        params.responseLatencyMs,
        params.speechDurationMs
      );
    }
    throw err;
  }
}
