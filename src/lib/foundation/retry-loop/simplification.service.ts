// Cognitive Simplification Service — Function 3
// Reduces sentence complexity to eliminate cognitive overload

import { generateTextWithRouting } from "@/lib/ai";
import { simplificationResultSchema } from "@/lib/validation/retry-loop-schemas";
import { SIMPLIFICATION_SYSTEM } from "@/lib/ai/prompts/retry-loop-prompts";

export interface SimplifySentenceParams {
  originalPromptVi: string;
  originalEnglish: string;
  targetErrorPattern?: string;
  provider?: string;
  model?: string;
}

export interface SimplificationResult {
  simplifiedPromptVi: string;
  simplifiedEnglish: string;
  explanationVi: string;
  reductionReason: string;
}

function computeDeterministicSimplification(params: SimplifySentenceParams): SimplificationResult {
  const cleanEn = params.originalEnglish;
  const chunks = cleanEn
    .split(/[,;]|\bbecause\b|\balthough\b|\bso\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  let shortEn = chunks.find((c) => c.toLowerCase().startsWith("i ") || c.toLowerCase().startsWith("we ")) || chunks[0] || cleanEn;
  if (shortEn.length > 50 && chunks.length > 1) {
    shortEn = chunks[0];
  }

  const cleanVi = params.originalPromptVi;
  const viChunks = cleanVi
    .split(/[,;]|\bbởi vì\b|\bmặc dù\b|\bcho nên\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);
  const shortVi = viChunks[0] || cleanVi;

  const finalEn = shortEn.replace(/\.+$/, "") + ".";

  return {
    simplifiedPromptVi: shortVi,
    simplifiedEnglish: finalEn,
    explanationVi: "Đã rút gọn thành câu đơn ngắn để bạn tập trung vào cấu trúc ngữ pháp cốt lõi.",
    reductionReason: "Giảm tải nhận thức (Cognitive Load Reduction)",
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

export async function simplifySentence(
  params: SimplifySentenceParams
): Promise<SimplificationResult> {
  const provider = params.provider || "gemini";
  const model = params.model || "auto";

  if (provider === "mock") {
    return computeDeterministicSimplification(params);
  }

  const prompt = `Simplify this complex speaking sentence for a learner who is struggling after multiple retries:
- Original Vietnamese: "${params.originalPromptVi}"
- Original English: "${params.originalEnglish}"
- Target Pattern: "${params.targetErrorPattern || "core_grammar"}"

Create a clean, short (4-8 words) simplified pair. Return strict JSON.`;

  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: prompt }],
        systemInstruction: SIMPLIFICATION_SYSTEM,
        temperature: 0.3,
        maxOutputTokens: 500,
      },
    });

    const parsed = cleanJson(res.text);
    if (!parsed) throw new Error("Could not parse simplification JSON");

    const validated = simplificationResultSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error("Invalid simplification schema");
    }

    return validated.data as SimplificationResult;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[SimplificationService] Fallback to deterministic simplification:", err);
    }
    return computeDeterministicSimplification(params);
  }
}
