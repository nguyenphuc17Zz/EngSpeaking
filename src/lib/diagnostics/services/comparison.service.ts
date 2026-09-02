import type { SpeakingEvaluation } from "@/types/diagnostics";

export interface ComparisonResult {
  improvedDimensions: string[];
  declinedDimensions: string[];
  stableDimensions: string[];
  newProblems: string[];
  resolvedProblems: string[];
  overallDelta: number;
}

export function compareEvaluations(previous: SpeakingEvaluation, current: SpeakingEvaluation): ComparisonResult {
  const dims = ["fluency", "grammar", "vocabulary", "naturalness", "responseSpeed", "pronunciation", "communication", "confidence"] as const;
  const improved: string[] = [];
  const declined: string[] = [];
  const stable: string[] = [];
  for (const d of dims) {
    const prev = (previous.dimensions as unknown as Record<string, number>)[d];
    const cur = (current.dimensions as unknown as Record<string, number>)[d];
    if (prev === -1 || cur === -1) continue;
    const delta = cur - prev;
    if (delta >= 7) improved.push(d);
    else if (delta <= -7) declined.push(d);
    else stable.push(d);
  }
  const prevPatterns = new Set(previous.recurringPatterns.map((p) => p.patternKey));
  const curPatterns = new Set(current.recurringPatterns.map((p) => p.patternKey));
  const newProblems = [...curPatterns].filter((p) => !prevPatterns.has(p));
  const resolvedProblems = [...prevPatterns].filter((p) => !curPatterns.has(p));

  return {
    improvedDimensions: improved,
    declinedDimensions: declined,
    stableDimensions: stable,
    newProblems,
    resolvedProblems,
    overallDelta: current.overallPracticeScore - previous.overallPracticeScore,
  };
}
