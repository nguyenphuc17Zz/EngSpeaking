// Diagnostics domain types — Phase 4 §7-8, §34-39, §66
export type SpeakingDimension = "fluency" | "grammar" | "vocabulary" | "naturalness" | "responseSpeed" | "pronunciation" | "communication" | "confidence";

export interface SpeakingDimensions {
  fluency: number;
  grammar: number;
  vocabulary: number;
  naturalness: number;
  responseSpeed: number;
  pronunciation: number; // 0-100 or -1 for not_available
  communication: number;
  confidence: number;
}

export type EvaluationCompleteness = "too_short" | "partial" | "sufficient" | "rich";
export type ConfidenceLevel = "low" | "medium" | "high";
export type IssueSeverity = "minor" | "moderate" | "major";

export interface DiagnosticEvidence {
  id: string;
  turnId?: string;
  quote?: string;
  description: string;
  confidence: number; // 0-1
}

export interface DiagnosticStrength {
  id: string;
  category: string;
  description: string;
  evidence: string[];
  confidence: number;
}

export interface DiagnosticWeakness {
  id: string;
  category: string;
  severity: number; // 0-100
  frequency: number;
  impact: number; // 0-100 communication impact
  confidence: number; // 0-1
  evidence: string[];
  description: string;
  recurrenceKey?: string;
}

export interface GrammarIssue {
  id: string;
  span?: string;
  category: string; // e.g., tense, article, preposition
  severity: IssueSeverity;
  explanation: string;
  correction?: string;
  recurrenceKey?: string;
  evidenceConfidence: number;
}

export interface DiagnosticPattern {
  id: string;
  patternKey: string; // e.g., past_tense_verb_form, slow_response_under_pressure
  description: string;
  frequency: number;
  evidence: string[];
  confidence: number;
}

export interface Bottleneck {
  id: string;
  category: string;
  priority: number; // 0-100
  reason: string;
  severity: number;
  recurrence: number;
  impact: number;
  confidence: number;
}

export interface Recommendation {
  skill: string;
  priority: "high" | "medium" | "low";
  reason: string;
  evidenceIds: string[];
  suggestedExerciseTypes: string[];
  targetMetric?: string;
}

export interface TurnEvaluation {
  turnId: string;
  responseSpeed?: number;
  fluency?: number;
  grammar?: number;
  vocabulary?: number;
  naturalness?: number;
  communication?: number;
  confidenceIndicators?: number;
  pronunciation?: number;
  issues: Array<{ category: string; severity: IssueSeverity; evidence: string }>;
  isShortAnswer?: boolean;
  fillerCount?: number;
}

export interface SpeakingEvaluation {
  sessionId: string;
  sessionType?: string; // sessions | conversation_worlds | foundation_sessions
  overallPracticeScore: number;
  dimensions: SpeakingDimensions;
  strengths: DiagnosticStrength[];
  weaknesses: DiagnosticWeakness[];
  recurringPatterns: DiagnosticPattern[];
  priorityBottlenecks: Bottleneck[]; // primary + secondary
  evidence: DiagnosticEvidence[];
  recommendations: Recommendation[];
  confidence: EvaluationConfidence;
  completeness: EvaluationCompleteness;
  turnEvaluations?: TurnEvaluation[];
  grammarIssues?: GrammarIssue[];
  generatedAt: string;
  evaluatorVersion: string;
  schemaVersion: number;
  promptVersion?: string;
  model?: string;
  provider?: string;
}

export interface EvaluationConfidence {
  overall: ConfidenceLevel;
  score: number; // 0-1
  reason?: string;
}

export interface SpeakingDiagnosticSnapshot {
  topStrengths: string[];
  topWeaknesses: string[];
  primaryBottleneck?: string;
  secondaryBottleneck?: string;
  dimensions: SpeakingDimensions;
  recurringPatterns: string[];
  recommendedSkills: string[];
  evidenceConfidence: number;
  generatedAt: string;
}

export interface AnalyzerResult<T> {
  data: T;
  confidence: number; // 0-1
  evidence: DiagnosticEvidence[];
}
