// Advanced Training types — Phase 6 §4, §55-56
// ── New 3-Track × 3-Level model (bridges Sentence Builder + VN→EN) ──
export type AdvancedTrack = "reflex" | "argument" | "extended";

export type AdvancedLevel = "L1" | "L2" | "L3";

export type AdvancedTrainingType =
  | "rapidResponse"
  | "pressureConversation"
  | "topicSwitching"
  | "unexpectedQuestion"
  | "deepFollowup"
  | "opinion"
  | "debate"
  | "persuasion"
  | "negotiation"
  | "storytelling"
  | "longForm"
  | "presentation"
  | "qaChallenge"
  | "interview"
  | "professional"
  | "clarification"
  | "resilience"
  | "ambiguity"
  | "escalation"
  | "reformulation"
  | "spontaneous"
  | "abstract"
  | "roleReversal"
  | "devilsAdvocate"
  | "highPressure";

export interface DifficultyConfig {
  responsePressure?: number;
  topicNovelty?: number;
  abstractness?: number;
  conversationComplexity?: number;
  characterDifficulty?: number;
  numberOfConstraints?: number;
  eventFrequency?: number;
  supportLevel?: number; // 0-10, 10=full support
  level?: string; // Advanced|Expert|Extreme
}

export interface AdvancedTrainingContext {
  targetSkills: string[];
  goal?: string;
  difficulty?: DifficultyConfig;
  durationMinutes: number;
  pressureLevel?: string;
  topic?: string;
  scenario?: string;
  communicationObjective?: string;
  userPreferences?: Record<string, unknown>;
}

export type ToulminElement =
  | "claim"
  | "data"
  | "warrant"
  | "rebuttal"
  | "backing"
  | "qualifier";

export interface ToulminAnalysis {
  elementsFound: ToulminElement[];
  claimSnippet?: string;
  dataSnippet?: string;
  warrantSnippet?: string;
  rebuttalSnippet?: string;
  toulminScore: number; // 0 - 100%
  feedbackVi: string;
  missingKeyElements: ToulminElement[];
}

export type FallacyType =
  | "false_dilemma"
  | "hasty_generalization"
  | "circular_reasoning"
  | "strawman"
  | "ad_hominem"
  | "slippery_slope";

export interface FallacyDetected {
  type: FallacyType;
  labelVi: string;
  snippet: string;
  explanationVi: string;
  severity: "warning" | "critical";
}

export interface ComposureMetrics {
  score: number; // 0 - 100
  grade: "S" | "A" | "B" | "C";
  latencyMs: number;
  timeLimitMs: number;
  pressureRatio: number; // latency / timeLimit
  wpm: number;
  hesitationCount: number;
  label: string;
}

export interface TransitionalBridgeDetected {
  hasBridge: boolean;
  bridgePhrase?: string;
  feedbackVi: string;
}

export interface AdvancedTrainingBlock {
  id: string;
  type: AdvancedTrainingType;
  objective: string;
  skillTargets: string[];
  difficulty: DifficultyConfig;
  estimatedDurationMinutes: number;
  instructions: string;
  scenario?: unknown;
  constraints?: string[];
  timeLimitSec?: number;
  requiredToulminElements?: ToulminElement[];
}

export interface AdvancedChallenge {
  id: string;
  type: string;
  trigger: string;
  purpose: string;
  effect: string;
}

export interface AdvancedTrainingSession {
  id: string;
  modules: string[];
  blocks: AdvancedTrainingBlock[];
  challenges: AdvancedChallenge[];
  context: AdvancedTrainingContext;
  createdAt: string;
  estimatedDurationMinutes: number;
  rationale?: string;
}

export interface AdvancedSessionOutcome {
  sessionId: string;
  module: string;
  objectives: string[];
  turns: number;
  challengesEncountered: string[];
  objectivesAttempted: string[];
  metadata: Record<string, unknown>;
}

export interface AdvancedTrainingModule {
  id: string;
  type: AdvancedTrainingType;
  skillTargets: string[];
  difficultyDimensions: string[];
  generateSession(context: AdvancedTrainingContext): Promise<AdvancedTrainingSession>;
}

// ── Studio task model (mirrors Sentence Builder + VN→EN) ──

export interface AdvancedTaskHint {
  tier: 0 | 1 | 2 | 3 | 4;
  title: string;
  content: string;
  penaltyWeight: number;
}

export interface AdvancedSayItBetter {
  professional: string;
  casual: string;
  idiomatic: string;
}

export interface AdvancedTaskDifficulty {
  overall: number; // 1-10
  grammarComplexity: number; // 1-5
  retrievalDemand: number; // 0-1
  semanticDensity: number; // 1-5
}

export interface AdvancedTask {
  id: string;
  track: AdvancedTrack;
  level: AdvancedLevel;
  /** Legacy skill tag (one of the 25 AdvancedTrainingType) for backward-compat analytics */
  skillTag: AdvancedTrainingType;
  instruction: string;
  promptVi: string;
  promptEN?: string;
  scenario?: string;
  targetIntent: string;
  expectedResponses: string[];
  requiredMeaningElements: string[];
  scaffold: {
    level: 1 | 2 | 3;
    template?: string | null;
    keywords?: string[];
    starter?: string | null;
    constraints?: string[];
  };
  hints: AdvancedTaskHint[];
  suggestedVocabulary?: Array<{
    term: string;
    meaningVi: string;
    partOfSpeech?: string;
    phonetic?: string;
  }>;
  sayItBetter?: AdvancedSayItBetter;
  difficulty: AdvancedTaskDifficulty;
  skills: string[];
  grammarTargets: string[];
  vocabularyTargets: string[];
  topic: string;
  prepTimeSec: number;
  blitzLimitSec: number;
  requiredToulminElements: ToulminElement[];
  targetErrorPatternKey?: string;
  source?: "ai" | "bank" | "seed";
}

export type AdvancedGapType = "none" | "retrieval_gap" | "knowledge_gap" | "production_gap";

export interface AdvancedEvaluatedError {
  type: "grammar" | "vocabulary" | "article" | "preposition" | "word_order" | "omission" | "naturalness";
  severity: "minor" | "major";
  userText: string;
  correction: string;
  explanation: string;
  patternKey?: string;
}

export interface AdvancedEvaluation {
  overallScore: number;
  meaningScore: number;
  grammarScore: number;
  naturalnessScore: number;
  fluencyScore: number;
  retrievalScore: number;
  independenceScore: number;
  isCommunicativelyValid: boolean;
  isSuccessful: boolean;
  needsRetry: boolean;
  isSayItBetterNeeded: boolean;
  gapType: AdvancedGapType;
  gapExplanation?: string;
  userTranscript: string;
  cleanTranscript: string;
  responseLatencyMs: number;
  speechDurationMs: number;
  errors: AdvancedEvaluatedError[];
  betterVersion: string;
  naturalAlternatives: Array<{
    expression: string;
    tone: "neutral" | "casual" | "formal" | "idiomatic";
    explanationVi?: string;
  }>;
  sayItBetter?: AdvancedSayItBetter;
  // Secondary advanced analytics (HUD, not primary gate)
  toulmin?: ToulminAnalysis;
  composure?: ComposureMetrics;
  fallacies?: FallacyDetected[];
  bridge?: TransitionalBridgeDetected;
  isFastPass?: boolean;
  praisePoints: string[];
  actionableFeedback: string;
  hintTierUsed: number;
  attemptNumber: number;
  evaluationSource?: "fast_pass" | "ai_llm" | "deterministic";
}

export interface AdvancedSkillMastery {
  reflex: number;
  argumentation: number;
  extendedDiscourse: number;
  fluency: number;
  independence: number;
  overallMastery: number;
  totalAttempts: number;
  successfulFirstAttempts: number;
  streakCount: number;
  updatedAt: string;
}

export type AdvancedSessionMode = "endless" | "quick" | "standard" | "deep" | "weakness_focus";

export interface AdvancedSessionConfig {
  mode: AdvancedSessionMode;
  track: AdvancedTrack;
  level: AdvancedLevel;
  targetCount: number;
  autoStartMic: boolean;
  prepTimeSec: number;
  blitzLimitSec: number;
  weaknessFocusSkill?: string;
}

export interface AdvancedSessionSummary {
  sessionId: string;
  mode: AdvancedSessionMode;
  track: AdvancedTrack;
  level: AdvancedLevel;
  startedAt: string;
  completedAt: string;
  totalTasks: number;
  completedTasks: number;
  firstAttemptSuccessCount: number;
  firstAttemptAccuracy: number;
  independentSuccessRate: number;
  averageResponseLatencyMs: number;
  averageOverallScore: number;
  averageToulminScore: number;
  masteryDelta: number;
  practicedSkills: string[];
  topWeaknessIdentified?: string;
  recommendedNextAction?: string;
  history: Array<{
    task: AdvancedTask;
    evaluation: AdvancedEvaluation;
    attemptsCount: number;
  }>;
}

export interface AdvancedPrerequisiteInput {
  sbMastery?: number;
  sbIndependence?: number;
  vnIndependentRate?: number;
  vnAccuracy?: number;
}

export interface AdvancedPrerequisiteCheck {
  allowed: boolean;
  recommendedLevel: AdvancedLevel;
  reasons: string[];
  missing: string[];
}
