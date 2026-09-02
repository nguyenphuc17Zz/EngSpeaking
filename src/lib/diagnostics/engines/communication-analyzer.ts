// Communication: clarity, relevance, completeness, coherence §22-24
export function analyzeCommunication(
  turns: Array<{ transcript: string; expectedMinWords?: number; exerciseInstruction?: string }>,
  scenarioContext?: string
): { score: number; completeness: number; elaboration: number; evidence: string[]; confidence: number } {
  let score = 70;
  const evidence: string[] = [];
  let shortAnswers = 0;
  let elaborated = 0;
  for (const t of turns) {
    const words = t.transcript.trim().split(/\s+/).filter(Boolean).length;
    const expected = t.expectedMinWords ?? (scenarioContext ? 8 : 5);
    if (words < expected && words > 0) shortAnswers++;
    if (words >= 12) elaborated++;
    // Relevance proxy: if transcript empty → incomplete
    if (!t.transcript.trim()) {
      score -= 8;
      evidence.push("Empty response — not answering");
    }
  }
  const shortRate = turns.length ? shortAnswers / turns.length : 0;
  if (shortRate > 0.5) {
    score -= 15;
    evidence.push(`Short answers ${shortAnswers}/${turns.length} — minimal response pattern §79`);
  } else if (shortRate > 0.2) {
    score -= 7;
    evidence.push(`Some short answers`);
  } else {
    evidence.push(`Most answers adequately long`);
  }
  const elaboration = turns.length ? elaborated / turns.length : 0;
  if (elaboration > 0.6) {
    score += 10;
    evidence.push(`Good elaboration — can extend answers`);
  } else if (elaboration < 0.2 && turns.length > 3) {
    score -= 8;
    evidence.push(`Limited elaboration — struggle to expand beyond basic answer §24`);
  }
  score = Math.max(20, Math.min(95, score));
  const completeness = Math.max(0, Math.min(100, 100 - shortRate * 60));
  return { score, completeness, elaboration: elaboration * 100, evidence, confidence: 0.65 };
}
