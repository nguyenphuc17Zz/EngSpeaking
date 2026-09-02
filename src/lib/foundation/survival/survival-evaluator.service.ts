// Survival Evaluator Service — Function 7
// Evaluates Circumlocution & Real-Life Survival Scenarios

import { generateTextWithRouting } from "@/lib/ai";
import { survivalEvaluationSchema } from "@/lib/validation/survival-schemas";
import { SURVIVAL_EVALUATOR_SYSTEM } from "@/lib/ai/prompts/survival-prompts";
import type {
  CircumlocutionTask,
  SurvivalScenarioTask,
  SurvivalEvaluationResult,
} from "@/types/survival-speaking";

function cleanJson(text: string): unknown {
  let cleaned = text.trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  cleaned = cleaned.replace(/\b[a-zA-Z0-9_]+\s*=\s*(")/g, "$1");
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const candidate = m[0]
          .replace(/\b[a-zA-Z0-9_]+\s*=\s*(")/g, "$1")
          .replace(/,\s*([}\]])/g, "$1");
        return JSON.parse(candidate);
      } catch {}
    }
    return null;
  }
}

export async function evaluateCircumlocutionAttempt(params: {
  task: CircumlocutionTask;
  userTranscript: string;
  responseLatencyMs: number;
  provider?: string;
  model?: string;
}): Promise<SurvivalEvaluationResult> {
  const provider = params.provider || "gemini";
  const model = params.model && params.model !== "auto" ? params.model : "gemini-3.5-flash-lite";

  const lowerUser = params.userTranscript.toLowerCase();

  // Check forbidden words
  const forbiddenTriggered = params.task.forbiddenWords.some((fw) =>
    lowerUser.includes(fw.toLowerCase())
  );
  const targetWordAvoided = !forbiddenTriggered;

  if (provider === "mock") {
    const isSuccessful = targetWordAvoided && params.userTranscript.length >= 15;
    return {
      isSuccessful,
      communicationRecovered: isSuccessful,
      strategyUsed: "circumlocution",
      targetWordAvoided,
      conceptClarityScore: isSuccessful ? 92 : 40,
      repairInitiationLatencyMs: params.responseLatencyMs,
      naturalnessScore: isSuccessful ? 88 : 50,
      overallScore: isSuccessful ? 90 : 45,
      userTranscript: params.userTranscript,
      coachFeedbackVi: targetWordAvoided
        ? "Tuyệt vời! Bạn đã giải thích rõ đặc tính và công dụng của khái niệm mà không hề bị lỡ miệng nói từ bị cấm."
        : `Bạn đã lỡ miệng nói từ bị cấm ("${params.task.targetWord}"). Hãy thử lại bằng cách miêu tả công dụng hoặc chủng loại.`,
      idealRepairVersion: params.task.sampleExplanations[0] || "It's an item that you use to...",
      alternativeStrategies: ["Mô tả chức năng chính", "Kể tên bối cảnh thường thấy", "So sánh với vật dụng tương tự"],
    };
  }

  const userPrompt = `Evaluate this Circumlocution Attempt:
TARGET WORD (FORBIDDEN): "${params.task.targetWord}"
FORBIDDEN LIST: ${JSON.stringify(params.task.forbiddenWords)}
USER SPOKEN TRANSCRIPT: "${params.userTranscript}"
MEASURED LATENCY: ${params.responseLatencyMs} ms

Return strict JSON.`;

  const attemptEvaluate = async (): Promise<SurvivalEvaluationResult | null> => {
    try {
      const res = await generateTextWithRouting({
        provider,
        model,
        input: {
          messages: [{ role: "user", content: userPrompt }],
          systemInstruction: SURVIVAL_EVALUATOR_SYSTEM,
          temperature: 0.2,
          maxOutputTokens: 900,
        },
      });

      const parsed = cleanJson(res.text);
      if (!parsed) return null;

      const validated = survivalEvaluationSchema.safeParse(parsed);
      if (!validated.success) return null;
      return validated.data as SurvivalEvaluationResult;
    } catch {
      return null;
    }
  };

  let result = await attemptEvaluate();
  if (!result) result = await attemptEvaluate();

  if (!result) {
    throw new Error("Không thể đánh giá phần diễn giải Circumlocution từ AI. Vui lòng thử lại.");
  }

  return result;
}

export async function evaluateSurvivalScenarioAttempt(params: {
  task: SurvivalScenarioTask;
  userTranscript: string;
  responseLatencyMs: number;
  provider?: string;
  model?: string;
}): Promise<SurvivalEvaluationResult> {
  const provider = params.provider || "gemini";
  const model = params.model && params.model !== "auto" ? params.model : "gemini-3.5-flash-lite";

  if (provider === "mock") {
    const isSuccessful = params.userTranscript.length >= 10;
    return {
      isSuccessful,
      communicationRecovered: true,
      strategyUsed: params.task.recommendedSkill,
      conceptClarityScore: 90,
      repairInitiationLatencyMs: params.responseLatencyMs,
      naturalnessScore: 88,
      overallScore: isSuccessful ? 89 : 50,
      userTranscript: params.userTranscript,
      coachFeedbackVi: "Bạn đã xử lý tình huống rất nhanh nhạy và giữ được cuộc đối thoại tiếp tục trôi chảy!",
      idealRepairVersion: params.task.suggestedRepairPhrases[0] || "Sorry, could you say that again?",
      alternativeStrategies: ["Hỏi lại lịch sự", "Dùng câu đệm câu giờ", "Làm rõ ý kiến"],
    };
  }

  const userPrompt = `Evaluate this Real-Life Survival Scenario Attempt:
SCENARIO CONTEXT: ${params.task.contextTitleVi}
PROBLEM: ${params.task.problemDescriptionVi}
AUDIO PROMPT: "${params.task.audioPromptText}"
USER REPAIR ATTEMPT: "${params.userTranscript}"
MEASURED LATENCY: ${params.responseLatencyMs} ms

Return strict JSON.`;

  const attemptEvaluate = async (): Promise<SurvivalEvaluationResult | null> => {
    try {
      const res = await generateTextWithRouting({
        provider,
        model,
        input: {
          messages: [{ role: "user", content: userPrompt }],
          systemInstruction: SURVIVAL_EVALUATOR_SYSTEM,
          temperature: 0.2,
          maxOutputTokens: 900,
        },
      });

      const parsed = cleanJson(res.text);
      if (!parsed) return null;

      const validated = survivalEvaluationSchema.safeParse(parsed);
      if (!validated.success) return null;
      return validated.data as SurvivalEvaluationResult;
    } catch {
      return null;
    }
  };

  let result = await attemptEvaluate();
  if (!result) result = await attemptEvaluate();

  if (!result) {
    throw new Error("Không thể đánh giá phản xạ cứu cánh từ AI. Vui lòng thử lại.");
  }

  return result;
}
