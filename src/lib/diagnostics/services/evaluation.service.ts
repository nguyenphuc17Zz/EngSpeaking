// Evaluation service with caching §85 and versioning §61-62
import { runDiagnosticsPipeline } from "../pipeline";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";
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

  // Check DB cache if Supabase configured and not force
  if (isSupabaseConfigured() && !opts?.force) {
    const supabase = createServerClient();
    if (supabase) {
      const { data } = await supabase.from("speaking_evaluations").select("*").eq("session_id", sessionId).order("generated_at", { ascending: false }).limit(1).single();
      if (data && data.evaluator_version === "4.0.0") {
        const evaluation = data.evaluation as SpeakingEvaluation;
        const snapshot = data.snapshot as import("@/types/diagnostics").SpeakingDiagnosticSnapshot;
        CACHE.set(cacheKey, { evaluation, snapshot, at: Date.now() });
        return { evaluation, snapshot };
      }
    }
  }

  const { evaluation, snapshot } = await runDiagnosticsPipeline(
    { sessionId, sessionType: opts?.sessionType, turns: turns.map((t) => ({ turnId: t.turnId, transcript: t.transcript, rawText: t.rawText, durationMs: t.durationMs, timeToFirstWordMs: t.timeToFirstWordMs, confidence: t.confidence })), scenarioContext: opts?.scenarioContext, hasAudio: opts?.hasAudio },
    { provider: opts?.provider, model: opts?.model }
  );

  // Persist
  if (isSupabaseConfigured()) {
    const supabase = createServerClient();
    if (supabase) {
      try {
        await supabase.from("speaking_evaluations").insert({
          id: `eval_${Date.now()}_${Math.random().toString(36).slice(2, 4)}`,
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
        // Batch inserts for performance §22
        const evalId = (evaluation as unknown as { id?: string }).id || `eval_${Date.now()}`;
        if (evaluation.turnEvaluations?.length) {
          await supabase.from("turn_evaluations").insert(evaluation.turnEvaluations.map((te) => ({ id: `te_${te.turnId}`, evaluation_id: evalId, turn_id: te.turnId, scores: te })));
        }
        if (evaluation.grammarIssues?.length) {
          await supabase.from("diagnostic_issues").insert(evaluation.grammarIssues.map((iss) => ({ id: iss.id, evaluation_id: evalId, category: iss.category, severity: iss.severity, recurrence_key: iss.recurrenceKey, evidence: iss.span || "", confidence: iss.evidenceConfidence })));
        }
        if (evaluation.recurringPatterns.length) {
          await supabase.from("diagnostic_patterns").insert(evaluation.recurringPatterns.map((pat) => ({ id: pat.id, evaluation_id: evalId, pattern_key: pat.patternKey, frequency: pat.frequency })));
        }
        if (evaluation.recommendations.length) {
          await supabase.from("speaking_recommendations").insert(evaluation.recommendations.map((rec) => ({ id: `rec_${Math.random().toString(36).slice(2, 6)}`, evaluation_id: evalId, skill: rec.skill, priority: rec.priority, reason: rec.reason, evidence_ids: rec.evidenceIds, suggested_exercise_types: rec.suggestedExerciseTypes, target_metric: rec.targetMetric })));
        }
        // Phase 8: also write dimension snapshot for long-term analytics
        try { await writeDimensionSnapshot("default", evaluation.dimensions as unknown as Record<string, number>, evaluation.overallPracticeScore, evaluation.sessionId, sessionId); } catch {}
      } catch {}
    }
  }

  evictIfNeeded();
  CACHE.set(cacheKey, { evaluation, snapshot, at: Date.now() });
  return { evaluation, snapshot };
}

export function clearEvaluationCache(sessionId?: string) {
  if (sessionId) {
    for (const k of CACHE.keys()) if (k.startsWith(sessionId)) CACHE.delete(k);
  } else CACHE.clear();
}
