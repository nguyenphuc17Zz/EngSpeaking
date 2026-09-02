import type { DiagnosticPattern, GrammarIssue } from "@/types/diagnostics";

export function detectRecurringPatterns(
  grammarIssues: GrammarIssue[],
  turns: Array<{ transcript: string; timeToFirstWordMs?: number }>,
  dimensions: Record<string, number>
): DiagnosticPattern[] {
  const patterns: DiagnosticPattern[] = [];
  // Aggregate grammar by recurrenceKey
  const byKey = new Map<string, number>();
  const keyExamples = new Map<string, string[]>();
  for (const g of grammarIssues) {
    if (!g.recurrenceKey) continue;
    byKey.set(g.recurrenceKey, (byKey.get(g.recurrenceKey) || 0) + 1);
    if (!keyExamples.has(g.recurrenceKey)) keyExamples.set(g.recurrenceKey, []);
    if (g.span) keyExamples.get(g.recurrenceKey)!.push(g.span);
  }
  for (const [key, count] of byKey) {
    if (count >= 2) {
      patterns.push({
        id: `pat_${key}`,
        patternKey: key,
        description: `Recurring: ${key.replace(/_/g, " ")} (${count} occurrences)`,
        frequency: count,
        evidence: (keyExamples.get(key) || []).slice(0, 3),
        confidence: 0.75,
      });
    }
  }

  // Topic sensitivity proxy: if dimensions grammar high but responseSpeed low → production_automaticity_gap §76
  if ((dimensions.grammar || 0) > 70 && (dimensions.vocabulary || 0) > 65 && (dimensions.responseSpeed || 0) < 45 && (dimensions.fluency || 0) < 50) {
    patterns.push({
      id: "pat_production_gap",
      patternKey: "production_automaticity_gap",
      description: "High grammar/vocab knowledge but low fluency/response speed — production automaticity gap",
      frequency: 1,
      evidence: ["grammar high, responseSpeed low"],
      confidence: 0.65,
    });
  }

  // Over-monitoring §77
  if ((dimensions.grammar || 0) > 75 && (dimensions.responseSpeed || 0) < 45) {
    const ttfws = turns.map((t) => t.timeToFirstWordMs).filter((v): v is number => typeof v === "number");
    const avgTtfw = ttfws.length ? ttfws.reduce((a, b) => a + b, 0) / ttfws.length : 0;
    if (avgTtfw > 2500) {
      patterns.push({
        id: "pat_over_monitoring",
        patternKey: "over_monitoring_or_retrieval_delay",
        description: "Accurate but hesitant — signs of heavy self-monitoring or slow retrieval (TTFW high)",
        frequency: 1,
        evidence: [`avg TTFW ${Math.round(avgTtfw)}ms`],
        confidence: 0.6,
      });
    }
  }

  // Fast but inaccurate §78
  if ((dimensions.responseSpeed || 0) > 75 && (dimensions.grammar || 0) < 50) {
    patterns.push({
      id: "pat_fast_inaccurate",
      patternKey: "fast_but_inaccurate",
      description: "Fast response but low grammar accuracy — need accuracy under speed",
      frequency: 1,
      evidence: [],
      confidence: 0.6,
    });
  }

  // Short answer §79
  const shortRate = turns.filter((t) => t.transcript.trim().split(/\s+/).filter(Boolean).length <= 3).length / Math.max(1, turns.length);
  if (shortRate > 0.5) {
    patterns.push({
      id: "pat_short_answer",
      patternKey: "short_answer_speaker",
      description: `Short answers ${Math.round(shortRate * 100)}% — correct but minimal`,
      frequency: Math.round(shortRate * turns.length),
      evidence: [],
      confidence: 0.7,
    });
  }

  return patterns;
}
