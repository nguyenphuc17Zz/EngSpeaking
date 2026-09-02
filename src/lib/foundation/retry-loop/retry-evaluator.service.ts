// Retry Evaluator Service — Function 3
// Evaluates specifically if the user repaired the target problem & detects self-corrections

import { generateTextWithRouting } from "@/lib/ai";
import { repairEvaluationResultSchema } from "@/lib/validation/retry-loop-schemas";
import {
  REPAIR_EVALUATOR_SYSTEM,
  buildRepairEvaluatorUserPrompt,
} from "@/lib/ai/prompts/retry-loop-prompts";
import type { TargetedCorrection, RepairEvaluationResult } from "@/types/retry-loop";

export interface EvaluateRepairAttemptParams {
  targetCorrection: TargetedCorrection;
  userRetryTranscript: string;
  originalTranscript: string;
  expectedSentence: string;
  attemptNumber?: number;
  provider?: string;
  model?: string;
}

function cleanText(t: string): string {
  return t.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, "").trim();
}

function computeDeterministicRepairEvaluation(
  params: EvaluateRepairAttemptParams
): RepairEvaluationResult {
  const retryClean = cleanText(params.userRetryTranscript);
  const targetFix = cleanText(params.targetCorrection.minimalCorrection);
  const erroneousWord = cleanText(params.targetCorrection.userErroneousText);
  const attempt = params.attemptNumber ?? 1;

  // 1. Check for Mid-Sentence Self Correction
  const rawSpoken = params.userRetryTranscript.toLowerCase();
  const selfCorrectionKeywords = ["sorry", "i mean", "wait", "no", "uh i mean", "excuse me"];
  const hasSelfCorrectionCue = selfCorrectionKeywords.some((k) => rawSpoken.includes(k));
  const selfCorrectionDetected = hasSelfCorrectionCue && (retryClean.includes(targetFix) || retryClean.length > 5);

  // 2. Check if target error is resolved
  let isTargetErrorResolved = false;
  if (targetFix && retryClean.includes(targetFix)) {
    isTargetErrorResolved = true;
  } else if (erroneousWord && !retryClean.includes(erroneousWord) && retryClean.length > 5) {
    isTargetErrorResolved = true;
  } else if (retryClean === cleanText(params.expectedSentence) || retryClean.includes(cleanText(params.expectedSentence))) {
    isTargetErrorResolved = true;
  }

  // 3. Meaning & New major errors check
  const isMeaningMaintained = retryClean.length >= 4;
  const isSuccessful = isTargetErrorResolved || selfCorrectionDetected;

  let overallRepairScore = isSuccessful ? 95 : 45;
  if (selfCorrectionDetected) overallRepairScore = 100;
  if (!isMeaningMaintained) overallRepairScore = 30;

  const shouldEscalateSupport = !isSuccessful && attempt >= 2;
  const canAdvance = isSuccessful || attempt >= 3;

  let feedbackMessage = isSuccessful
    ? "Xuất sắc! Bạn đã sửa chuẩn xác lỗi và nói lại câu rất tự nhiên."
    : `Hãy chú ý từ sửa: "${params.targetCorrection.minimalCorrection}". Hãy thử nói lại một lần nữa!`;

  if (selfCorrectionDetected) {
    feedbackMessage = "Rất tốt! Bạn đã tự phát hiện và sửa lỗi ngay trong khi nói (Self-Correction bonus +100).";
  }

  return {
    isTargetErrorResolved,
    isMeaningMaintained,
    selfCorrectionDetected,
    newMajorErrorsIntroduced: false,
    overallRepairScore,
    feedbackMessage,
    repairedText: params.userRetryTranscript,
    isSuccessful,
    shouldEscalateSupport,
    canAdvance,
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

export async function evaluateRepairAttempt(
  params: EvaluateRepairAttemptParams
): Promise<RepairEvaluationResult> {
  const provider = params.provider || "gemini";
  const model = params.model || "auto";

  if (provider === "mock") {
    return computeDeterministicRepairEvaluation(params);
  }

  const userPrompt = buildRepairEvaluatorUserPrompt({
    targetCorrection: JSON.stringify(params.targetCorrection),
    originalTranscript: params.originalTranscript,
    userRetryTranscript: params.userRetryTranscript,
    expectedSentence: params.expectedSentence,
    attemptNumber: params.attemptNumber ?? 1,
  });

  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: userPrompt }],
        systemInstruction: REPAIR_EVALUATOR_SYSTEM,
        temperature: 0.2,
        maxOutputTokens: 600,
      },
    });

    const parsed = cleanJson(res.text);
    if (!parsed) throw new Error("Could not parse JSON from Repair Evaluator");

    const validated = repairEvaluationResultSchema.safeParse(parsed);
    if (!validated.success) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[RepairEvaluator] Schema invalid:", validated.error);
      }
      throw new Error("Invalid repair evaluation schema");
    }

    return validated.data as RepairEvaluationResult;
  } catch (err) {
    if (provider === "mock") {
      return computeDeterministicRepairEvaluation(params);
    }
    throw err;
  }
}
