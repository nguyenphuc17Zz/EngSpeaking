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
