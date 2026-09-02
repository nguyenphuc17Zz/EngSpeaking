import { computeSessionMetrics } from "./deterministic-metrics";

export function analyzeResponseSpeed(turns: Array<{ timeToFirstWordMs?: number }>): { score: number; stats: { avg?: number; median?: number; p90?: number; max?: number }; evidence: string[]; confidence: number } {
  const metrics = computeSessionMetrics(turns.map((t) => ({ transcript: "x", timeToFirstWordMs: t.timeToFirstWordMs } as never)));
  // Use actual ttfw array
  const ttfws = turns.map((t) => t.timeToFirstWordMs).filter((v): v is number => typeof v === "number");
  const stats = metrics.ttfw;
  let score = 70;
  const evidence: string[] = [];
  if (stats.avg != null) {
    if (stats.avg < 1200) { score += 15; evidence.push(`Fast average response ${Math.round(stats.avg)}ms`); }
    else if (stats.avg < 2000) { score += 5; evidence.push(`Good average ${Math.round(stats.avg)}ms`); }
    else if (stats.avg < 3500) { score -= 10; evidence.push(`Slow average ${Math.round(stats.avg)}ms`); }
    else { score -= 20; evidence.push(`Very slow average ${Math.round(stats.avg)}ms — retrieval delay`); }
  } else {
    evidence.push("No timing data");
  }
  if (stats.p90 != null && stats.p90 > 5000) {
    score -= 10;
    evidence.push(`p90 ${Math.round(stats.p90)}ms — some responses very delayed`);
  }
  score = Math.max(15, Math.min(95, score));
  return { score, stats, evidence, confidence: ttfws.length ? 0.75 : 0.3 };
}
