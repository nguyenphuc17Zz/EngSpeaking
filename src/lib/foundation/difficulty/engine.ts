// Deterministic difficulty engine
import type { FoundationExercise, FoundationEvaluation } from "@/types/foundation";
import { scalarToDims, adjustScalar, type DifficultyDims } from "./model";

export interface DifficultyDecision {
  currentDifficulty: number;
  nextDifficulty: number;
  dims: DifficultyDims;
  reason: string;
  classification: "too_easy" | "appropriate" | "too_hard";
}

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
  evaluation: FoundationEvaluation
): Promise<DifficultyDecision> {
  return syncDecide(exercise, evaluation);
}

export function decideNextDifficultySync(exercise: FoundationExercise, evaluation: FoundationEvaluation): DifficultyDecision {
  return syncDecide(exercise, evaluation);
}
