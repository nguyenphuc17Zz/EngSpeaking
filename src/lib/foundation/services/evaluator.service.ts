// Evaluator service — compact context §55, anti-hallucination §58
import { generateTextWithRouting } from "@/lib/ai";
import { VoiceEngineError, VoiceErrorCode } from "@/lib/errors/codes";
import { foundationEvaluationSchema } from "@/lib/validation/foundation-schemas";
import { EVALUATOR_SYSTEM, buildEvaluatorUserPrompt } from "@/lib/foundation/prompts/evaluator";
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
  const t = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(t); } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(m[0]); } catch {}
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
  if (provider === "mock") return mockEvaluation(exercise, transcript, opts || {});

  const userPrompt = buildEvaluatorUserPrompt({
    exerciseJson: JSON.stringify(exercise),
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
        maxOutputTokens: 700,
      },
    });
    const parsed = extractJson(res.text);
    if (!parsed) throw new Error("No JSON");
    const validated = foundationEvaluationSchema.safeParse(parsed);
    if (!validated.success) throw new Error("Schema invalid");
    // Quality gate: ensure overall 0-100
    return validated.data;
  } catch (e) {
    // Fallback to deterministic mock instead of failing UX §39
    if (process.env.NODE_ENV !== "production") console.warn("[evaluator] fallback mock", e);
    return mockEvaluation(exercise, transcript, opts || {});
  }
}

export { mockEvaluation };
