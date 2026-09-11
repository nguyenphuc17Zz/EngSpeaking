// Function 5 — Personal Error Bank Domain Types
// Longitudinal memory layer & deep error pattern analytics

export type MainErrorCategory = "grammar" | "vocabulary" | "pronunciation" | "fluency";

export type SubErrorCategory =
  | "grammar_past_tense"
  | "grammar_conditionals"
  | "grammar_articles"
  | "grammar_prepositions"
  | "grammar_subject_verb"
  | "grammar_word_order"
  | "vocabulary_collocation"
  | "vocabulary_phrasal_verb"
  | "vocabulary_word_choice"
  | "vocabulary_register"
  | "pronunciation_word_stress"
  | "pronunciation_ending_sound"
  | "pronunciation_linking"
  | "pronunciation_vowel"
  | "fluency_retrieval_delay"
  | "fluency_excessive_fillers"
  | "fluency_long_pauses"
  | "naturalness_direct_translation"
  | "repair_freezing";

export type ErrorSeverity = "minor" | "moderate" | "major" | "critical";

export type ErrorStatus =
  | "new"
  | "active"
  | "persistent"
  | "recovering"
  | "stable"
  | "mastered";

export type ErrorTrend = "improving" | "stable" | "worsening" | "insufficient_data";

export type GapType = "knowledge_gap" | "retrieval_gap" | "production_gap" | "pronunciation_gap";

export interface ErrorExample {
  id: string;
  userText: string;
  correction: string;
  contextSentence?: string;
  sourceModule: "sentence_builder" | "vn_to_en" | "retry_lab" | "latency" | "shadowing" | "conversation";
  responseLatencyMs?: number;
  wasSelfCorrected?: boolean;
  wasRetried?: boolean;
  retrySucceeded?: boolean;
  timestamp: string;
}

export type FossilizationLevel = "emerging" | "habitual" | "fossilized";

export type L1InterferenceType =
  | "tense_drop"
  | "ending_sound_omission"
  | "copula_drop"
  | "collocation_calque"
  | "preposition_calque"
  | "plural_drop"
  | "filler_transfer";

export interface MasterErrorRecord {
  id: string;
  patternKey: string; // e.g. "past_simple_base_form"
  canonicalName: string; // e.g. "Past Simple base form used instead of V2/ed"
  category: MainErrorCategory;
  subCategory?: SubErrorCategory;
  labelVi: string; // e.g. "Động từ quá khứ đơn (went / saw / bought)"
  descriptionVi: string;
  severity: ErrorSeverity;
  gapType: GapType; // knowledge vs retrieval vs production

  // Quantitative Metrics
  frequency: number; // total occurrences
  recentFrequency: number; // occurrences in last 7 days
  firstAttemptFailures: number;
  firstAttemptSuccesses: number;
  totalAttempts: number;
  accuracy: number; // %

  // Recovery & Spoken Repair
  retryTriggeredCount: number;
  retrySuccessCount: number;
  recoveryRate: number; // %
  selfCorrectionCount: number;

  // Latency & Hesitation
  averageLatencyMs: number;
  latencyWhenWrongMs: number;
  latencyWhenCorrectMs: number;

  // Longitudinal Lifecycle & Spaced Review
  status: ErrorStatus;
  trend: ErrorTrend;
  confidenceScore: number; // 0.0 - 1.0 (low confidence if possible STT artifact)
  falsePositiveCount: number; // times user marked as false positive
  userFlaggedAsFalsePositive: boolean;

  firstSeenAt: string;
  lastSeenAt: string;
  nextReviewDueAt?: string; // Spaced review interval
  reviewStage: number; // 0 -> 1 (10m) -> 2 (1d) -> 3 (3d) -> 4 (7d) -> 5 (14d) -> 6 (30d)

  // 1. FSRS Spaced Repetition (DSR Model)
  fsrsStability: number; // Days memory is stable (R >= 90%)
  fsrsDifficulty: number; // 1.0 (easiest) to 10.0 (hardest)
  retrievability: number; // Current retention probability % (0 - 100)
  lastReviewAt?: string;

  // 2. Bayesian Knowledge Tracing (BKT)
  pMastery: number; // Probability of mastery (0.0 to 1.0)
  isSlip?: boolean; // Last mistake was classified as a slip under fluency pressure

  // 3. L1 Vietnamese Interference & Fossilization Index
  fossilizationScore: number; // 0 to 100
  fossilizationLevel: FossilizationLevel;
  l1InterferenceType?: L1InterferenceType;

  examples: ErrorExample[];
  priorityScore: number; // Calculated dynamically for curriculum ranking
}

export interface CompactErrorContextPack {
  topWeaknesses: Array<{
    patternKey: string;
    labelVi: string;
    category: MainErrorCategory;
    accuracy: number;
    recoveryRate: number;
    averageLatencyMs: number;
    gapType: GapType;
  }>;
  reviewDueList: Array<{
    patternKey: string;
    labelVi: string;
    nextReviewDueAt: string;
  }>;
  overallRecoveryRate: number;
  totalActiveErrors: number;
}

export interface SpokenDiagnosticReport {
  id: string;
  generatedAt: string;
  primaryBottleneckVi: string;
  retrievalVsKnowledgeRatio: {
    retrievalGapPercent: number;
    knowledgeGapPercent: number;
    explanationVi: string;
  };
  l1InterferencePatterns: Array<{
    vietnameseHabit: string;
    naturalEnglishAlternative: string;
    explanationVi: string;
  }>;
  prescriptions: Array<{
    id: string;
    titleVi: string;
    actionDescriptionVi: string;
    targetModule: "retry_lab" | "latency" | "sentence_builder" | "vn_to_en";
    dailyMinutes: number;
  }>;
  motivationalQuoteVi: string;
}
