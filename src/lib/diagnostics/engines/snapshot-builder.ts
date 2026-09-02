import type { SpeakingDiagnosticSnapshot, SpeakingEvaluation } from "@/types/diagnostics";

export function buildSnapshot(evaluation: SpeakingEvaluation): SpeakingDiagnosticSnapshot {
  return {
    topStrengths: evaluation.strengths.slice(0, 3).map((s) => s.category),
    topWeaknesses: evaluation.weaknesses.slice(0, 3).map((w) => w.category),
    primaryBottleneck: evaluation.priorityBottlenecks[0]?.category,
    secondaryBottleneck: evaluation.priorityBottlenecks[1]?.category,
    dimensions: evaluation.dimensions,
    recurringPatterns: evaluation.recurringPatterns.map((p) => p.patternKey),
    recommendedSkills: evaluation.recommendations.map((r) => r.skill),
    evidenceConfidence: evaluation.confidence.score,
    generatedAt: evaluation.generatedAt,
  };
}
