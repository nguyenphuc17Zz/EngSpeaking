// Observable confidence indicators §25-27 — not psychological claim

export function analyzeConfidence(turns: Array<{ transcript: string; timeToFirstWordMs?: number }>): {
  score: number;
  selfCorrectionCount: number;
  hesitationCount: number;
  fillerCount: number;
  evidence: string[];
  confidence: number;
} {
  let selfCorrections = 0;
  let hesitations = 0;
  let fillerCount = 0;
  const evidence: string[] = [];

  for (const t of turns) {
    const txt = t.transcript.toLowerCase();
    // self-correction patterns
    if (txt.includes("no,") || txt.includes("i mean") || txt.includes("actually") || txt.match(/\bno\s+\.{3}/)) selfCorrections++;
    if (txt.includes("...") || txt.match(/\b(um|uh)\b/)) hesitations++;
    fillerCount += (txt.match(/\b(um|uh|you know|well actually)\b/g) || []).length;
    if ((t.timeToFirstWordMs ?? 0) > 3000) hesitations++;
  }

  let score = 70;
  if (selfCorrections > turns.length * 0.6) {
    score -= 15;
    evidence.push(`Heavy self-correction ${selfCorrections}/${turns.length} — over-monitoring §26`);
  } else if (selfCorrections > 0) {
    evidence.push(`Healthy self-correction ${selfCorrections} — positive`);
    score += 3;
  }
  if (hesitations > turns.length * 0.5) {
    score -= 12;
    evidence.push(`Frequent hesitation ${hesitations}/${turns.length}`);
  }
  if (fillerCount > turns.length * 2) {
    score -= 10;
    evidence.push(`Excessive filler ${fillerCount}`);
  }

  // Average pause proxy via TTFW
  score = Math.max(15, Math.min(90, score));
  return { score, selfCorrectionCount: selfCorrections, hesitationCount: hesitations, fillerCount, evidence, confidence: 0.6 };
}
