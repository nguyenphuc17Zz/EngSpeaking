// Function 7 — Repair / Paraphrase / Survival Speaking Domain Types
// Communication Survival System & Circumlocution Engine

export type SurvivalSkillType =
  | "circumlocution" // Describe concept without saying target word
  | "buying_time" // Buffer phrases to buy thinking time
  | "clarification" // Clarify ambiguity
  | "asking_repetition" // Request to repeat or speak slower
  | "self_correction" // Fix mistake mid-speech naturally
  | "rephrasing" // Say in another way
  | "simplification" // Express complex thought simply
  | "misunderstanding_recovery"; // Fix when listener misunderstood

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
  source?: "ai" | "bank";
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
  source?: "ai" | "bank";
}

export interface SurvivalEvaluationResult {
  isSuccessful: boolean;
  communicationRecovered: boolean;
  strategyUsed: SurvivalSkillType;
  
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
  naturalnessScore: number;
  overallScore: number;
  
  userTranscript: string;
  coachFeedbackVi: string;
  idealRepairVersion: string;
  alternativeStrategies: string[];
}

export interface SurvivalSessionSummary {
  totalAttempts: number;
  successfulAttempts: number;
  recoveryRate: number; // e.g. 88%
  averageLatencyMs: number;
  strongestSkill: string;
  needsWorkSkill: string;
}
