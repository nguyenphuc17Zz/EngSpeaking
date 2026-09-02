import type { TurnEvaluation } from "@/types/diagnostics";
import { analyzeFluency } from "./fluency-analyzer";
import { analyzeGrammar } from "./grammar-analyzer";
import { analyzeResponseSpeed } from "./response-speed-analyzer";
import { analyzeConfidence } from "./confidence-analyzer";

export function buildTurnEvaluations(
  turns: Array<{ turnId: string; transcript: string; durationMs?: number; timeToFirstWordMs?: number }>
): TurnEvaluation[] {
  return turns.map((t) => {
    const flu = analyzeFluency([{ transcript: t.transcript, durationMs: t.durationMs, timeToFirstWordMs: t.timeToFirstWordMs }]);
    const gram = analyzeGrammar([{ turnId: t.turnId, transcript: t.transcript }]);
    const resp = analyzeResponseSpeed([{ timeToFirstWordMs: t.timeToFirstWordMs }]);
    const conf = analyzeConfidence([{ transcript: t.transcript, timeToFirstWordMs: t.timeToFirstWordMs }]);
    const issues = gram.issues.slice(0, 2).map((g) => ({ category: g.category, severity: g.severity, evidence: g.span || g.explanation }));
    return {
      turnId: t.turnId,
      responseSpeed: resp.score,
      fluency: flu.score,
      grammar: gram.score,
      vocabulary: 65, // placeholder, session vocab more meaningful
      naturalness: 65,
      communication: t.transcript.trim().split(/\s+/).length <= 2 ? 40 : 70,
      confidenceIndicators: conf.score,
      issues,
      isShortAnswer: t.transcript.trim().split(/\s+/).filter(Boolean).length <= 3,
      fillerCount: flu.metrics.fillerRate > 0 ? Math.round(flu.metrics.fillerRate * 100) : 0,
    };
  });
}
