import type { Bottleneck, DiagnosticWeakness } from "@/types/diagnostics";
import type { SpeakingDimensions } from "@/types/diagnostics";

// Weighted priority: severity × recurrence × impact × confidence (§35)
function priorityScore(w: { severity: number; frequency: number; impact: number; confidence: number; category: string }): number {
  const recurrenceNorm = Math.min(100, w.frequency * 25); // 1→25, 4→100
  const raw = w.severity * 0.3 + recurrenceNorm * 0.25 + w.impact * 0.25 + w.confidence * 100 * 0.2;
  // Boost for communication-critical categories
  const boost = ["responseSpeed", "fluency", "communication"].includes(w.category) ? 8 : 0;
  return Math.max(0, Math.min(100, Math.round(raw + boost)));
}

export function detectBottlenecks(
  dimensions: SpeakingDimensions,
  weaknesses: DiagnosticWeakness[],
  patterns: Array<{ patternKey: string; frequency: number }>
): Bottleneck[] {
  if (weaknesses.length === 0) {
    // Fallback to lowest dimension
    const entries = Object.entries(dimensions).filter(([k, v]) => k !== "pronunciation" || v !== -1) as Array<[keyof SpeakingDimensions, number]>;
    entries.sort((a, b) => a[1] - b[1]);
    const lowest = entries[0];
    if (!lowest) return [];
    const cat = lowest[0];
    return [
      {
        id: `bn_${cat}`,
        category: cat,
        priority: 65,
        reason: `Lowest dimension ${cat} (${lowest[1]}/100) — primary bottleneck`,
        severity: 100 - lowest[1],
        recurrence: 50,
        impact: 70,
        confidence: 0.6,
      },
    ];
  }

  const scored = weaknesses.map((w) => ({
    w,
    priority: priorityScore({ severity: w.severity, frequency: w.frequency, impact: w.impact, confidence: w.confidence, category: w.category }),
  }));
  scored.sort((a, b) => b.priority - a.priority);

  return scored.slice(0, 2).map((s, i) => ({
    id: `bn_${s.w.category}_${i}`,
    category: s.w.category,
    priority: s.priority,
    reason: `${s.w.description} — impact ${s.w.impact}, recurrence ${s.w.frequency}`,
    severity: s.w.severity,
    recurrence: Math.min(100, s.w.frequency * 25),
    impact: s.w.impact,
    confidence: s.w.confidence,
  }));
}

export function buildWeaknessesFromDimensions(dimensions: SpeakingDimensions, evidenceMap: Map<string, string[]>): DiagnosticWeakness[] {
  const weaknesses: DiagnosticWeakness[] = [];
  for (const [dim, score] of Object.entries(dimensions)) {
    if (dim === "pronunciation" && score === -1) continue;
    if (score < 55) {
      const severity = 100 - score;
      const impact = dim === "communication" || dim === "responseSpeed" || dim === "fluency" ? 75 : 50;
      weaknesses.push({
        id: `weak_${dim}`,
        category: dim,
        severity,
        frequency: 1,
        impact,
        confidence: 0.65,
        evidence: evidenceMap.get(dim) || [],
        description: `${dim} low (${score}/100)`,
      });
    }
  }
  return weaknesses;
}
