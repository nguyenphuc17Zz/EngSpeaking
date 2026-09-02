// Deterministic + AI-assisted difficulty engine — isolated for Phase 5 replacement
import type { FoundationExercise, FoundationEvaluation } from "@/types/foundation";
import { scalarToDims, dimsToScalar, adjustScalar } from "./model";
import { generateTextWithRouting } from "@/lib/ai";
import { DIFFICULTY_SYSTEM, buildDifficultyPrompt } from "@/lib/foundation/prompts/difficulty-controller";
import type { DifficultyDecision } from "@/lib/foundation/engines/difficulty-engine";

function syncDecide(exercise: FoundationExercise, evaluation: FoundationEvaluation): DifficultyDecision {
  const current = exercise.difficulty;
  const cls = evaluation.classification;
  const delta = evaluation.suggestedDifficultyDelta ?? (cls === "too_easy" ? 1 : cls === "too_hard" ? -1 : 0);
  // Consider hints & ttfw for fine-tuning
  let adjusted = adjustScalar(current, cls, delta as -1 | 0 | 1);
  // If hintsUsed >=2, force -1 even if classified appropriate
  if ((evaluation.hintsUsed || 0) >= 2 && cls !== "too_easy") adjusted = Math.max(1, adjusted - 1);
  // If ttfw > 4000ms, reduce timePressure weight (next engine will reflect)
  const dims = scalarToDims(adjusted);
  // Reflect AI suggestion if provided but keep deterministic base
  return {
    currentDifficulty: current,
    nextDifficulty: adjusted,
    dims,
    reason: `From ${current} (${cls}, hints=${evaluation.hintsUsed}, ttfw=${evaluation.timeToFirstWordMs ?? "?"}) → ${adjusted}`,
    classification: cls,
  };
}

export async function decideNextDifficulty(
  exercise: FoundationExercise,
  evaluation: FoundationEvaluation,
  opts?: { provider?: string; model?: string; useAI?: boolean }
): Promise<DifficultyDecision> {
  const sync = syncDecide(exercise, evaluation);
  if (!opts?.useAI) return sync;

  const provider = opts.provider || "gemini";
  const model = opts.model || "auto";

  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: buildDifficultyPrompt(JSON.stringify(exercise), JSON.stringify(evaluation)) }],
        systemInstruction: DIFFICULTY_SYSTEM,
        temperature: 0.3,
        maxOutputTokens: 200,
      },
    });
    const t = res.text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
    let parsed: { classification?: string; nextDifficulty?: number; reason?: string } | null = null;
    try { parsed = JSON.parse(t); } catch {
      const m = t.match(/\{[\s\S]*\}/);
      if (m) try { parsed = JSON.parse(m[0]); } catch {}
    }
    if (parsed?.nextDifficulty && parsed.nextDifficulty >= 1 && parsed.nextDifficulty <= 10) {
      const nd = Math.max(1, Math.min(10, Math.round(parsed.nextDifficulty)));
      return { currentDifficulty: sync.currentDifficulty, nextDifficulty: nd, dims: scalarToDims(nd), reason: parsed.reason || sync.reason, classification: (parsed.classification as DifficultyDecision["classification"]) || sync.classification };
    }
  } catch {}
  return sync;
}

export function decideNextDifficultySync(exercise: FoundationExercise, evaluation: FoundationEvaluation): DifficultyDecision {
  return syncDecide(exercise, evaluation);
}
