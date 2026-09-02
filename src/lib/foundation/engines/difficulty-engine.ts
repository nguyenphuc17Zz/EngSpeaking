// FoundationDifficultyEngine — deterministic + AI-assisted §42-43, replacable by AI Curriculum Phase 5
import type { FoundationExercise, FoundationEvaluation } from "@/types/foundation";
import type { DifficultyDims } from "../difficulty/model";

export interface DifficultyDecision {
  currentDifficulty: number;
  nextDifficulty: number;
  dims: DifficultyDims;
  reason: string;
  classification: "too_easy" | "appropriate" | "too_hard";
}

export interface FoundationDifficultyEngine {
  decideNext(exercise: FoundationExercise, evaluation: FoundationEvaluation): Promise<DifficultyDecision>;
  // sync helper for non-AI path
  decideNextSync(exercise: FoundationExercise, evaluation: FoundationEvaluation): DifficultyDecision;
}
