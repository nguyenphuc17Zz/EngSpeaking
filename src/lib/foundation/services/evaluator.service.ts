// Evaluator service — compact context §55, anti-hallucination §58 + 0ms Fast-Pass
import { generateTextWithRouting } from "@/lib/ai";
import { foundationEvaluationSchema } from "@/lib/validation/foundation-schemas";
import { EVALUATOR_SYSTEM, buildEvaluatorUserPrompt } from "@/lib/foundation/prompts/evaluator";
import { cleanAiJson } from "@/lib/foundation/shared/json-parser";
import { computeLevenshteinSimilarity } from "@/lib/foundation/shared/text-similarity";
import type { FoundationExercise, FoundationEvaluation } from "@/types/foundation";

function mockEvaluation(exercise: FoundationExercise, transcript: string, opts: { durationMs?: number; timeToFirstWordMs?: number; hintsUsed?: number }): FoundationEvaluation {
  const words = transcript.trim().split(/\s+/).filter(Boolean).length;
  const hasContent = transcript.trim().length > 5;
  const fillerCount = (transcript.match(/\b(um|uh|like|you know)\b/gi) || []).length;
  const ttfw = opts.timeToFirstWordMs ?? 1500;
  const base = hasContent ? 65 + Math.min(20, words * 1.5) - fillerCount * 3 : 25;
  const overall = Math.max(15, Math.min(92, Math.round(base - (opts.hintsUsed || 0) * 8 - (ttfw > 3000 ? 10 : 0))));
  const classification: FoundationEvaluation["classification"] = overall >= 85 && (opts.hintsUsed || 0) === 0 ? "too_easy" : overall <= 45 ? "too_hard" : "appropriate";
  const delta = classification === "too_easy" ? 1 : classification === "too_hard" ? -1 : 0;
  return {
    score: {
      completion: hasContent ? 80 : 20,
      responseSpeed: ttfw < 2000 ? 85 : ttfw < 4000 ? 60 : 35,
      sentenceFormation: hasContent ? 70 : 20,
      accuracy: hasContent ? 68 : 20,
      fluency: hasContent ? 65 : 15,
      retrieval: hasContent ? 70 : 20,
      expansion: words > 12 ? 75 : words > 6 ? 60 : 35,
      confidence: hasContent && (opts.hintsUsed || 0) === 0 ? 78 : 45,
      recovery: (opts.hintsUsed || 0) > 0 ? 60 : 70,
      overall,
      fillerCount,
      pauseBehavior: fillerCount > 3 ? "excessive" : fillerCount > 0 ? "natural" : "none",
      insufficientEvidence: !hasContent,
    },
    feedback: {
      whatWentWell: hasContent ? "Bạn đã hoàn thành câu và nói trọn vẹn." : "Bạn đã cố gắng nói, hãy thử lại với 1 câu đơn giản.",
      mainIssue: hasContent && words < 5 ? "Câu hơi ngắn, thử thêm chi tiết where/when/why." : fillerCount > 2 ? "Dùng hơi nhiều filler (um/uh), thử nói chậm lại." : null,
      betterVersion: hasContent ? null : "Ví dụ: 'I went to the park yesterday with my friends.'",
      tryAgain: "Thử lại lần nữa, nói chậm và rõ hơn.",
      nextMicroGoal: classification === "too_easy" ? "Thử tăng độ khó lên 1 mức." : classification === "too_hard" ? "Thử mức dễ hơn, tập trung vào 1 câu." : "Giữ mức này và luyện thêm 1 bài tương tự.",
      fillerNote: fillerCount > 2 ? "Phát hiện vài filler — bình thường khi luyện, sẽ giảm khi phản xạ nhanh hơn." : null,
    },
    classification,
    suggestedDifficultyDelta: delta as -1 | 0 | 1,
    hintsUsed: opts.hintsUsed || 0,
    timeToFirstWordMs: opts.timeToFirstWordMs,
    durationMs: opts.durationMs,
  };
}

function extractJson(text: string): unknown {
  const cleaned = cleanAiJson(text);
  if (!cleaned) return null;
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function evaluateAttempt(
  exercise: FoundationExercise,
  transcript: string,
  rawTranscript: string | undefined,
  opts?: { durationMs?: number; timeToFirstWordMs?: number; hintsUsed?: number; hintLevel?: number; provider?: string; model?: string }
): Promise<FoundationEvaluation> {
  const provider = opts?.provider || "gemini";
  const model = opts?.model || "auto";
  if (provider === "mock" || transcript.trim().length < 4) {
    return mockEvaluation(exercise, transcript, opts || {});
  }

  const fillerCount = (transcript.match(/\b(um|uh|like|you know)\b/gi) || []).length;
  const hintsUsed = opts?.hintsUsed || 0;
  const ttfw = opts?.timeToFirstWordMs ?? 1500;

  // 0ms Fast-Pass when targetPhrase or targetPattern matches cleanly
  const targetRef = exercise.targetPhrase || exercise.targetPattern;
  if (targetRef && fillerCount <= 1 && ttfw <= 3000) {
    const sim = computeLevenshteinSimilarity(transcript, targetRef);
    const includesTarget =
      exercise.targetPhrase &&
      transcript.toLowerCase().includes(exercise.targetPhrase.toLowerCase().replace(/\.+$/, "")) &&
      transcript.trim().split(/\s+/).length >= 6;
    if (sim >= 0.88 || includesTarget) {
      const fastEv = mockEvaluation(exercise, transcript, opts || {});
      fastEv.score.overall = Math.max(88, fastEv.score.overall);
      fastEv.score.completion = 95;
      fastEv.score.accuracy = 92;
      fastEv.classification = hintsUsed === 0 ? "too_easy" : "appropriate";
      fastEv.suggestedDifficultyDelta = hintsUsed === 0 ? 1 : 0;
      return fastEv;
    }
  }

  const compactExercise = {
    skill: exercise.skill,
    type: exercise.type,
    difficulty: exercise.difficulty,
    instruction: exercise.instruction,
    prompt: exercise.prompt,
    targetPhrase: exercise.targetPhrase,
    targetPattern: exercise.targetPattern,
    constraints: exercise.constraints,
  };

  const userPrompt = buildEvaluatorUserPrompt({
    exerciseJson: JSON.stringify(compactExercise),
    transcript,
    rawTranscript,
    durationMs: opts?.durationMs,
    timeToFirstWordMs: opts?.timeToFirstWordMs,
    hintsUsed: opts?.hintsUsed,
    hintLevel: opts?.hintLevel,
  });

  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: userPrompt }],
        systemInstruction: EVALUATOR_SYSTEM,
        temperature: 0.3,
        maxOutputTokens: 420,
      },
    });
    const parsed = extractJson(res.text) as Record<string, any> | null;
    if (!parsed || typeof parsed !== "object") throw new Error("No JSON");

    // Hydrate deterministic fields before Zod validation
    if (parsed.score && typeof parsed.score === "object") {
      parsed.score.fillerCount = parsed.score.fillerCount ?? fillerCount;
      parsed.score.pauseBehavior = parsed.score.pauseBehavior || (fillerCount > 3 ? "excessive" : fillerCount > 0 ? "natural" : "none");
      parsed.score.insufficientEvidence = parsed.score.insufficientEvidence ?? false;
    }
    const overall = parsed.score?.overall ?? 70;
    const classification =
      parsed.classification ||
      (overall >= 85 && hintsUsed === 0 ? "too_easy" : overall <= 45 || hintsUsed >= 2 ? "too_hard" : "appropriate");
    parsed.classification = classification;
    parsed.suggestedDifficultyDelta =
      parsed.suggestedDifficultyDelta ?? (classification === "too_easy" ? 1 : classification === "too_hard" ? -1 : 0);
    parsed.hintsUsed = hintsUsed;
    if (opts?.timeToFirstWordMs !== undefined) parsed.timeToFirstWordMs = opts.timeToFirstWordMs;
    if (opts?.durationMs !== undefined) parsed.durationMs = opts.durationMs;

    const validated = foundationEvaluationSchema.safeParse(parsed);
    if (!validated.success) throw new Error("Schema invalid");
    return validated.data;
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.warn("[evaluator] fallback mock", e);
    return mockEvaluation(exercise, transcript, opts || {});
  }
}

export { mockEvaluation };
