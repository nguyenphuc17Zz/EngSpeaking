// Hint service — progressive 0-4 §56, compact
import { generateTextWithRouting } from "@/lib/ai";
import { HINT_SYSTEM, buildHintUserPrompt } from "@/lib/foundation/prompts/hint-generator";
import type { FoundationExercise } from "@/types/foundation";

function mockHint(exercise: FoundationExercise, hintLevel: number): { hint: string; level: number; type: string } {
  const level = Math.max(0, Math.min(4, hintLevel));
  const prompts: Record<number, string> = {
    0: "Hãy thử tự nói trước, không cần gợi ý.",
    1: exercise.prompt ? `Gợi ý ý tưởng: Nghĩ về ${exercise.skill.replace(/_/g, " ")} cho chủ đề "${exercise.topic || "daily life"}"` : "Gợi ý: Nghĩ về một trải nghiệm cá nhân liên quan.",
    2: "Bắt đầu bằng: 'I think...' hoặc 'In my experience...'.",
    3: exercise.prompt ? `Một nửa câu: "${exercise.prompt.slice(0, 30)}... — because..."` : "Thử nói: 'I usually... because...'",
    4: exercise.prompt ? `Mẫu: "I usually go to the gym in the morning because it's less crowded." — hãy nói theo ý bạn.` : "Mẫu đầy đủ: 'I went to the park yesterday with my friends and we had a great time.'",
  };
  return { hint: prompts[level] || prompts[1], level, type: ["none", "conceptual", "starter", "partial", "full"][level] };
}

function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(t); } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(m[0]); } catch {}
    return null;
  }
}

export async function getHint(
  exercise: FoundationExercise,
  opts: { transcript?: string; hintLevel: number; attemptsCount?: number; provider?: string; model?: string }
): Promise<{ hint: string; level: number; type: string }> {
  const provider = opts.provider || "gemini";
  const model = opts.model || "auto";
  if (provider === "mock") return mockHint(exercise, opts.hintLevel);

  const userPrompt = buildHintUserPrompt({
    exerciseJson: JSON.stringify(exercise),
    transcript: opts.transcript,
    hintLevel: opts.hintLevel,
    attemptsCount: opts.attemptsCount,
  });

  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: userPrompt }],
        systemInstruction: HINT_SYSTEM,
        temperature: 0.5,
        maxOutputTokens: 300,
      },
    });
    const parsed = extractJson(res.text) as { hint?: string; level?: number; type?: string } | null;
    if (parsed?.hint) return { hint: parsed.hint, level: parsed.level ?? opts.hintLevel, type: parsed.type || "conceptual" };
    throw new Error("Invalid hint JSON");
  } catch {
    return mockHint(exercise, opts.hintLevel);
  }
}

export { mockHint };
