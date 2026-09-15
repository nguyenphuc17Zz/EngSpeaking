// Function 7 — Repair / Paraphrase / Survival Speaking Domain Types
// Communication Survival System & Circumlocution Engine
// Aligned with Sentence Builder (Function 1) + VN→EN (Function 2) session/adaptive/eval patterns

export type SurvivalSkillType =
  | "circumlocution" // Describe concept without saying target word
  | "buying_time" // Buffer phrases to buy thinking time
  | "clarification" // Clarify ambiguity
  | "asking_repetition" // Request to repeat or speak slower
  | "self_correction" // Fix mistake mid-speech naturally
  | "rephrasing" // Say in another way
  | "simplification" // Express complex thought simply
  | "misunderstanding_recovery"; // Fix when listener misunderstood

export type SurvivalKind = "circumlocution" | "scenarios";

export type SurvivalSessionMode = "endless" | "quick" | "standard" | "deep";

export interface SurvivalSessionConfig {
  mode: SurvivalSessionMode;
  kind: SurvivalKind;
  targetCount: number; // 0 = endless
  autoStartMic: boolean;
  prepTimeSec: number;
}

export interface SurvivalAdaptiveState {
  currentDifficulty: number; // 1-10 (maps to easy 1-3 / medium 4-6 / hard 7-10)
  prepTimeSec: number; // 3.0 -> 1.5
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  rapidStreak: number;
  recentScores: number[];
  recentErrors: string[];
  recentPrompts: string[];
  irtTheta?: number; // 0.15 - 0.98
  optimalZpdDifficulty?: number; // 1-10
}

export interface SurvivalSkillMastery {
  clarity: number; // 0-100 (concept clarity / meaning)
  retrieval: number; // 0-100 (speed + independence)
  fluency: number; // 0-100
  naturalness: number; // 0-100
  independence: number; // 0-100
  overallMastery: number;
  totalAttempts: number;
  successfulFirstAttempts: number;
  streakCount: number;
  updatedAt: string;
}

export interface SurvivalEvaluatedError {
  type: "taboo" | "grammar" | "vocabulary" | "naturalness" | "omission" | "strategy";
  severity: "minor" | "major";
  userText: string;
  correction: string;
  explanation: string;
  patternKey?: string;
}

export interface SurvivalHesitationMetrics {
  wpm: number;
  durationMs: number;
  hesitationLevel: "smooth" | "moderate" | "hesitant";
  pauseEstimatedSec: number;
}

export interface SurvivalSayItBetterSet {
  professional: string;
  casual: string;
  idiomatic: string;
}

export interface PropertyHintLadder {
  functionHint?: string; // e.g. "Used for heating food quickly"
  categoryHint?: string; // e.g. "It is a type of kitchen appliance"
  contextHint?: string; // e.g. "Usually found in homes and offices"
  starterHint?: string; // e.g. "It's a machine that you use to..."
}

export interface SurvivalHintTier {
  tier: number; // 0, 1, 2, 3, 4
  title: string;
  content: string;
  penaltyWeight?: number; // 0 / 0.1 / 0.25 / 0.5 / 0.85-0.9 (aligned with SB/VN-EN)
}

export interface SurvivalVocabularyItem {
  term: string;
  meaningVi: string;
  partOfSpeech?: string;
  phonetic?: string;
}

export interface CircumlocutionTask {
  id: string;
  targetWord: string; // e.g. "microwave"
  forbiddenWords: string[]; // e.g. ["microwave", "micro"]
  vietnameseMeaning: string; // e.g. "Lò vi sóng"
  category: string; // e.g. "Household Appliance"
  difficulty: "easy" | "medium" | "hard";
  difficultyOverall?: number; // 1-10 numeric (aligned with SB/VN-EN adaptive)
  timeLimitSeconds: number; // e.g. 5
  hints: PropertyHintLadder;
  tierHints?: SurvivalHintTier[];
  sampleExplanations: string[];
  suggestedVocabulary?: SurvivalVocabularyItem[];

  // Aristotelian Definition Properties
  genus?: string; // e.g. "a kitchen appliance"
  differentia?: string; // e.g. "used to heat food quickly using electromagnetic waves"
  semanticKeyAnchors?: string[]; // e.g. ["heat", "warm", "food", "kitchen", "quick"]
  tabooLemmas?: string[]; // e.g. ["microwave", "microwaving", "microwaved"]
  source?: "ai" | "bank" | "seed";
  // SB/VN-EN aligned metadata
  topic?: string;
  prepTimeSec?: number;
  skills?: string[];
  sayItBetter?: SurvivalSayItBetterSet;
}

export interface SurvivalScenarioTask {
  id: string;
  context: string; // "job_interview" | "airport" | "restaurant" | "workplace_meeting" | "phone_call" | any dynamic context
  contextTitleVi: string; // e.g. "Phỏng vấn xin việc (Job Interview)"
  problemDescriptionVi: string; // e.g. "Người phỏng vấn nói rất nhanh một câu phức tạp mà bạn chưa kịp nghe rõ."
  audioPromptText: string; // e.g. "Could you elaborate on how your algorithmic optimization reduced latency?"
  recommendedSkill: SurvivalSkillType;
  suggestedRepairPhrases: string[];
  timeLimitSeconds: number;
  tierHints?: SurvivalHintTier[];
  suggestedVocabulary?: SurvivalVocabularyItem[];
  source?: "ai" | "bank" | "seed";
  // SB/VN-EN aligned metadata
  topic?: string;
  prepTimeSec?: number;
  difficultyOverall?: number; // 1-10 numeric
  skills?: string[];
  sayItBetter?: SurvivalSayItBetterSet;
}

export interface SurvivalEvaluationResult {
  isSuccessful: boolean;
  communicationRecovered: boolean;
  strategyUsed: SurvivalSkillType | string;

  // Circumlocution specific & Aristotelian Evaluation
  targetWordAvoided?: boolean;
  conceptClarityScore: number; // 0-100
  genusDetected?: boolean; // Identified hypernym / category
  differentiaDetected?: boolean; // Identified core function / distinguishing feature
  semanticPrecisionScore?: number; // 0-100: How precisely this specifies target word
  listenerGuess?: string; // Native speaker's guess, e.g. "A microwave oven!"
  clarityBreakdown?: {
    genusScore: number;
    functionScore: number;
    ambiguityPenalty: number;
  };

  // Latency & Naturalness
  repairInitiationLatencyMs: number;
  speechDurationMs?: number;
  naturalnessScore: number;
  overallScore: number;

  // SB/VN-EN aligned multi-dimensional scores
  fluencyScore?: number; // 0-100
  retrievalScore?: number; // 0-100
  independenceScore?: number; // 0-100 (100 if 0 hints)
  errors?: SurvivalEvaluatedError[];
  praisePoints?: string[];
  actionableFeedback?: string;
  sayItBetter?: SurvivalSayItBetterSet;
  naturalAlternatives?: Array<{ expression: string; tone: string; explanationVi?: string }>;
  isSayItBetterNeeded?: boolean;

  userTranscript: string;
  cleanTranscript?: string;
  coachFeedbackVi: string;
  idealRepairVersion: string;
  alternativeStrategies: string[];

  hintTierUsed?: number; // 0-4
  attemptNumber?: number;
  evaluationSource?: "fast_pass" | "ai_llm" | "deterministic";
  hesitationMetrics?: SurvivalHesitationMetrics;
  isFastPass?: boolean;
}

export interface SurvivalSessionHistoryEntry {
  kind: SurvivalKind;
  task: CircumlocutionTask | SurvivalScenarioTask;
  evaluation: SurvivalEvaluationResult;
  attemptsCount: number;
}

export interface SurvivalSessionSummary {
  // Legacy fields (kept for backward compat)
  totalAttempts: number;
  successfulAttempts: number;
  recoveryRate: number; // e.g. 88%
  averageLatencyMs: number;
  strongestSkill: string;
  needsWorkSkill: string;
  // SB/VN-EN aligned session report
  sessionId?: string;
  mode?: SurvivalSessionMode;
  kind?: SurvivalKind;
  startedAt?: string;
  completedAt?: string;
  completedTasks?: number;
  firstAttemptSuccessCount?: number;
  firstAttemptAccuracy?: number; // %
  averageIndependence?: number;
  averageOverallScore?: number;
  masteryDelta?: number;
  practicedSkills?: string[];
  topWeaknessIdentified?: string;
  recommendedNextAction?: string;
  history?: SurvivalSessionHistoryEntry[];
}
