export interface DimensionHistoryPoint {
  capturedAt: string;
  overall: number;
  dimensions: Record<string, number>;
  evaluationId?: string;
  sessionId?: string;
}

export interface SkillHistoryPoint {
  capturedAt: string;
  skillId: string;
  mastery: number;
  confidence: number;
  retentionRisk?: number;
  trend?: string;
  practiceCount: number;
  sourceSessionId?: string;
}

export interface TrendResult {
  trend: "improving" | "strongly_improving" | "stable" | "declining" | "volatile" | "plateau" | "insufficient_data";
  confidence: "low" | "medium" | "high";
  slope?: number;
  variance?: number;
  smoothed: number[];
  raw: number[];
}

export interface LearningMilestone {
  id: string;
  type: string;
  title: string;
  description: string;
  achievedAt: string;
  evidenceSessionId?: string;
  skillIds?: string[];
  significance: "minor" | "major";
}

export interface ProgressReport {
  period: { start: string; end: string };
  headline: string;
  majorImprovements: Array<{ metric: string; change: string; evidenceCount: number; confidence: string }>;
  persistentChallenges: Array<{ metric: string; description: string }>;
  milestones: LearningMilestone[];
  strongestSkill?: string;
  weakestSkill?: string;
  mostImportantChange?: string;
  nextFocus?: string;
  confidence: number;
  generatedAt: string;
  reportVersion: string;
}

export interface ComparisonResult {
  periodA: { start: string; end: string; label: string; avg: Record<string, number> };
  periodB: { start: string; end: string; label: string; avg: Record<string, number> };
  deltas: Record<string, number>;
  status: "improved" | "declined" | "stable" | "not_comparable";
  evidence: string;
}
