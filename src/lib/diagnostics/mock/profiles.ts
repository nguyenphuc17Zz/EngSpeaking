// Mock profiles §91 — synthetic, no real learner data
import type { SpeakingEvaluation } from "@/types/diagnostics";

function base(overrides: Partial<SpeakingEvaluation>): SpeakingEvaluation {
  return {
    sessionId: `mock_${Math.random().toString(36).slice(2, 6)}`,
    overallPracticeScore: 65,
    dimensions: { fluency: 60, grammar: 75, vocabulary: 70, naturalness: 60, responseSpeed: 45, pronunciation: 65, communication: 70, confidence: 55 },
    strengths: [],
    weaknesses: [],
    recurringPatterns: [],
    priorityBottlenecks: [],
    evidence: [],
    recommendations: [],
    confidence: { overall: "medium", score: 0.6 },
    completeness: "sufficient",
    generatedAt: new Date().toISOString(),
    evaluatorVersion: "4.0.0",
    schemaVersion: 1,
    ...overrides,
  } as SpeakingEvaluation;
}

export const MOCK_PROFILES: Record<string, { label: string; evaluation: SpeakingEvaluation }> = {
  A: { label: "Profile A — High grammar, low fluency", evaluation: base({ overallPracticeScore: 62, dimensions: { fluency: 35, grammar: 82, vocabulary: 75, naturalness: 60, responseSpeed: 40, pronunciation: 65, communication: 70, confidence: 45 } }) },
  B: { label: "Profile B — High fluency, low grammar", evaluation: base({ overallPracticeScore: 58, dimensions: { fluency: 78, grammar: 38, vocabulary: 65, naturalness: 55, responseSpeed: 72, pronunciation: 60, communication: 60, confidence: 65 } }) },
  C: { label: "Profile C — Good vocab, poor response speed", evaluation: base({ overallPracticeScore: 60, dimensions: { fluency: 50, grammar: 70, vocabulary: 80, naturalness: 65, responseSpeed: 28, pronunciation: 60, communication: 65, confidence: 50 } }) },
  D: { label: "Profile D — Short answers", evaluation: base({ overallPracticeScore: 55, dimensions: { fluency: 50, grammar: 65, vocabulary: 55, naturalness: 55, responseSpeed: 55, pronunciation: 60, communication: 40, confidence: 45 } }) },
  E: { label: "Profile E — Heavy self-correction", evaluation: base({ overallPracticeScore: 57, dimensions: { fluency: 42, grammar: 70, vocabulary: 65, naturalness: 50, responseSpeed: 38, pronunciation: 60, communication: 60, confidence: 35 } }) },
  F: { label: "Profile F — Fast but inaccurate", evaluation: base({ overallPracticeScore: 56, dimensions: { fluency: 80, grammar: 35, vocabulary: 60, naturalness: 50, responseSpeed: 85, pronunciation: 55, communication: 55, confidence: 70 } }) },
  G: { label: "Profile G — Topic-sensitive", evaluation: base({ overallPracticeScore: 64, dimensions: { fluency: 55, grammar: 72, vocabulary: 68, naturalness: 60, responseSpeed: 42, pronunciation: 62, communication: 65, confidence: 55 } }) },
  H: { label: "Profile H — Strong overall", evaluation: base({ overallPracticeScore: 84, dimensions: { fluency: 82, grammar: 85, vocabulary: 82, naturalness: 80, responseSpeed: 78, pronunciation: 80, communication: 84, confidence: 80 } }) },
};
