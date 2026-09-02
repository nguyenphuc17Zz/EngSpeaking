// Correction Generator Service — Function 3
// Extracts single highest-priority error and generates minimal spoken repair prompt

import { generateTextWithRouting } from "@/lib/ai";
import { targetedCorrectionSchema } from "@/lib/validation/retry-loop-schemas";
import {
  CORRECTION_GENERATOR_SYSTEM,
  buildCorrectionGeneratorUserPrompt,
} from "@/lib/ai/prompts/retry-loop-prompts";
import type { TargetedCorrection, RepairPriority } from "@/types/retry-loop";

export interface GenerateCorrectionParams {
  prompt: string;
  userTranscript: string;
  expectedSentence: string;
  detectedErrors?: Array<{ type: string; userText: string; correction: string; explanation: string }>;
  provider?: string;
  model?: string;
}

function computeDeterministicCorrection(params: GenerateCorrectionParams): TargetedCorrection {
  const userSpoken = params.userTranscript.toLowerCase();
  const expected = params.expectedSentence;
  const errors = params.detectedErrors || [];

  if (errors.length > 0) {
    const err = errors[0];
    const isPast = err.userText.includes("go") && err.correction.includes("went");
    return {
      errorType: (err.type as any) || "grammar",
      priority: (err.type === "grammar" ? 2 : 3) as RepairPriority,
      patternKey: isPast ? "past_simple_verb" : `${err.type}_fix`,
      whatToFix: isPast ? "Thì Quá khứ đơn (Past Tense)" : `Sửa lỗi ${err.type}`,
      userErroneousText: err.userText || "lỗi khẩu ngữ",
      minimalCorrection: err.correction || expected,
      explanationVi: err.explanation || "Hãy sửa cụm từ này để câu chính xác hơn.",
      betterSentence: expected,
      skeletonHint: expected.replace(err.correction, "______"),
      simplifiedSentence: expected.split(",")[0] || expected,
    };
  }

  // Fallback pattern detection
  if (userSpoken.includes("i go") && expected.toLowerCase().includes("went")) {
    return {
      errorType: "grammar",
      priority: 2,
      patternKey: "past_simple_verb",
      whatToFix: "Thì Quá khứ đơn (Past Simple)",
      userErroneousText: "go",
      minimalCorrection: "went",
      explanationVi: "Diễn tả hành động trong quá khứ cần dùng động từ 'went'.",
      betterSentence: expected,
      skeletonHint: expected.replace(/went/i, "______"),
      simplifiedSentence: expected,
    };
  }

  return {
    errorType: "grammar",
    priority: 3,
    patternKey: "general_reconstruct",
    whatToFix: "Cấu trúc câu hoàn chỉnh",
    userErroneousText: params.userTranscript,
    minimalCorrection: expected,
    explanationVi: "Hãy nói lại toàn bộ câu theo cách diễn đạt tự nhiên.",
    betterSentence: expected,
    skeletonHint: expected,
    simplifiedSentence: expected,
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

export async function generateTargetedCorrection(
  params: GenerateCorrectionParams
): Promise<TargetedCorrection> {
  const provider = params.provider || "gemini";
  const model = params.model || "auto";

  if (provider === "mock") {
    return computeDeterministicCorrection(params);
  }

  const userPrompt = buildCorrectionGeneratorUserPrompt(params);

  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: userPrompt }],
        systemInstruction: CORRECTION_GENERATOR_SYSTEM,
        temperature: 0.2,
        maxOutputTokens: 600,
      },
    });

    const parsed = cleanJson(res.text);
    if (!parsed || typeof parsed !== "object") throw new Error("Could not parse JSON from Correction Generator");

    const obj = parsed as Record<string, unknown>;

    // Sanitize 4-tier hints if missing or partial
    if (!Array.isArray(obj.hints) || obj.hints.length === 0) {
      const errText = String(obj.userErroneousText || params.userTranscript || "lỗi khẩu ngữ");
      const fixText = String(obj.minimalCorrection || "câu chuẩn");
      const better = String(obj.betterSentence || params.expectedSentence);
      const skeleton = String(obj.skeletonHint || better.replace(fixText, "______"));
      obj.hints = [
        { tier: 0, title: "Không gợi ý", content: "Tự sửa và nói lại ngay." },
        { tier: 1, title: "Chỉ điểm lỗi", content: `Lỗi: ${errText} → Cần sửa thành: ${fixText}.` },
        { tier: 2, title: "Gợi ý cấu trúc", content: String(obj.explanationVi || "Quy tắc ngữ pháp / cụm từ chuẩn.") },
        { tier: 3, title: "Khung câu", content: skeleton },
        { tier: 4, title: "Câu mẫu hoàn chỉnh", content: better },
      ];
    }

    if (!Array.isArray(obj.suggestedVocabulary)) {
      obj.suggestedVocabulary = [];
    }

    const validated = targetedCorrectionSchema.safeParse(obj);
    if (!validated.success) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[CorrectionGenerator] Validation error:", validated.error);
      }
      throw new Error(`Invalid correction schema: ${validated.error.issues.map((i) => i.message).join(", ")}`);
    }

    return validated.data as TargetedCorrection;
  } catch (err) {
    if (provider === "mock") {
      return computeDeterministicCorrection(params);
    }
    throw err;
  }
}
