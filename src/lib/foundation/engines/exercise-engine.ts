// FoundationExerciseEngine interface — Phase 5 will replace impl without rewriting callers §64
import type { FoundationExercise, FoundationSkill, FoundationExerciseType, FoundationLevel } from "@/types/foundation";

export interface GenerateExerciseParams {
  skill?: FoundationSkill;
  type?: FoundationExerciseType;
  difficulty?: number;
  level?: FoundationLevel;
  mode?: "learn" | "practice" | "challenge" | "daily";
  topic?: string;
  previousPerformance?: string;
  speechBank?: string[];
  translationDependency?: number;
}

export interface FoundationExerciseEngine {
  generate(params: GenerateExerciseParams, opts?: { provider?: string; model?: string }): Promise<FoundationExercise>;
  validate(ex: unknown): { ok: true; exercise: FoundationExercise } | { ok: false; error: string };
}
