// Semantic Evaluator Service for Vietnamese -> English Speaking (Function 2)
// Evaluates meaning coverage, gap diagnosis (Knowledge vs Retrieval), and generates Say It Better alternatives

import { generateTextWithRouting } from "@/lib/ai";
import { vnToENEvaluationSchema } from "@/lib/validation/vn-to-en-schemas";
import { VN_TO_EN_EVALUATOR_SYSTEM, buildVNToENEvaluatorPrompt } from "@/lib/ai/prompts/vn-to-en-prompts";
import type {
  VNToENTask,
  VNToENEvaluation,
  VNEvaluatedError,
  SemanticAlternative,
  SpokenGapType,
} from "@/types/vn-to-en";

export interface EvaluateVNAttemptParams {
  task: VNToENTask;
  userTranscript: string;
  responseLatencyMs?: number;
  speechDurationMs?: number;
  hintTierUsed?: number;
  attemptNumber?: number;
  provider?: string;
  model?: string;
}

function cleanText(t: string): string {
  return t.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, "").trim();
}

function computeDeterministicVNEvaluation(
  task: VNToENTask,
  userTranscript: string,
  opts: {
    responseLatencyMs?: number;
    speechDurationMs?: number;
    hintTierUsed?: number;
    attemptNumber?: number;
  }
): VNToENEvaluation {
  const cleanSpoken = cleanText(userTranscript);
  const latencyMs = opts.responseLatencyMs ?? 2200;
  const speechDurationMs = opts.speechDurationMs ?? 2800;
  const hintTier = opts.hintTierUsed ?? 0;
  const attempt = opts.attemptNumber ?? 1;

  if (!cleanSpoken || cleanSpoken.length < 2) {
    return {
      overallScore: 20,
      meaningScore: 10,
      grammarScore: 20,
      naturalnessScore: 20,
      fluencyScore: 10,
      retrievalScore: 15,
      independenceScore: 100,
      isCommunicativelyValid: false,
      isSuccessful: false,
      needsRetry: true,
      isSayItBetterNeeded: false,
      gapType: "knowledge_gap",
      gapExplanation: "Chưa ghi nhận được âm thanh. Hãy thử nói to và rõ ràng hơn!",
      userTranscript,
      cleanTranscript: cleanSpoken,
      responseLatencyMs: latencyMs,
      speechDurationMs,
      errors: [
        {
          type: "omission",
          severity: "major",
          userText: "",
          correction: task.expectedResponses[0] || "",
          explanation: "Hãy nói thành tiếng bằng tiếng Anh theo ý nghĩa tiếng Việt.",
        },
      ],
      betterVersion: task.expectedResponses[0] || "",
      naturalAlternatives: [
        { expression: task.expectedResponses[0] || "", tone: "neutral", explanationVi: "Cách nói chuẩn" },
      ],
      praisePoints: ["Đã bấm nút để bắt đầu phản xạ."],
      actionableFeedback: "Hãy nói to, dứt khoát cả câu tiếng Anh.",
      hintTierUsed: hintTier,
      attemptNumber: attempt,
    };
  }

  // 1. Semantic Coverage check
  const requiredElements = task.requiredMeaningElements || [];
  const expectedList = task.expectedResponses || [];

  // Check if user transcript matches any of expected responses closely
  const isDirectExpectedMatch = expectedList.some((exp) => {
    const cleanExp = cleanText(exp);
    if (cleanSpoken === cleanExp || cleanSpoken.includes(cleanExp) || cleanExp.includes(cleanSpoken)) return true;
    const expWords = cleanExp.split(/\s+/).filter((w) => w.length > 2);
    const userWords = cleanSpoken.split(/\s+/).filter((w) => w.length > 2);
    if (expWords.length === 0) return true;
    const matchCount = expWords.filter((w) => userWords.includes(w)).length;
    return matchCount / expWords.length >= 0.5;
  });

  let matchedElements = 0;
  requiredElements.forEach((elem) => {
    const cleanElem = cleanText(elem);
    const elemWords = cleanElem.split(/\s+/).filter((w) => w.length > 2);
    const hasWordMatch = elemWords.length > 0 && elemWords.some((w) => cleanSpoken.includes(w));
    if (cleanSpoken.includes(cleanElem) || hasWordMatch) {
      matchedElements++;
    }
  });

  const meaningRatio = isDirectExpectedMatch
    ? 1.0
    : requiredElements.length > 0
    ? matchedElements / requiredElements.length
    : 0.85;

  const meaningScore = isDirectExpectedMatch
    ? 100
    : Math.min(100, Math.max(30, Math.round(meaningRatio * 90 + 10)));
  const isCommunicativelyValid = meaningScore >= 65;

  // 2. Grammar & Error detection
  const errors: VNEvaluatedError[] = [];
  let grammarScore = 85;

  if (task.targetSkills.includes("past_simple") && cleanSpoken.includes("i go ") && !cleanSpoken.includes("went")) {
    errors.push({
      type: "grammar",
      severity: "major",
      userText: "go",
      correction: "went",
      explanation: "Nói về sự việc trong quá khứ cần dùng dạng quá khứ 'went'.",
      patternKey: "past_simple_verb",
    });
    grammarScore -= 25;
  }

  if (cleanSpoken.includes("go gym")) {
    errors.push({
      type: "article",
      severity: "minor",
      userText: "go gym",
      correction: "go to the gym",
      explanation: "Cụm từ chuẩn cần có giới từ và mạo từ: 'go to the gym'.",
      patternKey: "article_the",
    });
    grammarScore -= 10;
  }

  // 3. Gap Classification (Knowledge vs Retrieval vs Production)
  let gapType: SpokenGapType = "none";
  let gapExplanation = "Phản xạ mượt mà và chuẩn xác.";

  if (latencyMs > 3500 && isCommunicativelyValid) {
    gapType = "retrieval_gap";
    gapExplanation = "Bạn biết câu nhưng độ trễ phản xạ còn hơi cao (>3.5s). Hãy luyện tăng tốc độ!";
  } else if (!isCommunicativelyValid && errors.length > 1) {
    gapType = "knowledge_gap";
    gapExplanation = "Cần củng cố từ vựng và cấu trúc ngữ pháp mục tiêu.";
  } else if (errors.some((e) => e.type === "word_order" || e.type === "omission")) {
    gapType = "production_gap";
    gapExplanation = "Bạn đã có từ vựng nhưng việc ghép câu nói miệng còn hơi vấp.";
  }

  // 4. Independence & Retrieval Score
  const independenceScore = hintTier === 0 ? 100 : hintTier === 1 ? 90 : hintTier === 2 ? 75 : hintTier === 3 ? 50 : 10;
  const speedBonus = latencyMs < 2000 ? 15 : latencyMs < 3500 ? 5 : -10;
  const retrievalScore = Math.min(100, Math.max(25, Math.round(independenceScore * 0.7 + (isCommunicativelyValid ? 25 : 0) + speedBonus)));

  const naturalnessScore = Math.min(100, Math.max(45, Math.round(meaningScore * 0.5 + grammarScore * 0.5)));
  const fluencyScore = Math.min(100, Math.max(40, Math.round(90 - (speechDurationMs > 7000 ? 15 : 0))));

  const overallScore = Math.round(
    meaningScore * 0.35 +
    grammarScore * 0.25 +
    naturalnessScore * 0.20 +
    retrievalScore * 0.20
  );

  const isSuccessful = overallScore >= 70;
  const needsRetry = !isSuccessful || errors.some((e) => e.severity === "major");
  const isSayItBetterNeeded = isCommunicativelyValid && naturalnessScore < 85;

  const betterVersion = task.expectedResponses[0] || userTranscript;
  const naturalAlternatives: SemanticAlternative[] = (task.expectedResponses || []).map((exp, i) => ({
    expression: exp,
    tone: i === 0 ? "neutral" : i === 1 ? "casual" : "idiomatic",
    explanationVi: i === 0 ? "Cách nói chuẩn thông dụng" : i === 1 ? "Cách nói tự nhiên hàng ngày" : "Cách diễn đạt linh hoạt",
  }));

  const praisePoints: string[] = [];
  if (meaningScore >= 85) praisePoints.push("Truyền đạt trọn vẹn ý nghĩa tiếng Việt.");
  if (latencyMs < 2200) praisePoints.push("Tốc độ bật ra câu nhanh dứt khoát.");
  if (gapType === "none") praisePoints.push("Phát âm tự tin và tự lập.");

  let actionableFeedback = "Bạn đã hoàn thành câu nói.";
  if (errors.length > 0) {
    actionableFeedback = `Lưu ý: "${errors[0].userText}" → "${errors[0].correction}". ${errors[0].explanation}`;
  } else if (isSayItBetterNeeded) {
    actionableFeedback = "Ý câu rất chuẩn! Hãy thử bấm 'Say It Better' để nói theo cách tự nhiên hơn.";
  } else {
    actionableFeedback = "Xuất sắc! Câu nói tự nhiên như người bản xứ.";
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
    isSayItBetterNeeded,
    gapType,
    gapExplanation,
    userTranscript,
    cleanTranscript: cleanSpoken,
    responseLatencyMs: latencyMs,
    speechDurationMs,
    errors,
    betterVersion,
    naturalAlternatives: naturalAlternatives.length > 0 ? naturalAlternatives : [
      { expression: betterVersion, tone: "neutral", explanationVi: "Câu bản xứ tự nhiên" },
    ],
    praisePoints: praisePoints.length > 0 ? praisePoints : ["Đã nỗ lực phản xạ khẩu ngữ."],
    actionableFeedback,
    sayItBetter: task.sayItBetter || {
      professional: task.expectedResponses[0] || betterVersion,
      casual: task.expectedResponses[1] || task.expectedResponses[0] || betterVersion,
      idiomatic: task.expectedResponses[2] || task.expectedResponses[0] || betterVersion,
    },
    hintTierUsed: hintTier,
    attemptNumber: attempt,
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

export async function evaluateVNToENAttempt(
  params: EvaluateVNAttemptParams
): Promise<VNToENEvaluation> {
  const provider = params.provider || "gemini";
  const model = params.model || "auto";

  if (provider === "mock") {
    return computeDeterministicVNEvaluation(params.task, params.userTranscript, {
      responseLatencyMs: params.responseLatencyMs,
      speechDurationMs: params.speechDurationMs,
      hintTierUsed: params.hintTierUsed,
      attemptNumber: params.attemptNumber,
    });
  }

  const userPrompt = buildVNToENEvaluatorPrompt({
    taskJson: JSON.stringify(params.task),
    userTranscript: params.userTranscript,
    responseLatencyMs: params.responseLatencyMs ?? 2000,
    speechDurationMs: params.speechDurationMs ?? 2800,
    hintTierUsed: params.hintTierUsed ?? 0,
    attemptNumber: params.attemptNumber ?? 1,
  });

  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: userPrompt }],
        systemInstruction: VN_TO_EN_EVALUATOR_SYSTEM,
        temperature: 0.2,
        maxOutputTokens: 900,
      },
    });

    const parsed = cleanJson(res.text);
    if (!parsed) throw new Error("Could not parse JSON from VNToEN Evaluator");

    const validated = vnToENEvaluationSchema.safeParse(parsed);
    if (!validated.success) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[VNToENEvaluator] Schema invalid:", validated.error);
      }
      throw new Error("Invalid evaluator schema");
    }

    const evalData = validated.data as VNToENEvaluation;
    if (!evalData.sayItBetter && params.task.sayItBetter) {
      evalData.sayItBetter = params.task.sayItBetter;
    }
    return evalData;
  } catch (err) {
    if (provider === "mock") {
      return computeDeterministicVNEvaluation(params.task, params.userTranscript, {
        responseLatencyMs: params.responseLatencyMs,
        speechDurationMs: params.speechDurationMs,
        hintTierUsed: params.hintTierUsed,
        attemptNumber: params.attemptNumber,
      });
    }
    if (process.env.NODE_ENV !== "production") {
      console.warn("[VNToENEvaluator] AI evaluation error:", err);
    }
    throw new Error(
      `Lỗi kết nối AI đánh giá câu nói (${provider}): ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
