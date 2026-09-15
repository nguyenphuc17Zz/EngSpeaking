import { runDiagnosticsPipeline } from "../pipeline";
import { evaluationRepo } from "@/lib/db/sqlite-db";
import type { SpeakingEvaluation } from "@/types/diagnostics";
import { writeDimensionSnapshot } from "@/lib/progress/writers";

const CACHE = new Map<string, { evaluation: SpeakingEvaluation; snapshot: unknown; at: number }>();

const MAX_CACHE_SIZE = 100;
function evictIfNeeded() {
  if (CACHE.size > MAX_CACHE_SIZE) {
    const first = CACHE.keys().next().value as string | undefined;
    if (first) CACHE.delete(first);
  }
}

export async function evaluateSession(
  sessionId: string,
  turns: Array<{ turnId: string; transcript: string; rawText?: string; durationMs?: number; timeToFirstWordMs?: number; confidence?: number }>,
  opts?: { sessionType?: string; provider?: string; model?: string; force?: boolean; scenarioContext?: string; hasAudio?: boolean }
): Promise<{ evaluation: SpeakingEvaluation; snapshot: import("@/types/diagnostics").SpeakingDiagnosticSnapshot }> {
  const cacheKey = `${sessionId}_${opts?.provider || "gemini"}_${opts?.model || "auto"}`;
  const cached = CACHE.get(cacheKey);
  if (cached && !opts?.force && Date.now() - cached.at < 1000 * 60 * 30) {
    return cached as unknown as { evaluation: SpeakingEvaluation; snapshot: import("@/types/diagnostics").SpeakingDiagnosticSnapshot };
  }

  // Check DB cache
  if (!opts?.force) {
    const data = evaluationRepo.getBySession(sessionId);
    if (data && data.evaluator_version === "4.0.0") {
      const evaluation = data.evaluation as SpeakingEvaluation;
      const snapshot = data.snapshot as import("@/types/diagnostics").SpeakingDiagnosticSnapshot;
      CACHE.set(cacheKey, { evaluation, snapshot, at: Date.now() });
      return { evaluation, snapshot };
    }
  }

  const { evaluation, snapshot } = await runDiagnosticsPipeline(
    { sessionId, sessionType: opts?.sessionType, turns: turns.map((t) => ({ turnId: t.turnId, transcript: t.transcript, rawText: t.rawText, durationMs: t.durationMs, timeToFirstWordMs: t.timeToFirstWordMs, confidence: t.confidence })), scenarioContext: opts?.scenarioContext, hasAudio: opts?.hasAudio },
    { provider: opts?.provider, model: opts?.model }
  );

  // Persist to SQLite
  try {
    const evalId = (evaluation as unknown as { id?: string }).id || `eval_${Date.now()}_${Math.random().toString(36).slice(2, 4)}`;
    evaluationRepo.save({
      id: evalId,
      session_id: sessionId,
      session_type: opts?.sessionType || "unknown",
      overall_practice_score: evaluation.overallPracticeScore,
      dimensions: evaluation.dimensions,
      confidence: evaluation.confidence,
      completeness: evaluation.completeness,
      evaluation: evaluation,
      snapshot: snapshot,
      evaluator_version: evaluation.evaluatorVersion,
      schema_version: evaluation.schemaVersion,
      model: evaluation.model,
      provider: evaluation.provider,
      generated_at: evaluation.generatedAt,
    });
    // Write dimension snapshot for long-term analytics
    try { await writeDimensionSnapshot("default", evaluation.dimensions as unknown as Record<string, number>, evaluation.overallPracticeScore, evalId, sessionId); } catch {}
  } catch {}

  evictIfNeeded();
  CACHE.set(cacheKey, { evaluation, snapshot, at: Date.now() });
  return { evaluation, snapshot };
}

export function clearEvaluationCache(sessionId?: string) {
  if (sessionId) {
    for (const k of CACHE.keys()) if (k.startsWith(sessionId)) CACHE.delete(k);
  } else CACHE.clear();
}
