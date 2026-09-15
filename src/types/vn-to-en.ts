// Vietnamese -> English Speaking Domain Types — Function 2
// Spoken Retrieval Engine converting Vietnamese thoughts directly into spoken English

export type VNToENRetrievalMode = "endless" | "direct" | "timed" | "rapid_fire";

export type VNPromptCategory =
  | "daily_life"
  | "workplace"
  | "study"
  | "opinion"
  | "experience"
  | "plans"
  | "conditional"
  | "comparison"
  | "explanation"
  | "situational_intent";

export type SpokenGapType = "none" | "knowledge_gap" | "retrieval_gap" | "production_gap";

export interface SemanticAlternative {
  expression: string;
  tone: "neutral" | "casual" | "formal" | "idiomatic";
  explanationVi?: string;
}

export interface VNToENHint {
  tier: 0 | 1 | 2 | 3 | 4;
  title: string;
  content: string;
  penaltyWeight: number; // 0 for tier 0, 0.1 for tier 1, 0.25 for tier 2, 0.5 for tier 3, 0.9 for tier 4
}

export interface SayItBetterSet {
  professional: string; // Chuẩn công sở, trang trọng, lịch sự
  casual: string;       // Đời thường, tự nhiên, thân mật
  idiomatic: string;    // Khẩu ngữ bản xứ, sắc nét
}

export interface VNToENTask {
  id: string;
  category: VNPromptCategory;
  retrievalMode: VNToENRetrievalMode;
  promptVi: string; // The core Vietnamese statement/question/situational intent
  targetIntent: string; // Core English meaning
  expectedResponses: string[]; // 2-4 acceptable natural variations
  requiredMeaningElements: string[]; // Semantic chunks that MUST be conveyed
  targetSkills: string[]; // e.g. ["past_simple", "work_collocation", "spoken_retrieval"]
  difficulty: {
    overall: number; // 1-10
    grammarComplexity: number; // 1-5
    retrievalDemand: number; // 0.0 - 1.0
    semanticDensity: number; // 1-5
  };
  hints: VNToENHint[];
  suggestedVocabulary?: Array<{
    term: string;
    meaningVi: string;
    partOfSpeech?: string;
    phonetic?: string;
  }>;
  sayItBetter?: SayItBetterSet;
  prepTimeSec: number; // 3.0s down to 1.5s (or 0 for direct / rapid fire)
  isRapidFire?: boolean;
  topic: string;
  source?: "ai" | "bank";
}

export interface VNEvaluatedError {
  type: "grammar" | "vocabulary" | "article" | "preposition" | "word_order" | "omission";
  severity: "minor" | "major";
  userText: string;
  correction: string;
  explanation: string;
  patternKey?: string;
}

export interface VNToENEvaluation {
  overallScore: number; // 0-100
  meaningScore: number; // 0-100 (Meaning coverage)
  grammarScore: number; // 0-100
  naturalnessScore: number; // 0-100
  fluencyScore: number; // 0-100
  retrievalScore: number; // 0-100
  independenceScore: number; // 0-100 (Calculated from hint tier used)
  
  isCommunicativelyValid: boolean; // Meaning achieved even if minor grammar slips
  isSuccessful: boolean; // overallScore >= 70
  needsRetry: boolean;
  isSayItBetterNeeded: boolean; // Meaning is 100% & grammar is valid, but phrasing could be more native
  
  gapType: SpokenGapType;
  gapExplanation?: string;
  
  userTranscript: string;
  cleanTranscript: string;
  responseLatencyMs: number;
  speechDurationMs: number;
  
  errors: VNEvaluatedError[];
  betterVersion: string; // Most natural native phrasing
  naturalAlternatives: SemanticAlternative[]; // 2-4 other natural expressions
  sayItBetter?: SayItBetterSet; // Structured Bộ 3 Say It Better
  isFastPass?: boolean; // Evaluated within <100ms via client-side Fast-Pass Engine
  
  praisePoints: string[];
  actionableFeedback: string;
  
  hintTierUsed: number;
  attemptNumber: number;
}

export interface VNToENSessionConfig {
  mode: VNToENRetrievalMode;
  targetCount: number; // e.g. 5 for quick, 10 for standard, 15 for rapid fire
  focusSkill?: string;
  autoStartMic: boolean;
  prepTimeSec: number;
}

export interface VNToENSessionSummary {
  sessionId: string;
  mode: VNToENRetrievalMode;
  startedAt: string;
  completedAt: string;
  totalTasks: number;
  completedTasks: number;
  firstAttemptSuccessCount: number;
  firstAttemptAccuracy: number; // %
  independentSuccessRate: number; // % tasks done with 0 hints
  averageResponseLatencyMs: number;
  retryRecoveryRate: number; // % errors fixed on retry
  masteryDelta: number;
  gapDistribution: {
    noneCount: number;
    retrievalGapCount: number;
    knowledgeGapCount: number;
    productionGapCount: number;
  };
  topWeaknessIdentified?: string;
  recommendedNextAction?: string;
  history: Array<{
    task: VNToENTask;
    evaluation: VNToENEvaluation;
    attemptsCount: number;
  }>;
}
