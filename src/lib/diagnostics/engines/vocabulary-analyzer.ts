import { computeSessionMetrics } from "./deterministic-metrics";

export function analyzeVocabulary(turns: Array<{ transcript: string }>): { score: number; uniqueWordCount: number; lexicalDiversity: number; repetitionRate: number; genericWordCount: number; evidence: string[]; confidence: number } {
  const metrics = computeSessionMetrics(turns);
  const evidence: string[] = [];
  let score = 70;
  if (metrics.lexicalDiversity < 0.45) {
    score -= 15;
    evidence.push(`Lexical diversity low (${metrics.lexicalDiversity.toFixed(2)}) — repeated words`);
  } else if (metrics.lexicalDiversity > 0.7) {
    score += 10;
    evidence.push(`Lexical diversity high (${metrics.lexicalDiversity.toFixed(2)})`);
  }
  const genericRate = metrics.totalWords ? metrics.fillerTotal / metrics.totalWords : 0;
  // Use genericWordCount from computeSessionMetrics? already total filler; but we need generic
  // Approx via uniqueWordCount
  if (metrics.uniqueWords < 20 && metrics.totalWords > 40) {
    score -= 10;
    evidence.push(`Vocabulary repetition — ${metrics.uniqueWords} unique of ${metrics.totalWords} total`);
  }
  // Pseudo active vs passive
  if (metrics.totalWords > 80 && metrics.uniqueWords < 35) {
    evidence.push("High word count but low variety — possible active vocabulary gap vs passive knowledge");
  }
  score = Math.max(20, Math.min(95, score));
  return { score, uniqueWordCount: metrics.uniqueWords, lexicalDiversity: metrics.lexicalDiversity, repetitionRate: 0, genericWordCount: 0, evidence, confidence: 0.65 };
}
