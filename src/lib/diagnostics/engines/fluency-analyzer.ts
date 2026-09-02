import { computeSessionMetrics } from "./deterministic-metrics";

export function analyzeFluency(turns: Array<{ transcript: string; durationMs?: number; timeToFirstWordMs?: number }>): { score: number; metrics: { avgWpm?: number; fillerRate: number; longPauseCount: number }; evidence: string[]; confidence: number } {
  const metrics = computeSessionMetrics(turns);
  const evidence: string[] = [];
  let score = 70;
  // Filler rate
  const fillerRate = metrics.totalWords ? metrics.fillerTotal / metrics.totalWords : 0;
  if (fillerRate > 0.08) {
    score -= 15;
    evidence.push(`Filler rate high (${(fillerRate * 100).toFixed(1)}% — ${metrics.fillerTotal} fillers)`);
  } else if (fillerRate > 0.03) {
    score -= 5;
    evidence.push(`Filler rate moderate`);
  } else {
    score += 5;
    evidence.push(`Filler usage low`);
  }
  // Pause via duration vs word count (proxy)
  const avgWpm = metrics.totalWords && metrics.durationStats.avgDurationMs ? Math.round((metrics.totalWords / (metrics.durationStats.avgDurationMs / 60000)) / Math.max(1, metrics.totalTurns)) : undefined;
  if (avgWpm != null) {
    if (avgWpm < 60) {
      score -= 10;
      evidence.push(`Speaking rate slow (~${avgWpm} wpm) — possible pauses/hesitation`);
    } else if (avgWpm > 90 && avgWpm < 160) {
      score += 8;
      evidence.push(`Natural speaking rate (~${avgWpm} wpm)`);
    }
  }
  // Long pauses proxy: if ttfw high
  if (metrics.ttfw.avg != null && metrics.ttfw.avg > 2500) {
    score -= 10;
    evidence.push(`Average time to start speaking ${Math.round(metrics.ttfw.avg)}ms — hesitation`);
  }
  // Restarts proxy: repeated phrases
  const restarts = turns.filter((t) => t.transcript.includes("...") || t.transcript.includes("no, I mean")).length;
  if (restarts) {
    score -= restarts * 4;
    evidence.push(`${restarts} restart(s) detected`);
  }
  score = Math.max(20, Math.min(95, score));
  return { score, metrics: { avgWpm, fillerRate, longPauseCount: metrics.ttfw.p90 != null && metrics.ttfw.p90 > 4000 ? 1 : 0 }, evidence, confidence: 0.7 };
}
