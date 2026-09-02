// Function 3 — Retry Loop: Correct -> Say Again Domain Types
// Shared Universal Spoken Repair Architecture

export type RetryFSMState =
  | "idle"
  | "initial_evaluating"
  | "correction_presented"
  | "model_listening"
  | "retry_recording"
  | "retry_evaluating"
  | "repair_success"
  | "repair_failed"
  | "simplified_mode"
  | "completed";

export type RepairPriority = 1 | 2 | 3 | 4 | 5;
// Priority 1: Meaning-breaking
// Priority 2: Major grammar
// Priority 3: Missing required element
// Priority 4: Unnatural phrasing
// Priority 5: Minor grammar (articles/prepositions)

export interface TargetedCorrection {
  errorType: "grammar" | "vocabulary" | "article" | "preposition" | "word_order" | "omission" | "naturalness";
  priority: RepairPriority;
  patternKey: string; // e.g. "past_simple_verb", "article_the", "collocation"
  whatToFix: string; // Brief label e.g. "Thì Quá khứ đơn (Past Tense)"
  userErroneousText: string; // e.g. "go"
  minimalCorrection: string; // e.g. "went"
  explanationVi: string; // Brief 1-line reason
  betterSentence: string; // Ideal native sentence
  skeletonHint?: string; // e.g. "Yesterday, I ______ to the gym."
  simplifiedSentence?: string; // Shorter cognitive reduction sentence
  hints?: Array<{
    tier: number;
    title: string;
    content: string;
  }>;
  suggestedVocabulary?: Array<{
    term: string;
    meaningVi: string;
    partOfSpeech?: string;
    phonetic?: string;
  }>;
}

export interface RetryAttemptRecord {
  attemptNumber: number;
  spokenTranscript: string;
  responseLatencyMs: number;
  speechDurationMs: number;
  targetErrorResolved: boolean;
  meaningMaintained: boolean;
  selfCorrectionDetected: boolean;
  grammarScore: number;
  overallScore: number;
  supportLevel: number; // 1 (direct) -> 2 (skeleton) -> 3 (simplified)
  modelPlaybackCount: number;
  timestamp: string;
}

export interface RepairEvaluationResult {
  isTargetErrorResolved: boolean;
  isMeaningMaintained: boolean;
  selfCorrectionDetected: boolean;
  newMajorErrorsIntroduced: boolean;
  overallRepairScore: number; // 0-100
  feedbackMessage: string;
  repairedText: string;
  isSuccessful: boolean;
  shouldEscalateSupport: boolean;
  canAdvance: boolean;
}

export interface RetrySession {
  sessionId: string;
  originalTaskId: string;
  sourceContext: "sentence_builder" | "vn_to_en" | "shadowing" | "conversation" | "retry_lab";
  originalPrompt: string;
  originalTranscript: string;
  targetCorrection: TargetedCorrection;
  state: RetryFSMState;
  currentAttemptNumber: number;
  modelExposureCount: number;
  attempts: RetryAttemptRecord[];
  isResolved: boolean;
  isSelfCorrected: boolean;
  isSimplified: boolean;
  totalRepairLatencyMs: number;
  createdAt: string;
  completedAt?: string;
}

export interface SpokenRepairMetric {
  totalErrorsRequiringRetry: number;
  resolvedOnFirstRetryCount: number;
  totalResolvedCount: number;
  selfCorrectionCount: number;
  errorRecoveryRate: number; // % (totalResolved / totalRequiringRetry)
  firstRetrySuccessRate: number; // % (resolvedOnFirstRetry / totalRequiringRetry)
  averageRepairAttempts: number;
  recentRepairedPatterns: string[];
}
