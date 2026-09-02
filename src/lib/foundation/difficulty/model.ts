// Deterministic difficulty model §41 — 8 dims → scalar 1-10
export interface DifficultyDims {
  sentenceLength: number; // 1-10 short→long sentences
  vocabularyDifficulty: number; // 1-10 common→abstract
  grammarComplexity: number; // 1-10 simple→hypothetical
  timePressure: number; // 1-10 no timer→3s
  numberOfConstraints: number; // 1-10 0→3 constraints
  abstraction: number; // 1-10 concrete→abstract topic
  topicFamiliarity: number; // 10=very familiar, 1=unfamiliar (inverted for scalar)
  hintAvailability: number; // 10=many hints, 1=no hints (inverted)
}

export function dimsToScalar(d: DifficultyDims): number {
  // Weighted average, hint & familiarity inverted weight
  const familiarityScore = 11 - d.topicFamiliarity;
  const hintScore = 11 - d.hintAvailability;
  const avg =
    d.sentenceLength * 0.15 +
    d.vocabularyDifficulty * 0.15 +
    d.grammarComplexity * 0.15 +
    d.timePressure * 0.15 +
    d.numberOfConstraints * 0.1 +
    d.abstraction * 0.1 +
    familiarityScore * 0.1 +
    hintScore * 0.1;
  return Math.max(1, Math.min(10, Math.round(avg)));
}

export function scalarToDims(scalar: number): DifficultyDims {
  const s = Math.max(1, Math.min(10, scalar));
  return {
    sentenceLength: s,
    vocabularyDifficulty: s,
    grammarComplexity: Math.max(1, Math.min(10, s + (s > 7 ? 1 : 0))),
    timePressure: Math.max(1, Math.min(10, s > 5 ? s : Math.max(1, s - 1))),
    numberOfConstraints: Math.max(1, Math.min(10, s > 6 ? s - 2 : 1)),
    abstraction: Math.max(1, Math.min(10, s)),
    topicFamiliarity: Math.max(1, Math.min(10, 11 - s + 2)), // higher at low difficulty
    hintAvailability: Math.max(1, Math.min(10, 11 - s + 3)),
  };
}

export function adjustScalar(
  current: number,
  classification: "too_easy" | "appropriate" | "too_hard",
  deltaHint: -1 | 0 | 1 = 0
): number {
  let delta = 0;
  if (classification === "too_easy") delta = 1;
  else if (classification === "too_hard") delta = -1;
  else delta = deltaHint;
  return Math.max(1, Math.min(10, current + delta));
}

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Rất dễ",
  2: "Dễ",
  3: "Dễ+",
  4: "Trung bình-",
  5: "Trung bình",
  6: "Trung bình+",
  7: "Khó-",
  8: "Khó",
  9: "Khó+",
  10: "Rất khó",
};

export function getDifficultyLabel(n: number): string {
  return DIFFICULTY_LABELS[Math.round(n)] || `Level ${n}`;
}
