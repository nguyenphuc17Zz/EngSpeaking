// FoundationEvaluationEngine — keep thin context per §55, anti-hallucination §58
import type { FoundationExercise, FoundationEvaluation } from "@/types/foundation";

export interface EvaluateParams {
  exercise: FoundationExercise;
  transcript: string;
  rawTranscript?: string;
  durationMs?: number;
  timeToFirstWordMs?: number;
  hintsUsed?: number;
  hintLevel?: number;
}

export interface FoundationEvaluationEngine {
  evaluate(params: EvaluateParams, opts?: { provider?: string; model?: string }): Promise<FoundationEvaluation>;
}
