import type { SpeakingDimensions, TurnEvaluation } from "@/types/diagnostics";
import { analyzeFluency } from "./fluency-analyzer";
import { analyzeGrammar } from "./grammar-analyzer";
import { analyzeVocabulary } from "./vocabulary-analyzer";
import { analyzeNaturalness } from "./naturalness-analyzer";
import { analyzeResponseSpeed } from "./response-speed-analyzer";
import { analyzeCommunication } from "./communication-analyzer";
import { analyzeConfidence } from "./confidence-analyzer";
import { analyzePronunciation } from "./pronunciation-analyzer";
import { computeSessionMetrics } from "./deterministic-metrics";

export interface AggregatedResult {
  dimensions: SpeakingDimensions;
  completeness: "too_short" | "partial" | "sufficient" | "rich";
  turnEvaluations: TurnEvaluation[];
  bestTurnScore?: number;
  worstTurnScore?: number;
  variance: number;
}

export function aggregateSession(
  turns: Array<{ turnId: string; transcript: string; durationMs?: number; timeToFirstWordMs?: number; confidence?: number }>
): AggregatedResult {
  const flu = analyzeFluency(turns);
  const gram = analyzeGrammar(turns.map((t) => ({ turnId: t.turnId, transcript: t.transcript })));
  const vocab = analyzeVocabulary(turns.map((t) => ({ transcript: t.transcript })));
  const nat = analyzeNaturalness(turns.map((t) => ({ transcript: t.transcript })));
  const resp = analyzeResponseSpeed(turns.map((t) => ({ timeToFirstWordMs: t.timeToFirstWordMs })));
  const comm = analyzeCommunication(turns.map((t) => ({ transcript: t.transcript })));
  const conf = analyzeConfidence(turns.map((t) => ({ transcript: t.transcript, timeToFirstWordMs: t.timeToFirstWordMs })));
  const pron = analyzePronunciation(turns.map((t) => ({ transcript: t.transcript, confidence: t.confidence })), turns.some((t) => typeof t.confidence === "number"));

  const metrics = computeSessionMetrics(turns.map((t) => ({ transcript: t.transcript, durationMs: t.durationMs, timeToFirstWordMs: t.timeToFirstWordMs })));

  const dimensions: SpeakingDimensions = {
    fluency: flu.score,
    grammar: gram.score,
    vocabulary: vocab.score,
    naturalness: nat.score,
    responseSpeed: resp.score,
    pronunciation: pron.score, // -1 if not_available
    communication: comm.score,
    confidence: conf.score,
  };

  // Consistency variance proxy: std dev of flu+resp avg per turn
  const turnFluScores = turns.map((t) => analyzeFluency([{ transcript: t.transcript, durationMs: t.durationMs }]).score);
  const avg = turnFluScores.length ? turnFluScores.reduce((a, b) => a + b, 0) / turnFluScores.length : 0;
  const variance = turnFluScores.length ? Math.sqrt(turnFluScores.reduce((s, v) => s + (v - avg) ** 2, 0) / turnFluScores.length) : 0;
  const bestTurnScore = turnFluScores.length ? Math.max(...turnFluScores) : undefined;
  const worstTurnScore = turnFluScores.length ? Math.min(...turnFluScores) : undefined;

  return { dimensions, completeness: metrics.completeness, turnEvaluations: [], bestTurnScore, worstTurnScore, variance };
}

// AI-assisted refinement (2-4 calls grouped) — compact shared context
export function buildSharedContext(turns: Array<{ transcript: string }>, deterministic: ReturnType<typeof aggregateSession>): string {
  return JSON.stringify({
    deterministic,
    transcripts: turns.map((t) => t.transcript).slice(0, 8).join(" | ").slice(0, 800),
  });
}
