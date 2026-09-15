export type ConversationRole = "user" | "assistant" | "system";

export type DiscourseStage =
  | "rapport"
  | "discovery"
  | "twist_conflict"
  | "negotiation"
  | "resolution";

export interface ConversationalTwist {
  id: string;
  titleVi: string;
  descriptionEn: string;
  promptAiVi?: string;
  severity: "mild" | "high";
  injectedAtTurn: number;
  isResolved: boolean;
}

export interface TurnEvaluatedError {
  type: "grammar" | "vocabulary" | "pronunciation" | "fluency" | "omission" | "strategy";
  severity: "minor" | "major";
  userText: string;
  correction: string;
  explanation: string;
  patternKey?: string;
}

export interface TurnHesitationMetrics {
  wpm: number;
  durationMs: number;
  hesitationLevel: "smooth" | "moderate" | "hesitant";
  pauseEstimatedSec: number;
}

export interface TurnSayItBetterSet {
  professional: string;
  casual: string;
  idiomatic: string;
}

export interface TurnPedagogy {
  latencyMs?: number;
  speechRateWpm?: number;
  lexicalDiversityTtr?: number; // 0 - 100%
  hesitationCount?: number;
  discourseStage?: DiscourseStage;
  activeTwistAlert?: string;
  grammarIssue?: string | null;
  grammarFix?: string | null;
  nativeReformulation?: string;
  vocabularyUsed?: string[];
  turnScore?: number; // 0-100
  coachTipVi?: string;
  audioBlobUrl?: string;
  // SB/VN-EN/Survival/Drill aligned multi-dimensional scores
  meaningScore?: number; // 0-100
  fluencyScore?: number; // 0-100
  retrievalScore?: number; // 0-100
  independenceScore?: number; // 0-100 (100 if 0 hints)
  errors?: TurnEvaluatedError[];
  praisePoints?: string[];
  actionableFeedback?: string;
  sayItBetter?: TurnSayItBetterSet;
  naturalAlternatives?: Array<{ expression: string; tone: string; explanationVi?: string }>;
  isSayItBetterNeeded?: boolean;
  hintTierUsed?: number; // 0-4
  attemptNumber?: number;
  evaluationSource?: "fast_pass" | "ai_llm" | "deterministic";
  hesitationMetrics?: TurnHesitationMetrics;
  isFastPass?: boolean;
}

export type ConversationSessionMode = "endless" | "quick" | "standard" | "deep";

export interface ConversationSessionConfig {
  mode: ConversationSessionMode;
  targetCount: number; // 0 = endless (quick 6 / standard 12 / deep 20 turns)
  autoStartMic: boolean;
  prepTimeSec: number;
}

export interface ConversationAdaptiveState {
  currentDifficulty: number; // 1-10
  prepTimeSec: number; // 2.5 -> 1.5
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  rapidStreak: number;
  recentScores: number[];
  recentPatterns: string[];
  irtTheta?: number;
  optimalZpdDifficulty?: number;
}

export interface ConversationSkillMastery {
  fluency: number;
  retrieval: number;
  naturalness: number;
  grammar: number;
  independence: number;
  overallMastery: number;
  totalAttempts: number;
  successfulFirstAttempts: number;
  streakCount: number;
  updatedAt: string;
}

export interface ConversationTurnHistoryEntry {
  turn: ConversationTurn;
  evaluationSource?: "fast_pass" | "ai_llm" | "deterministic";
  attemptsCount?: number;
}

export interface ConversationSessionSummary {
  sessionId: string;
  mode: ConversationSessionMode;
  startedAt: string;
  completedAt: string;
  totalTurns: number;
  userTurns: number;
  firstAttemptSuccessCount: number;
  firstAttemptAccuracy: number; // %
  averageLatencyMs: number;
  averageIndependence: number;
  averageOverallScore: number;
  averageWpm: number;
  averageTtr: number;
  masteryDelta: number;
  totalErrorsCount: number;
  twistResolved: boolean;
  cefrBandEstimate: "A2" | "B1" | "B2" | "C1" | "C2";
  topWeaknessIdentified?: string;
  recommendedNextAction?: string;
  history: ConversationTurnHistoryEntry[];
}

export interface ConversationTurn {
  id: string;
  role: ConversationRole;
  text: string;
  timestamp: string; // ISO
  audioRef?: string;
  durationMs?: number;
  // Distinguish raw vs normalized for STT fidelity (§16)
  rawText?: string;
  provider?: string;
  model?: string;
  pedagogy?: TurnPedagogy;
}

export type SessionStatus =
  | "idle"
  | "starting"
  | "ready"
  | "listening"
  | "recording"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "completed"
  | "error";

export interface ConversationSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  status: SessionStatus;
  turns: ConversationTurn[];
  // Configuration snapshot
  provider?: string;
  model?: string;
  sttProvider?: string;
  sttModel?: string;
  ttsProvider?: string;
  ttsModel?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface LiveCallSummaryMetrics {
  overallWpm: number;
  averageLatencyMs: number;
  lexicalDiversityTtr: number;
  totalErrorsCount: number;
  twistResolved: boolean;
  cefrBandEstimate: "B1" | "B2" | "C1" | "C2";
}

// Persisted session row (§26)
export interface SessionRow {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  provider: string | null;
  model: string | null;
  stt_provider: string | null;
  stt_model: string | null;
  tts_provider: string | null;
  tts_model: string | null;
  created_at?: string;
}

export interface TurnRow {
  id: string;
  session_id: string;
  role: string;
  text: string;
  timestamp: string;
  duration_ms: number | null;
  created_at?: string;
}
